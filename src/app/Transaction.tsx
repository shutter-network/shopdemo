import React, { createRef, Component } from "react";
import BlockiesSvg from "blockies-react-svg";
import { ethers } from "ethers";

class Transaction extends Component {
  constructor(props, ref) {
    super(props);
    this.overlay = props.overlay;
    this.recharge = props.recharge;
    this.checkBalances = props.checkBalances;
    this.checkReceiverIsContract = props.checkReceiverIsContract;
    this.txto = createRef(null);
    this.txvalue = createRef(null);
    this.state = {
      availableBalance: props.availableBalance,
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

  toggleRecharge = async () => {
    this.recharge.current.style.display = "block";
    try {
      await this.checkBalances();
    } catch (err) {
      console.error(err);
    }
  };

  txValueChanged = (event) => {
    const valueInput = event.target.value;
    let value;
    let moreFunds = false;
    let validation = "";
    let valid = !isNaN(valueInput);
    if (valid && this.state.txValueDisplayWei) {
      value = parseInt(valueInput);
      if (ethers.formatUnits(value, 0) != valueInput) {
        valid = false;
        validation = "wei must be an integer (no decimals allowed)";
      }
    }
    if (valid && !this.state.txValueDisplayWei) {
      try {
        value = ethers.parseEther(valueInput);
      } catch (err) {
        valid = false;
        validation = err.shortMessage;
      }
    }
    if (!valid && validation === "") {
      validation = "not a number";
    } else if (value > this.state.availableBalance) {
      validation = "not enough funds";
      valid = false;
      moreFunds = true;
    }
    if (valid === false) {
      this.txvalue.current.style.borderColor = "red";
      this.txvalue.current.style.backgroundColor = "rgba(255, 0, 0, 0.25)";
    } else if (valid === true) {
      this.txvalue.current.style.borderColor = "";
      this.txvalue.current.style.backgroundColor = "rgba(0, 255, 0, 0.25)";
    }

    this.setState({
      txValueValid: valid,
      txValueMsg: validation,
      txValueInput: valueInput,
      txvalue: value,
      moreFunds: moreFunds,
    });
  };

  toggleValueInputFormat = (evt) => {
    if (this.state.txValueValid === false) {
      return;
    }
    let valueInput = this.state.txValueInput;
    if (this.state.txValueDisplayWei) {
      // change to ETH display
      valueInput = ethers.formatUnits(this.state.txvalue, 18);
    } else {
      // change to wei display
      valueInput = ethers.formatUnits(this.state.txvalue, 0);
    }
    this.txvalue.current.style.borderColor = "";
    this.txvalue.current.style.backgroundColor = "rgba(0, 255, 0, 0.25)";
    this.setState({
      txValueDisplayWei: !this.state.txValueDisplayWei,
      txValueInput: valueInput.toString(),
      txValueValid: true,
      txValueMsg: "",
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
            disabled={!this.state.receiverIsContract}
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
          <label htmlFor="txvalue" className="col-span-8">
            Value (
            <a className="underline" onClick={this.toggleValueInputFormat}>
              {this.state.txValueDisplayWei ? "in wei" : "in ETH"}
            </a>
            ):
          </label>
          <input
            type="input"
            id="txvalue"
            ref={this.txvalue}
            value={this.state.txValueInput}
            onChange={this.txValueChanged}
            className="col-span-8 p-4 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-base focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 text-wrap break-words"
          />
          <span className="col-span-4 text-red-400">
            {this.state.txValueMsg}
          </span>
          <span className={this.state.moreFunds ? "col-span-4" : "hidden"}>
            <a className="underline" onClick={this.toggleRecharge}>
              Click here to add more funds.
            </a>
          </span>
          <label htmlFor="txdata" className="col-span-8">
            Data:
          </label>
          <textarea
            type="input"
            id="txdata"
            value={this.state.txdata}
            onChange={(event) => this.setState({ txdata: event.target.value })}
            className="col-span-8 p-4 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-base focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 text-wrap break-words"
          />
        </div>
      </div>
    );
  }

  render() {
    return <div>{this.renderTransaction()}</div>;
  }
}

export default Transaction;
