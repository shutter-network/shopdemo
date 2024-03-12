import React, { Component, createRef } from "react";
import Image from "next/image";
import {
  ShutterProvider,
  ethers,
  init,
  decrypt,
} from "@shutter-network/shop-sdk";
import {
  checkL1Balance,
  checkL2Balance,
  switchShopNetwork,
  checkOnboarding,
  queryL1,
} from "./Onboarding";
import { switchAndDeposit } from "./Deposit";
import Transaction from "./Transaction";
import Camera from "./Camera";
import uuidv3 from "uuid/v3";
import L1Bridge from "./L1StandardBridge";
import mintable from "./mintableERC20";

const BLOCKTIME = 5;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const bigIntMax = (...args) => args.reduce((m, e) => (e > m ? e : m));

class Wallet extends Component {
  constructor(props) {
    super(props);
    this.state = {
      decryptionKey: "",
      inclusionWindow: 5,
      executions: [],
      events: [],
      statusMessage: [],
      abi: mintable,
      abiName: "Mintable ERC20",
      paused: false,
      l1Balance: 0,
      l2Balance: 0,
      depositValue: 0,
    };
    this.camera = createRef(null);
    this.txform = createRef(null);
    this.overlay = createRef(null);
    this.recharge = createRef(null);
  }

  async connectToWallet() {
    if (window.ethereum) {
      console.log("Starting...");

      await this.connect();

      await this.setupShutterProvider();
      await this.setupWalletState();

      console.log("ready.");
    }
  }

  addStatusMessage = async (...msgs: string) => {
    let statusMessages = [...this.state.statusMessage];
    msgs.forEach((msg, i) => {
      console.log(msg.slice(0, 1));
      var color = "text-black";
      if (msg.slice(0, 1) === "!") {
        color = "text-red-600";
        msg = msg.slice(1);
      }
      if (msg.slice(0, 1) === ".") {
        color = "text-blue-400";
        msg = msg.slice(1);
      }
      statusMessages = [
        {
          msg: msg,
          color: color,
          key:
            Date.parse(new Date()).toString() +
            "-" +
            [...msg].reduce((s, c) => s + c.charCodeAt(), 0),
        },
        ...statusMessages,
      ];
      console.log("MSG", msg);
    });
    console.log(JSON.stringify(statusMessages));
    await this.setState({ statusMessage: statusMessages });
  };

  async connect() {
    const accounts = await window.ethereum
      .request({ method: "eth_requestAccounts" })
      .catch((err) => {
        if (err.code === 4001) {
          // EIP-1193 userRejectedRequest error
          // If this happens, the user rejected the connection request.
          this.addStatusMessage("Please connect to MetaMask.");
        } else {
          console.error(err);
        }
      });
    this.selectedAddress = accounts[0];
  }

  async setupShutterProvider() {
    const success = await checkOnboarding(this.addStatusMessage);
    if (success === false) {
      this.addStatusMessage(
        "Wallet setup failed - please reload and try again!",
      );
    }
    const options = {
      wasmUrl: "/shutter-crypto.wasm",
      keyperSetManagerAddress: "0x4200000000000000000000000000000000000067",
      inboxAddress: "0x4200000000000000000000000000000000000066",
      keyBroadcastAddress: "0x4200000000000000000000000000000000000068",
    };
    await init(options.wasmUrl);
    const provider = new ShutterProvider(options, window.ethereum);

    console.log("provider ready");
    const signer = await provider.getSigner(this.selectedAddress);
    this.signer = signer;
  }

  async setupListener(balance: number) {
    try {
      const websock = await new ethers.WebSocketProvider(
        "wss://socket.sepolia.staging.shutter.network",
      );
      this.listener = websock;
      console.log("Using websocket listener for blocks");
    } catch (error) {
      console.log("Using BrowserProvider listener for blocks (slower)");
      this.listener = this.signer.provider;
    }
    this.listener.on("block", (block) => {
      try {
        this.setState({ block: block });
        this.listener.getBalance(this.selectedAddress).then((newbalance) => {
          if (newbalance && newbalance != balance) {
            // tx form needs to be rendered for this to work:
            this.txform.current.setState({ availableBalance: newbalance });
            balance = newbalance;
            // FIXME: state changes here are swallowed
            () => this.setState({ l2Balance: balance });
          }
        });
        this.signer.isShutterPaused().then((paused) => {
          if (paused != this.state.paused) {
            this.setState({ paused: paused });
            if (paused) {
              this.addStatusMessage(
                '!Shutter is paused! Contact <a href="https://t.me/shutter_network/1" class="underline">Shutter on TG</a>.',
              );
            } else {
              this.addStatusMessage(".Shutter is operational again!");
            }
          }
        });
      } catch (err) {
        // try to refresh listener on weird exceptions (e.g. network changes)
        console.log(err);
        this.setupListener();
      }
    });
  }

  async setupWalletState() {
    let balance = await this.signer.provider.getBalance(this.selectedAddress);
    const block = await this.signer.provider.getBlockNumber();
    const eonkey = await this.signer.getCurrentEonKey();

    await this.setupListener(balance);

    this.setState({
      selectedAddress: this.selectedAddress,
      l2Balance: balance,
      block: block,
      eonkey: eonkey,
    });
  }

  newTx = async () => {
    await this.setState({
      msgHex: "",
      decryptionKey: "",
      executions: [],
      events: [],
      decrypted: "",
    });
    this.txform.current.setState({
      txto: "",
      txToMsg: "",
      txToValid: null,
      txvalue: 1,
      txValueInput: "1",
      txValueValid: null,
      txValueMsg: "",
      txValueDisplayWei: true,
      txdata: "",
      receiverIsContract: false,
    });
  };

  async runDeposit() {
    await switchAndDeposit(this.state.depositValue, this.addStatusMessage);
    this.recharge.current.style.display = "none";
  }

  checkReceiverIsContract = async (address) => {
    if (ethers.isAddress(address)) {
      const code = await this.signer.provider.getCode(address);
      return code != "0x";
    } else {
      return false;
    }
  };

  contractCall = async (event, abi, abifun) => {
    event.preventDefault();
    const intf = new ethers.Interface(abi);
    let args = [];
    for (const input of abifun.inputs) {
      args = [...args, this.state.contractData[input.key]];
    }
    if (abifun.stateMutability != "payable") {
      this.txform.current.setState({ txvalue: 0, txValueInput: 0 });
    }
    const funfrag = intf.getFunction(abifun.name.value);
    const calldata = intf.encodeFunctionData(funfrag, args);
    this.txform.current.setState({ txdata: calldata });
  };

  handleABIUpload = async (event) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    const file = event.target.files[0];
    var reader = new FileReader();
    reader.readAsText(file);
    var abi = undefined;
    reader.onload = (evt) => {
      var content = JSON.parse(evt.target.result);
      if (content.abi) {
        abi = content.abi;
      } else {
        abi = content;
      }
      this.setState({ abi: abi, abiName: file.name.split(".")[0] });
    };
  };

  async decryptMessage(msg: string, key: string): string {
    if (this.signer) {
      const a_msg = this.signer.hexKeyToArray(msg);
      const a_key = this.signer.hexKeyToArray(key);
      const decrypted = await decrypt(a_msg, a_key);
      return decrypted;
    }
  }

  // eye candy
  async runEncryptor() {
    if (this.state.msgHex) {
      for (let i = 0; i < this.state.msgHex.length; i++) {
        await delay(1);
        let chars = this.state.msgHex.split("");
        chars[i] = "*";
        this.setState({
          msgHex: chars.join(""),
        });
      }
    }
  }

  async encryptMessage() {
    console.log(this.state.l2Balance);
    if (this.state.l2Balance < ethers.parseEther("0.01")) {
      this.recharge.current.style.display = "block";
      await this.checkBalances();
      return;
    }
    const txstate = this.txform.current.state;
    if (!this.signer) {
      return;
    }
    if (txstate.txvalue > Number.MAX_SAFE_INTEGER) {
      this.addStatusMessage(
        "'value' too big to handle, changing to maximum amount",
      );
      this.txform.current.setState({
        txvalue: BigInt(Number.MAX_SAFE_INTEGER),
      });
      txstate.txvalue = BigInt(Number.MAX_SAFE_INTEGER);
    }
    let txRequest = {
      from: this.state.selectedAddress,
      to: txstate.txto,
      value: Number(txstate.txvalue),
      data: txstate.txdata,
    };
    await this.setState({ msgHex: JSON.stringify(txRequest) });

    this.runEncryptor();

    const [msg, txResponse, executionBlock] =
      await this.signer._sendTransactionTrace(
        txRequest,
        this.state.inclusionWindow,
        this.listener,
      );
    this.camera.current.control("setBlur");
    await executionBlock;

    if (!executionBlock) {
      console.err("executionBlock not resolved");
      return;
    }
    const exeListener = this.installBlockListener(
      executionBlock,
      this.listener,
    );

    let tx = await txResponse;
    this.listener
      .waitForTransaction(tx.hash)
      .then((value) => {
        if (value.blockNumber < executionBlock && value.status == 1) {
          console.log(value.hash);
          this.camera.current.control("setFocus");
        } else {
          console.log("Inbox tx failed/too late!", value);
          this.addStatusMessage("Inbox tx failed/too late!");
          this.camera.current.control("unsetMotive");
        }
      })
      .catch((error) => {
        console.log(error);
      });
    const msgHex = Buffer.from(msg).toString("hex");
    console.log("encryptedHex", msgHex);
    this.setState({ msg: msg, msgHex: msgHex });
  }

  async decodeShopReceipt(blocknumber: number) {
    let blockdata = await this.signer.provider.getBlock(blocknumber, true);
    console.log(blockdata);
    let txhash = blockdata.getPrefetchedTransaction(0).hash;
    console.log(txhash);
    let receipt = await this.signer.provider.getTransactionReceipt(txhash);
    console.log(receipt);
    const intf = new ethers.Interface(this.state.abi);
    let events = [];
    receipt.logs.forEach((log) => {
      console.log(log);
      try {
        console.log(intf.parseLog(log));
        const ev = intf.parseLog(log);
        events.push([ev.signature, ev.args]);
      } catch (error) {
        console.log(error);
      }
    });
    console.log(events);

    let executionlog = receipt.logs[receipt.logs.length - 1].data;
    console.log("executed", executionlog);

    let [decryptionKey, executions] = ethers.decodeRlp(executionlog);

    executions = executions.map((x, xidx) =>
      x.map((inner, iidx) => [xidx.toString() + "_" + iidx.toString(), inner]),
    );
    console.log("executions", executions);

    let decrypted = await this.decryptMessage(
      this.state.msgHex,
      decryptionKey.slice(2),
    );
    console.log("decrypted", decrypted);

    const [to, data, value] = ethers.decodeRlp(
      "0x" + Buffer.from(decrypted.slice(1)).toString("hex"),
    );
    this.camera.current.control("releaseShutter", { txto: to });
    var decoded_value;
    if (value === "0x") {
      decoded_value = 0;
    } else {
      decoded_value = parseInt(value, 16);
    }

    this.setState({
      decryptionKey: decryptionKey.slice(2),
      executions: executions,
      events: events,
      decrypted: JSON.stringify(
        [
          { version: decrypted[0] },
          { to: to, data: data, value: decoded_value },
        ],
        null,
        2,
      ),
    });
  }

  installBlockListener(number: number, provider: any) {
    return provider.once("block", async (blocknumber) => {
      if (blocknumber < number) {
        this.camera.current.control("blink");
        this.camera.current.control("setCountdown", {
          time: number - blocknumber,
          blockTime: BLOCKTIME,
        });
        this.installBlockListener(number, provider);
      } else {
        this.camera.current.control("disarm");
        this.decodeShopReceipt(blocknumber);
      }
    });
  }

  setAddressValid = (address: string) => {
    this.camera.current.control("showMotive", { txto: address });
  };

  setAddressBlank = () => {
    this.camera.current.control("setBlank");
  };

  renderWallet() {
    if (!this.state.block) {
      return (
        <div className="heading">
          <Image
            src="/SH_OP.svg"
            width="100"
            height="100"
            alt="shutterized OPTIMISM demo"
            priority={true}
            className="mr-4"
          />
          <div>
            Welcome to shutterized optimism on Sepolia. Send shutter encrypted
            transactions with this dApp.
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => this.connectToWallet()}
          >
            Connect Wallet
          </button>
        </div>
      );
    } else {
      return (
        <div>
          <Image
            src="/SH_OP.svg"
            width="100"
            height="100"
            alt="shutterized OPTIMISM demo"
            className="logo float-left mr-4"
          />
          <p>Welcome {this.state.selectedAddress}</p>
          <p>
            Your L2 ETH Balance is: {ethers.formatEther(this.state.l2Balance)}{" "}
            <a
              className="underline cursor-pointer"
              onClick={() => (this.recharge.current.style.display = "block")}
            >
              Add more.
            </a>
          </p>
          <p>Current L2 Block is: {this.state.block} </p>
          <p className="ellipsis">Current EonKey is: {this.state.eonkey}</p>
          {this.renderShutter()}
        </div>
      );
    }
  }

  renderShutter() {
    const phase1 = this.signer && !this.state.msgHex;
    const phase2 = this.signer && this.state.msgHex;
    let txFormDisplay = "none";
    let shutterInternalDisplay = "none";
    if (phase1) {
      txFormDisplay = "block";
      shutterInternalDisplay = "none";
    }
    if (phase2) {
      txFormDisplay = "none";
      shutterInternalDisplay = "block";
    }
    return (
      <div className="mb-6">
        <Camera ref={this.camera} url="camera-13695.mp3" />
        <div style={{ display: txFormDisplay }}>
          <form onSubmit={(event) => console.log(event)}>
            <label
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
              htmlFor="inclusionWindow"
            >
              Execute in {this.state.inclusionWindow} blocks/
              {this.state.inclusionWindow * BLOCKTIME}s
            </label>
            <input
              value={this.state.inclusionWindow}
              id="inclusionWindow"
              type="range"
              min="2"
              max="20"
              onChange={(e) =>
                this.setState({ inclusionWindow: parseInt(e.target.value) })
              }
            />
            <label className="block info text-xs">
              You need to sign the transaction before this timer runs out.
            </label>
            <Transaction
              ref={this.txform}
              checkReceiverIsContract={this.checkReceiverIsContract}
              availableBalance={this.state.l2Balance}
              checkBalances={this.checkBalances}
              overlay={this.overlay}
              recharge={this.recharge}
              setAddressValid={this.setAddressValid}
              setAddressBlank={this.setAddressBlank}
            />
            <button
              type="button"
              disabled={this.state.paused}
              className={
                this.state.paused
                  ? "btn btn-disabled disabled"
                  : "btn btn-red cursor-pointer"
              }
              onClick={() => this.encryptMessage()}
            >
              Send Shutterized Transaction
            </button>
          </form>
        </div>
        <div style={{ display: shutterInternalDisplay }}>
          <label
            htmlFor="encryptedTx"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Encrypted Transaction:
          </label>
          <span
            type="text"
            id="encryptedTx"
            className="block w-full p-4 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-base focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 text-wrap break-words"
          >
            {this.state.msgHex}
          </span>
          <label
            htmlFor="large-input"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Decryption Key:
          </label>
          <span
            type="text"
            id="key"
            className="block w-full p-4 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-base focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 text-wrap break-words"
          >
            {this.state.decryptionKey}
          </span>
          <label
            htmlFor="executions-list"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Executions:
          </label>
          <div id="executions-list">
            {this.state.executions.map((exe) => {
              return (
                <div key={exe[0][0] + exe[1][0] + exe[2][0]}>
                  <span
                    className={
                      "border " +
                      (exe[0][1] == "0x64" ? "bg-green-500" : "bg-red-400")
                    }
                    key={exe[0][0]}
                  >
                    Status: {exe[0][1]}
                  </span>
                  <span key={exe[1][0]}> Gas: {parseInt(exe[1][1], 16)} </span>{" "}
                  <span key={exe[2][0]}>Log#: {exe[2][1]}</span>
                </div>
              );
            })}
            <label
              htmlFor="events"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Events:
            </label>
          </div>
          <div id="events">
            {this.state.events.map((ev, idx) => {
              return <div key={idx}>{ev[0] + " " + ev[1]}</div>;
            })}
          </div>
          <label
            htmlFor="decryptedTx"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Decrypted Transaction:
          </label>
          <span
            type="text"
            id="decryptedTx"
            className="block w-full p-4 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-base focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 text-wrap break-words"
          >
            {this.state.decrypted}
          </span>
          <button type="button" className="btn" onClick={() => this.newTx()}>
            New Transaction
          </button>
        </div>
      </div>
    );
  }

  checkBalances = async () => {
    const l1Balance = await checkL1Balance(
      this.addStatusMessage,
      this.selectedAddress,
    );
    const l2Balance = await checkL2Balance(
      this.addStatusMessage,
      this.selectedAddress,
    );
    this.setState({
      l1Balance: l1Balance,
      l2Balance: l2Balance,
      depositValue: bigIntMax(
        ethers.parseEther("0.01"),
        ethers.parseEther("0.01") - l2Balance,
      ),
    });
  };

  renderRecharge() {
    return (
      <>
        <button
          className="block btn btn-red m-1 object-right-top"
          type="btn"
          onClick={() => (this.recharge.current.style.display = "none")}
        >
          X
        </button>
        <div className="flex flex-row flex-wrap justify-center items-center">
          <div className="w-9/12">
            <Image
              src="/Battery_empty.svg"
              style={{ width: "200px", height: "auto" }}
              width="0"
              height="0"
              alt="not enough funds"
              priority={true}
            />
          </div>
          <div className="w-9/12">
            {ethers.formatEther(this.state.l2Balance)} SHOP ETH is not enough to
            continue.
          </div>
          <div className="w-9/12">
            You can <pre className="inline-block bg-gray-200">depositETH</pre>{" "}
            on the Sepolia Bridge to get SHOP ETH.
          </div>
          <div className="w-9/12">
            Available Sepolia ETH: {ethers.formatEther(this.state.l1Balance)}
          </div>
          <div className="w-9/12">
            <a
              className="underline cursor-pointer"
              href="https://github.com/eth-clients/sepolia/blob/main/README.md?plain=1#L38-L45"
              target="_blank"
              rel="noopener"
            >
              Need more?
            </a>
          </div>
          <label className="w-5/12">Deposit Amount</label>
          <div className="w-4/12">
            <input
              type="range"
              step="1"
              onChange={(evt) =>
                this.setState({
                  depositValue:
                    (BigInt(evt.target.value) * this.state.l1Balance) /
                    BigInt(100),
                })
              }
            />
          </div>
          <div className="w-9/12">
            Clicking <pre className="inline-block bg-gray-200">Deposit</pre>{" "}
            will switch to Sepolia Network and ask for a signature.
          </div>
          <div
            className="w-9/12 btn cursor-pointer"
            onClick={() => this.runDeposit()}
          >
            Deposit {ethers.formatEther(this.state.depositValue)} Sepolia ETH.
          </div>
        </div>
      </>
    );
  }

  abifun2sig(abifun) {
    const sig =
      abifun.name +
      "(" +
      abifun.inputs.reduce((s, i) => s + "," + i.type, "").slice(1) +
      ")";
    return sig;
  }

  abifun2sigbytes(abifun) {
    const sig = this.abifun2sig(abifun);
    let utf8Encode = new TextEncoder();
    return ethers.keccak256(utf8Encode.encode(sig)).slice(0, 10);
  }

  renderAbiFun(abifun) {
    return (
      <>
        {abifun.inputs.map((funcInput, i) => {
          return (
            <input
              className="block mx-5 border"
              id={funcInput.key}
              key={funcInput.key}
              type="text"
              placeholder={funcInput.name + " / " + funcInput.type}
              onChange={(e) => {
                let s = { ...this.state.contractData };
                s[funcInput.key] = e.target.value;
                this.setState({ contractData: s });
              }}
            ></input>
          );
        })}
      </>
    );
  }

  transformAbiForRender(abi: Object): Object {
    let keyed = [];
    for (const fun of abi) {
      if (fun.type === "function" && fun.stateMutability != "view") {
        const sig = this.abifun2sigbytes(fun);
        keyed = [
          ...keyed,
          {
            key: sig,
            name: { key: sig + "name", value: fun.name },
            inputs: fun.inputs.map((input, i) => {
              return {
                ...input,
                key: sig + "i" + i,
              };
            }),
            outputs: fun.outputs,
            stateMutability: fun.stateMutability,
            type: fun.type,
          },
        ];
      }
    }
    return keyed;
  }

  renderAbi(abi: Object) {
    const keyed = this.transformAbiForRender(abi);
    return (
      <>
        <button
          className="block btn btn-red m-1 object-right-top"
          type="btn"
          onClick={() => (this.overlay.current.style.display = "none")}
        >
          X
        </button>
        <label htmlFor="abifile" className="m-1">
          Select ABI
        </label>
        <input
          type="file"
          id="abifile"
          onChange={this.handleABIUpload}
          accept=".json"
        />
        <h1 className="text-xl">{this.state.abiName}</h1>
        {keyed.map((entry) => {
          if (entry.type === "function" && entry.stateMutability != "view") {
            return (
              <div key={entry.name.key} className="block border p-1">
                <form
                  id={entry.key}
                  key={entry.key}
                  onSubmit={(event) => {
                    this.contractCall(event, abi, entry);
                  }}
                >
                  {entry.name.value}({this.renderAbiFun(entry)})
                  <button
                    className="btn block"
                    type="submit"
                    onClick={() =>
                      (this.overlay.current.style.display = "none")
                    }
                  >
                    Create Calldata
                  </button>
                </form>
              </div>
            );
          }
        })}
      </>
    );
  }

  render() {
    return (
      <div>
        <div ref={this.recharge} id="recharge">
          {this.renderRecharge()}
        </div>
        <div ref={this.overlay} id="overlay">
          {this.renderAbi(this.state.abi)}
        </div>
        {this.renderWallet()}
        <div className="h-40 border-solid border-slate-200 border rounded-lg overflow-auto p-4">
          {this.state.statusMessage.map((entry) => {
            return (
              <span
                className={"block " + entry.color}
                key={entry.key}
                dangerouslySetInnerHTML={{ __html: entry.msg }}
              ></span>
            );
          })}
        </div>
      </div>
    );
  }
}

export default Wallet;
