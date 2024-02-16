import React, { Component } from 'react';
import { ShutterProvider, ethers, init, decrypt } from "shutter-sdk";
import { fund } from './Faucet';

class Metamask extends Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }

  async connectToMetamask() {
    if (window.ethereum) {
        const options = {wasmUrl: "/shutter-crypto.wasm", keyperSetManagerAddress: "0x4200000000000000000000000000000000000067", inboxAddress: "0x4200000000000000000000000000000000000066", keyBroadcastAddress: "0x4200000000000000000000000000000000000068"};
        const provider = new ShutterProvider(options, window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        const selectedAddress = accounts[0];
        await fund(selectedAddress);
        let balance = await provider.getBalance(selectedAddress);
        let balanceInEther = ethers.formatEther(balance);
        const block = await provider.getBlockNumber();
        const signer = await provider.getSigner(selectedAddress);
        const eonkey = await signer.getCurrentEonKey();
        await init(options.wasmUrl);
        window.dec = decrypt;
        
        // For debugging
        window.provider = provider;
        window.signer = signer;

        provider.on("block", (block) => {
            this.setState({ block: block });
            provider.getBalance(selectedAddress).then((newbalance) => {
                if (newbalance && newbalance != balance) {
                    balance = newbalance;
                    balanceInEther = ethers.formatEther(balance);
                    this.setState({ balance: balanceInEther });
                }
            })
        })

        this.setState({ 
            selectedAddress: selectedAddress, 
            balance: balanceInEther, 
            block: block, 
            eonkey: eonkey,
            signer: signer
        })
      }
    }

  async encryptMessage() {
    if (this.state.signer) {
        const msg = await this.state.signer.encryptOriginalTx(
          {
            from: this.state.selectedAddress,
            to: this.state.selectedAddress,
            value: 1
          }
        )
      console.log(msg[0]);
      const msgHex = Buffer.from(msg[0]).toString('hex');
      // const msgHex = msg[0].map(x => x.toString(16).padStart(2, '0'))
      // .join('');
      console.log(msgHex);
      this.setState({msg: msg, msgHex: msgHex})
    }
  }

  renderMetamask() {
    if (!this.state.block) {
      return (
        <button type="button" className="btn" onClick={() => this.connectToMetamask()}>Connect to Metamask</button>
      )
    } else {
      return (
        <div>
          <p>Welcome {this.state.selectedAddress}</p>
          <p>Your L2 ETH Balance is: {this.state.balance}</p>
          <p>Current L2 Block is: {this.state.block}</p>
          <p className="ellipsis">Current EonKey is: {this.state.eonkey}</p>
          {this.renderShutter()}
        </div>
      );
    }
  }

  renderShutter() {
      if (this.state.signer && !this.state.msgHex) {
          return (
            <button type="button" className="btn btn-red" onClick={() => this.encryptMessage()}>EncryptMessage</button>
          )
      }
      if (this.state.msgHex) {
          return (
            <div className="mb-6">
              <label htmlFor="large-input" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Encrypted Message:</label>
              <span type="text" id="large-input" className="block w-full p-4 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-base focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 text-wrap break-words">{this.state.msgHex}</span>
            </div>
         )
      }
  }

  render() {
    return(
      <div>
        {this.renderMetamask()}
      </div>
    )
  }
}

export default Metamask;
