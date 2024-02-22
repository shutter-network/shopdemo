import React, { Component } from 'react';

class Encryptor extends Component {
    constructor(props) {
        super(props);
        this.state = {
text: "abc"
        };
    }

    async runEncryptor() {
        this.setState({ 
text: "***"
})
}

renderEncryptor() {
    return (
            <span type="text" id="encryptortext" className="block w-full p-4 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-base focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 text-wrap break-words">{this.state.text}</span>
            <button type="button" className="btn" disabled={!this.state.encrypted} onClick={() => this.runEncryptor()}>Encrypt</button>
           )
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
                <form name="decryption">
                <input onChange={(event) => this.decryptMessage(this.state.msgHex, event.target.value)} type="text" name="key" id="key" className="block w-full p-4 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-base focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 text-wrap break-words">{this.state.decryptionKey}</input>
                </form>
                </div>
               )
    }
    if (keyInput) {
        console.log(keyInput)
    }
}

render() {
    return(
            <div>
            {this.renderEncryptor()}
            </div>
          )
}
}

export default Metamask;
