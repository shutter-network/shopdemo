import React, { Component } from "react";
import BlockiesSvg from "blockies-react-svg";

class Transaction extends Component {
  constructor(props, ref) {
    super(props);
    console.log(ref);
    this.state = {
      txto: "",
      txvalue: 1,
      txdata: "",
    };
  }

  renderTransaction() {
    return (
      <div>
        <label htmlFor="txto">Receiver:</label>
        <BlockiesSvg
          address={this.state.txto}
          className="receiver-icon w-px-40 h-px-40 float-right"
          key={this.state.txto}
          scale={5}
        />
        <input
          type="input"
          id="txto"
          value={this.state.txto}
          onChange={(event) => this.setState({ txto: event.target.value })}
          className="block w-3/4 p-4 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-base focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 text-wrap break-words"
        />
        <label htmlFor="txvalue">Value:</label>
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
