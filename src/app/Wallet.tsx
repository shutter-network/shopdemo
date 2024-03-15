import React, { Component, createRef, useEffect, useState } from "react";
import Image from "next/image";
import {
  ShutterProvider,
  ethers,
  init,
  decrypt
} from "@shutter-network/shop-sdk";
import {
  checkL1Balance,
  checkL2Balance,
  switchShopNetwork,
  checkOnboarding,
  queryL1
} from "./Onboarding";
import { switchAndDeposit } from "./Deposit";
import Transaction from "./Transaction";
import Camera from "./Camera";
import uuidv3 from "uuid/v3";
import L1Bridge from "./L1StandardBridge";
import mintable from "./mintableERC20";
import { formatEther } from "ethers";

const BLOCKTIME = 5;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const bigIntMax = (...args) => args.reduce((m, e) => (e > m ? e : m));

const Recharge = ({ l1Balance, l2Balance, onClick }) => {
  const [depositValue, setDepositValue] = useState(0);

  useEffect(() => {
    setDepositValue((BigInt(1) * BigInt(l1Balance)) / BigInt(100));
  }, [l1Balance]);

  return (
    <div className="p-6 rounded-lg text-center">
      <button
        className="absolute top-0 right-0 m-4 bg-red-500 text-white rounded-full p-2"
        onClick={() => (document.getElementById("recharge").style.display = "none")}
      >
        X
      </button>
      <div className="flex flex-col items-center justify-center space-y-4">
        <Image
          src="/Battery_empty.svg"
          width="200"
          height="200"
          alt="not enough funds"
        />
        <p className="text-lg text-gray-700 dark:text-gray-200">
          {formatEther(l2Balance)} SHOP ETH is not enough to continue.
        </p>
        <p className="text-lg text-gray-700 dark:text-gray-200">
          You can deposit ETH on the Sepolia Bridge to get SHOP ETH.
        </p>
        <p className="text-lg text-gray-700 dark:text-gray-200">
          Available Sepolia ETH: {formatEther(l1Balance)}
        </p>
        <a
          className="underline text-blue-500 hover:text-blue-700"
          href="https://github.com/eth-clients/sepolia/blob/main/README.md?plain=1#L38-L45"
          target="_blank"
          rel="noopener noreferrer"
        >
          Need more?
        </a>
        <label className="text-lg text-gray-700 dark:text-gray-200">Deposit Amount</label>
        <input
          type="range"
          step="1"
          className="w-full"
          onChange={(evt) =>
            setDepositValue((BigInt(evt.target.value) * l1Balance) / BigInt(100))
          }
        />
        <p className="text-lg text-gray-700 dark:text-gray-200">
          Clicking 'Deposit' will switch to Sepolia Network and ask for a signature.
        </p>
        <button
          className="btn bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          onClick={() => onClick(depositValue)}
        >
          Deposit {formatEther(depositValue)} Sepolia ETH.
        </button>
      </div>
    </div>
  );
};

const StatusMessages = ({ statusMessages }) => {
  return (
    <div
      className="h-40 border-solid border-slate-200 border rounded-lg overflow-auto p-4 mt-4 fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-black transition-colors duration-500">

      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">Terminal Output</h2>

      {statusMessages.map((entry) => {
        return (
          <div key={entry.key}>
            <span className="text-gray-600 dark:text-gray-400">{entry.timestamp}</span>
            <span
              className={"block " + entry.color + " "}
              dangerouslySetInnerHTML={{ __html: entry.msg }}
            ></span>
          </div>
        );
      })}
    </div>
  );
};


class Wallet extends Component {
  constructor(props) {
    super(props);
    this.state = {
      decryptionKey: "",
      inclusionWindow: 5,
      executions: [],
      events: [],
      statusMessage: [],
      abi: null,
      abiName: "",
      paused: false,
      l1Balance: 0,
      l2Balance: 0,
      depositValue: 0
    };
    this.camera = createRef(null);
    this.txform = createRef(null);
    this.overlay = createRef(null);
    this.recharge = createRef(null);

    this.runDeposit = this.runDeposit.bind(this);
  }

  componentDidMount() {
    this.connectToWallet();
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

  addStatusMessage = async (...msgs: string[]) => {
    let statusMessages = [...this.state.statusMessage];
    msgs.forEach((msg, i) => {
      console.log(msg.slice(0, 1));
      var color = "text-black dark:text-white";
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
          timestamp: (new Date()).toLocaleString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          }),
          key:
            Date.parse(new Date()).toString() +
            "-" +
            [...msg].reduce((s, c) => s + c.charCodeAt(), 0)
        },
        ...statusMessages
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
        "Wallet setup failed - please reload and try again!"
      );
    }
    const options = {
      wasmUrl: "/shutter-crypto.wasm",
      keyperSetManagerAddress: "0x4200000000000000000000000000000000000067",
      inboxAddress: "0x4200000000000000000000000000000000000066",
      keyBroadcastAddress: "0x4200000000000000000000000000000000000068"
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
        "wss://socket.sepolia.staging.shutter.network"
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
                "!Shutter is paused! Contact <a href=\"https://t.me/shutter_network/1\" class=\"underline\">Shutter on TG</a>."
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
      eonkey: eonkey
    });
  }

  newTx = async () => {
    await this.setState({
      msgHex: "",
      decryptionKey: "",
      executions: [],
      events: [],
      decrypted: ""
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
      receiverIsContract: false
    });
  };

  async runDeposit(depositValue) {
    await switchAndDeposit(depositValue, this.addStatusMessage);
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
          msgHex: chars.join("")
        });
      }
    }
  }

  async encryptMessage() {
    console.log(this.state.l2Balance);
    if (this.state.l2Balance < ethers.parseEther("0.01")) {
      this.toggleRecharge();
      return;
    }
    const txstate = this.txform.current.state;
    if (!this.signer) {
      return;
    }
    if (txstate.txvalue > Number.MAX_SAFE_INTEGER) {
      this.addStatusMessage(
        "'value' too big to handle, changing to maximum amount"
      );
      this.txform.current.setState({
        txvalue: BigInt(Number.MAX_SAFE_INTEGER)
      });
      txstate.txvalue = BigInt(Number.MAX_SAFE_INTEGER);
    }
    let txRequest = {
      from: this.state.selectedAddress,
      to: txstate.txto,
      value: Number(txstate.txvalue),
      data: txstate.txdata
    };
    await this.setState({ msgHex: JSON.stringify(txRequest) });

    this.runEncryptor();

    const [msg, txResponse, executionBlock] =
      await this.signer._sendTransactionTrace(
        txRequest,
        this.state.inclusionWindow,
        this.listener
      );
    this.camera.current.control("setBlur");
    await executionBlock;

    if (!executionBlock) {
      console.err("executionBlock not resolved");
      return;
    }
    const exeListener = this.installBlockListener(
      executionBlock,
      this.listener
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

    // add keys for react/frontend
    executions = executions.map((x, xidx) =>
      x.map((inner, iidx) => [xidx.toString() + "_" + iidx.toString(), inner])
    );
    console.log("executions", executions);

    let decrypted = await this.decryptMessage(
      this.state.msgHex,
      decryptionKey.slice(2)
    );
    console.log("decrypted", decrypted);

    const [to, data, value] = ethers.decodeRlp(
      "0x" + Buffer.from(decrypted.slice(1)).toString("hex")
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
          { to: to, data: data, value: decoded_value }
        ],
        null,
        2
      )
    });
  }

  installBlockListener(number: number, provider: any) {
    return provider.once("block", async (blocknumber) => {
      if (blocknumber < number) {
        this.camera.current.control("blink");
        this.camera.current.control("setCountdown", {
          time: number - blocknumber,
          blockTime: BLOCKTIME
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
        <div className="heading text-center">
          <div className="flex justify-center">
            <Image
              src="/SH_OP.svg"
              width="100"
              height="100"
              alt="shutterized OPTIMISM demo"
              priority={true}
              className=""
            />
          </div>

          <div className={"m-4"}>
            Welcome to shutterized optimism demo on Sepolia. Send shutter encrypted
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
        <div className={"p-5 "}>
          <div className={"flex"}>
            <div className="mr-4 ml-8 mt-2">
              <Image
                src="/SH_OP.svg"
                width="100"
                height="100"
                alt="shutterized OPTIMISM demo"
                className="logo float-left mr-4"
              />
            </div>
            <div className={"flex-1 text-right"}>
              <p className="text-lg font-bold">Welcome {this.state.selectedAddress}</p>
              <p className="text-base">
                Your L2 ETH Balance is: <span
                className="text-blue-600 dark:text-yellow-300">{ethers.formatEther(this.state.l2Balance)}</span>{" "}
                <a
                  className="underline text-blue-700 cursor-pointer "
                  onClick={() => (this.toggleRecharge())}
                >
                  Add more.
                </a>
              </p>
              <p className="text-sm">Current L2 Block is: <span
                className="text-blue-600 dark:text-yellow-300">{this.state.block}</span>
              </p>
              <p className="text-sm">Current EonKey is: <span
                className="text-blue-600 dark:text-yellow-300"
                title={this.state.eonkey}>{this.state.eonkey.slice(0, 64)}...</span></p>
            </div>
          </div>


          <div className={"mt-32"}>
            {this.renderShutter()}
          </div>
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
      <div className="mb-6 flex">
        <div className="w-96 flex items-center justify-center mr-12">
          <Camera ref={this.camera} url="camera-13695.mp3" />
        </div>
        <div style={{ display: txFormDisplay }} className="flex-1">
          <form onSubmit={(event) => console.log(event)}
                className="bg-white dark:bg-gray-800 shadow-md rounded px-8 pt-6 pb-8 mb-4">
            <div className="mb-4">
              <label
                className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2"
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
                className="border rounded w-full  py-2 px-3 text-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:shadow-outline"
              />
              <p className="text-gray-600 dark:text-gray-400 text-xs italic">
                You need to sign the transaction before this timer runs out.
              </p>
            </div>
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
            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                disabled={this.state.paused}
                className={
                  this.state.paused
                    ? "bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline opacity-50 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline dark:bg-blue-700 dark:hover:bg-blue-600"
                }
                onClick={() => this.encryptMessage()}
              >
                Send Shutterized Transaction
              </button>
            </div>
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
      this.selectedAddress
    );
    const l2Balance = await checkL2Balance(
      this.addStatusMessage,
      this.selectedAddress
    );
    this.setState({
      l1Balance: l1Balance,
      l2Balance: l2Balance,
      depositValue: bigIntMax(
        ethers.parseEther("0.01"),
        ethers.parseEther("0.01") - l2Balance
      )
    });
  };

  toggleRecharge = async () => {
    this.recharge.current.style.display = "block";
    try {
      await this.checkBalances();
    } catch (err) {
      console.error(err);
    }
  };

  renderRecharge() {
    return (
      <Recharge l1Balance={this.state.l1Balance} l2Balance={this.state.l2Balance} onClick={this.runDeposit} />
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
              className="block mx-5 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 p-2 w-9/12 my-1"
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
                key: sig + "i" + i
              };
            }),
            outputs: fun.outputs,
            stateMutability: fun.stateMutability,
            type: fun.type
          }
        ];
      }
    }
    return keyed;
  }

  renderAbiFields(abi: Object) {
    const keyed = this.transformAbiForRender(abi);
    return (
      <>
        {keyed.map((entry) => {
          if (entry.type === "function" && entry.stateMutability != "view") {
            return (
              <div key={entry.name.key}
                   className="block border p-4 rounded-lg shadow-md bg-white dark:bg-gray-800 mb-4">
                <form
                  id={entry.key}
                  key={entry.key}
                  onSubmit={(event) => {
                    this.contractCall(event, abi, entry);
                  }}
                  className="space-y-2"
                >
                  <h2
                    className="text-lg font-bold text-gray-900 dark:text-white text-left">{entry.name.value}({this.renderAbiFun(entry)})</h2>
                  <button
                    className="btn block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline dark:bg-blue-700 dark:hover:bg-blue-600"
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

  renderAbi(abi: Object) {
    return (
      <>
        <button
          className="fixed top-0 right-0 m-4 bg-red-500 text-white rounded-full p-2"
          type="btn"
          onClick={() => (this.overlay.current.style.display = "none")}
        >
          X
        </button>
        <label htmlFor="abifile" className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          Select ABI
        </label>
        <input
          type="file"
          id="abifile"
          onChange={this.handleABIUpload}
          accept=".json"
          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white dark:bg-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white dark:border-gray-600"
        />
        {this.state.abiName && this.state.abi ?
          <div className={"mt-10"}>
            <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{this.state.abiName}</h1>
            {this.renderAbiFields(abi)}
          </div>
          :
          <div className={"mt-10"}>
            <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">No ABI specified</h1>
            <button type={"button"}
                    className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={() => {
                      this.setState({ abi: mintable, abiName: "Mintable ERC-20" });
                    }}>Use generic erc-20
            </button>
          </div>
        }
      </>
    );
  }

  render() {
    return (
      <div className={"pb-40"}>
        <div ref={this.recharge} className="overlay">
          <div
            className={"dark:bg-gray-800 bg-gray-100 p-6 rounded-lg shadow-lg w-full md:w-1/2 mx-auto text-center mt-20 mb-40 pb-40"}>

            {this.renderRecharge()}
          </div>

        </div>
        <div ref={this.overlay} className="overlay">
          <div
            className={"dark:bg-gray-800 bg-gray-100 p-6 rounded-lg shadow-lg w-full md:w-1/2 mx-auto text-center mt-20 mb-20"}>
            {this.renderAbi(this.state.abi)}
          </div>
        </div>
        {this.renderWallet()}

        <StatusMessages statusMessages={this.state.statusMessage} />
      </div>
    );
  }
}

export default Wallet;
