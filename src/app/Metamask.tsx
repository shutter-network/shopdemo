import React, { Component } from 'react';
import { ShutterProvider, ethers } from "shutter-sdk";

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
        console.log(provider);
        window.provider = provider;
        const accounts = await provider.send("eth_requestAccounts", []);
        const selectedAddress = accounts[0];
        const balance = await provider.getBalance(selectedAddress);
        const balanceInEther = ethers.formatEther(balance);
        const block = await provider.getBlockNumber();
        const signer = await provider.getSigner(selectedAddress);
        const eonkey = await signer.getCurrentEonKey();
        window.signer = signer;

        provider.on("block", (block) => {
          this.setState({ block: block });
          console.log(block)
        })


        this.setState({ selectedAddress: selectedAddress, balance: balanceInEther, block: block, eonkey: eonkey})
        // this.setState({ block: block, signer: signer })
      }
    }

  renderMetamask() {
    if (!this.state.block) {
      return (
        <button onClick={() => this.connectToMetamask()}>Connect to Metamask</button>
      )
    } else {
      return (
        <div>
          <p>Welcome {this.state.selectedAddress}</p>
          <p>Your ETH Balance is: {this.state.balance}</p>
          <p>Current ETH Block is: {this.state.block}</p>
          <p className="ellipsis">Current EonKey is: {this.state.eonkey}</p>
        </div>
      );
    }
  }

/*
          <p>Welcome {this.state.selectedAddress}</p>
          <p>Your ETH Balance is: {this.state.balance}</p>
          <p>Current ETH Block is: {this.state.block}</p>
*/
  render() {
    return(
      <div>
        {this.renderMetamask()}
      </div>
    )
  }
}

export default Metamask;
