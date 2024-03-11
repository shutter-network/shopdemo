import React, { createRef, Component } from "react";
import BlockiesSvg from "blockies-react-svg";
import { ethers } from "ethers";

class Transaction extends Component {
  constructor(props, ref) {
    super(props);
    this.overlay = props.overlay;
    this.checkReceiverIsContract = props.checkReceiverIsContract;
    this.txto = createRef(null);
    this.state = {
      txto: "",
      txToMsg: "",
      txToValid: null,
      txvalue: 1,
      txdata: "",
      receiverIsContract: false,
    };
  }

  txToChanged = async (event) => {
    let address = event.target.value;
    let validation;
    let txToValid;

    try {
      address = ethers.getAddress(address);
      txToValid = true;
      validation = "";
    } catch (err) {
      txToValid = false;
      validation = err.shortMessage;
    }

    if (address.length === 0) {
      txToValid = null;
      validation = "";
    }

    const receiverIsContract = await this.checkReceiverIsContract(address);
    if (txToValid === null) {
      this.txto.current.style.backgroundColor = "";
    } else if (txToValid === false) {
      this.txto.current.style.borderColor = "red";
      this.txto.current.style.backgroundColor = "rgba(255, 0, 0, 0.25)";
    } else if (txToValid === true) {
      this.txto.current.style.borderColor = "";
      this.txto.current.style.backgroundColor = "rgba(0, 255, 0, 0.25)";
    }

    this.setState({
      txto: address,
      txToMsg: validation,
      txToValid: txToValid,
      receiverIsContract: receiverIsContract,
    });
  };

  renderTransaction() {
    return (
      <div>
        <div className="grid grid-cols-8">
          <label htmlFor="txto" className="col-span-8">
            {this.state.receiverIsContract ? "Contract:" : "Receiver:"}
          </label>
          <input
            type="input"
            id="txto"
            ref={this.txto}
            value={this.state.txto}
            required
            onChange={this.txToChanged}
            className="col-span-7 p-4 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-base focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 text-wrap break-words"
          />
          <button
            className="btn col-span-1"
            type="btn"
            onClick={(evt) => {
              evt.preventDefault();
              this.overlay.current.style.display = "block";
            }}
            style={{
              display: this.state.receiverIsContract ? "inline-block" : "none",
            }}
          >
            Use ABI
          </button>
          <span className="col-span-8 text-red-400">{this.state.txToMsg}</span>
        </div>
        <label htmlFor="txvalue">Value (in wei):</label>
        <input
          type="input"
          id="txvalue"
          value={this.state.txvalue}
          onChange={(event) => this.setState({ txvalue: event.target.value })}
          className="block w-full p-4 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-base focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 text-wrap break-words"
        />
        <label htmlFor="txdata">Data:</label>
        <textarea
          type="input"
          id="txdata"
          value={this.state.txdata}
          onChange={(event) => this.setState({ txdata: event.target.value })}
          className="block w-full p-4 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-base focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 text-wrap break-words"
        />
      </div>
    );
  }

  render() {
    return <div>{this.renderTransaction()}</div>;
  }
}

export default Transaction;
