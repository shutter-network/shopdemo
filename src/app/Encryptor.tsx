import React, { Component } from 'react';


const delay = ms => new Promise(
  resolve => setTimeout(resolve, ms)
);

class Encryptor extends Component {
    constructor(props) {
        super(props);
        this.state = {
            position: 0,
            text: "This text has gotta go, you won't see it any longer :)",
            encrypted: false
        };
    }

    async runEncryptor() {
        console.log("foo")
        for (let i=0; i < this.state.text.length; i++){
            await delay(200);
            let chars = this.state.text.split('')
            chars[i] = '*'
            this.setState({ 
                text: chars.join(''),
                encrypted: true
            })
        }
    }

    renderEncryptor() {
        return (
            <div>
                <span type="text" id="encryptortext" className="block w-full p-4 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-base focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 text-wrap break-words">{this.state.text}</span>
        <button type="button" className="btn" onClick={() => this.runEncryptor()}>Encrypt</button>
            </div>
               )};


    render() {
        return(
                <div>
                {this.renderEncryptor()}
                </div>
              )
    }
}

export default Encryptor;
