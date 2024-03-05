import React, { Component, createRef } from "react";
import Image from "next/image";
import {
  ShutterProvider,
  ethers,
  init,
  decrypt,
} from "@shutter-network/shop-sdk";
import { checkOnboarding, queryL1 } from "./Onboarding";
import { fund } from "./Faucet";
import Transaction from "./Transaction";
import Camera from "./Camera";
import uuidv3 from "uuid/v3";
import L1Bridge from "./L1StandardBridge";

const BLOCKTIME = 5;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class Metamask extends Component {
  constructor(props) {
    super(props);
    this.state = {
      txform: createRef(),
      camera: createRef(),
      decryptionKey: "",
      inclusionWindow: 5,
      executions: [],
      statusMessage: [],
      abi: L1Bridge.abi,
      paused: false,
    };
    this.overlay = createRef(null);
  }

  async newTx() {
    await this.setState({
      msgHex: "",
      decryptionKey: "",
      executions: [],
      decrypted: "",
    });
  }

  contractCall = async (event, abi, abifun) => {
    event.preventDefault();
    const intf = new ethers.Interface(abi);
    let args = [];
    for (const input of abifun.inputs) {
      console.log(this.state.contractData[input.key]);
      args = [...args, this.state.contractData[input.key]];
    }
    const funfrag = intf.getFunction(abifun.name.value);
    const calldata = intf.encodeFunctionData(funfrag, args);
    this.state.txform.current.setState({ txdata: calldata });
    console.log(calldata);
  };

  handleABIUpload = async (event) => {
    console.log(event);
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    const file = event.target.files[0];
    var reader = new FileReader();
    reader.readAsText(file);
    var abi = undefined;
    reader.onload = (evt) => {
      var content = JSON.parse(evt.target.result);
      console.log(content);
      if (content.abi) {
        abi = content.abi;
      } else {
        abi = content;
      }
      this.setState({ abi: abi });
    };
  };

  addStatusMessage = async (...msgs: string) => {
    let statusMessages = [...this.state.statusMessage];
    msgs.forEach((msg, i) => {
      statusMessages = [
        ...statusMessages,
        {
          msg: msg,
          key:
            Date.parse(new Date()).toString() +
            "-" +
            [...msg].reduce((s, c) => s + c.charCodeAt(), 0),
        },
      ];
      console.log("MSG", msg);
    });
    console.log(JSON.stringify(statusMessages));
    await this.setState({ statusMessage: statusMessages });
  };

  async connectToMetamask() {
    if (window.ethereum) {
      console.log("Starting...");
      const [l1provider, l1bridge] = await queryL1(this.addStatusMessage);
      window.l1provider = l1provider;
      window.l1bridge = l1bridge;
      const options = {
        wasmUrl: "/shutter-crypto.wasm",
        keyperSetManagerAddress: "0x4200000000000000000000000000000000000067",
        inboxAddress: "0x4200000000000000000000000000000000000066",
        keyBroadcastAddress: "0x4200000000000000000000000000000000000068",
      };
      const provider = new ShutterProvider(options, window.ethereum);

      const connected = await checkOnboarding(this.addStatusMessage);
      console.log(connected);

      this.setState({ provider: provider });
      console.log("provider ready");

      try {
        const websock = new ethers.WebSocketProvider(
          "wss://socket.sepolia.staging.shutter.network",
        );
        this.listener = websock;
        console.log("Using websocket listener for blocks");
      } catch (error) {
        console.log("Using BrowserProvider listener for blocks");
        this.listener = provider;
      }
      const accounts = await provider.send("eth_requestAccounts", []);
      const selectedAddress = accounts[0];
      let balance = await provider.getBalance(selectedAddress);
      if (balance < 100000000000000000) {
        try {
          await this.addStatusMessage(
            "Trying to auto-fund your account. Please stand by...",
          );
          // await fund(selectedAddress);
        } catch (error) {
          console.log("funding error:");
          console.log(error);
        }
        await this.addStatusMessage("success");
        console.log("funding done");
      }
      balance = await provider.getBalance(selectedAddress);
      let balanceInEther = ethers.formatEther(balance);
      const block = await provider.getBlockNumber();
      const signer = await provider.getSigner(selectedAddress);
      signer.provider.pollingIntervall = 1000;
      provider.pollingIntervall = 1000;
      const eonkey = await signer.getCurrentEonKey();
      await init(options.wasmUrl);

      // For debugging
      window.dec = decrypt;
      window.provider = provider;
      window.signer = signer;

      this.provider = provider;
      this.listener.on("block", (block) => {
        this.setState({ block: block });
        provider.getBalance(selectedAddress).then((newbalance) => {
          if (newbalance && newbalance != balance) {
            balance = newbalance;
            balanceInEther = ethers.formatEther(balance);
            this.setState({ balance: balanceInEther });
          }
        });
        signer.isShutterPaused().then((paused) => {
          if (paused != this.state.paused) {
            this.setState({ paused: paused });
            if (paused) {
              addStatusMessage("Shutter is paused");
            } else {
              addStatusMessage("Shutter is operational");
            }
          }
        });
      });

      this.setState({
        selectedAddress: selectedAddress,
        balance: balanceInEther,
        block: block,
        eonkey: eonkey,
        signer: signer,
      });
    }
  }

  async decryptMessage(msg: string, key: string): string {
    if (this.state.signer) {
      const a_msg = this.state.signer.hexKeyToArray(msg);
      const a_key = this.state.signer.hexKeyToArray(key);
      const decrypted = await decrypt(a_msg, a_key);
      return decrypted;
    }
  }

  // eye candy
  async runEncryptor() {
    if (this.state.msgHex) {
      for (let i = 0; i < this.state.msgHex.length; i++) {
        await delay(10);
        let chars = this.state.msgHex.split("");
        chars[i] = "*";
        this.setState({
          msgHex: chars.join(""),
        });
      }
    }
  }

  async encryptMessage() {
    const txstate = this.state.txform.current.state;
    if (this.state.signer) {
      let tx_request = {
        from: this.state.selectedAddress,
        to: txstate.txto,
        value: txstate.txvalue,
        data: txstate.txdata,
      };
      await this.setState({ msgHex: JSON.stringify(tx_request) });
      await this.runEncryptor();
      const send = await this.state.signer._sendTransactionTrace(
        tx_request,
        this.state.inclusionWindow,
        this.listener,
      );
      // const send = await this.state.signer.sendTransaction(tx_request)
      let tx = send[1];
      let msg = send[0];
      let executionBlock = send[2];
      this.state.camera.current.control("setBlur");
      this.installBlockListener(executionBlock, this.listener);
      tx = await tx;
      this.listener.waitForTransaction(tx.hash).then((value) => {
        if (value.blockNumber < executionBlock && value.status == 1) {
          console.log(value.hash);
          this.state.camera.current.control("setFocus");
        } else {
          console.log("Inbox tx failed/too late!", value);
        }
      });
      const msgHex = Buffer.from(msg).toString("hex");
      console.log("encryptedHex", msgHex);
      this.setState({ msg: msg, msgHex: msgHex });
    }
  }

  async decodeShopReceipt(blocknumber: number) {
    let blockdata = await provider.getBlock(blocknumber, true);
    console.log(blockdata);
    let txhash = blockdata.getPrefetchedTransaction(0).hash;
    console.log(txhash);
    let receipt = await provider.getTransactionReceipt(txhash);
    console.log(receipt);
    let logdata = receipt.logs[0].data;
    console.log("executed", logdata);

    let [decryptionKey, executions] = signer.decodeExecutionReceipt(logdata);
    executions = executions.map((x, xidx) =>
      x.map((inner, iidx) => [xidx.toString() + "_" + iidx.toString(), inner]),
    );
    console.log("executions", executions);

    let decrypted = await this.decryptMessage(
      this.state.msgHex,
      decryptionKey.slice(2),
    );
    console.log("decrypted", decrypted);

    const [to, data, value] = this.state.signer.decodeExecutionReceipt(
      "0x" + Buffer.from(decrypted.slice(1)).toString("hex"),
    );
    this.state.camera.current.control("releaseShutter", { txto: to });

    this.setState({
      decryptionKey: decryptionKey.slice(2),
      executions: executions,
      decrypted: JSON.stringify(
        [
          { version: decrypted[0] },
          { to: to, data: data, value: parseInt(value, 16) },
        ],
        null,
        2,
      ),
    });
  }

  installBlockListener(number: number, provider: any) {
    return provider.once("block", async (blocknumber) => {
      if (blocknumber < number) {
        this.state.camera.current.control("blink");
        this.state.camera.current.control("setCountdown", {
          time: number - blocknumber,
          blockTime: BLOCKTIME,
        });
        this.installBlockListener(number, provider);
      } else {
        this.state.camera.current.control("disarm");
        this.decodeShopReceipt(blocknumber);
      }
    });
  }

  renderMetamask() {
    if (!this.state.block) {
      return (
        <div className="heading">
          <Image
            src="/SH_OP.svg"
            width="100"
            height="100"
            alt="shutterized OPTIMISM demo"
            priority={true}
          />
          <button
            type="button"
            className="btn"
            onClick={() => this.connectToMetamask()}
          >
            Connect to Metamask
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
            className="logo float-left"
          />
          <p>Welcome {this.state.selectedAddress}</p>
          <p>Your L2 ETH Balance is: {this.state.balance}</p>
          <p>Current L2 Block is: {this.state.block} </p>
          <p className="ellipsis">Current EonKey is: {this.state.eonkey}</p>
          {this.renderShutter()}
        </div>
      );
    }
  }

  renderShutter() {
    if (this.state.signer && !this.state.msgHex) {
      return (
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
          <Transaction ref={this.state.txform} />
          <button
            type="button"
            disabled={this.state.paused}
            className={
              this.state.paused ? "btn btn-disabled disabled" : "btn btn-red"
            }
            onClick={() => this.encryptMessage()}
          >
            Encrypt Transaction
          </button>
        </form>
      );
    }
    if (this.state.msgHex) {
      return (
        <div className="mb-6">
          <Camera ref={this.state.camera} url="camera-13695.mp3" />
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
      );
    }
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

  renderAbi(abi) {
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
    console.log(keyed);
    return (
      <>
        <button
          className="block btn btn-red m-1 object-right-top"
          type="btn"
          onClick={() => (this.overlay.current.style.display = "none")}
        >
          X
        </button>
        <label for="abifile" className="m-1">
          Select ABI
        </label>
        <input
          type="file"
          id="abifile"
          onChange={this.handleABIUpload}
          accept=".json"
        />
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
                  <button className="btn block" type="submit">
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
        <div ref={this.overlay} id="overlay">
          {this.renderAbi(this.state.abi)}
        </div>
        {this.renderMetamask()}
        <button
          className="btn"
          type="btn"
          onClick={() => (this.overlay.current.style.display = "block")}
        >
          Show ABI
        </button>
        {this.state.statusMessage.map((msg) => {
          return (
            <span className="inline-block" key={msg.key}>
              {msg.msg}
            </span>
          );
        })}
      </div>
    );
  }
}

export default Metamask;
