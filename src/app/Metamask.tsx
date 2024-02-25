import React, { Component, createRef } from 'react';
import { ShutterProvider, ethers, init, decrypt } from "shutter-sdk";
import { fund } from './Faucet';
import Transaction from './Transaction';


class Metamask extends Component {
    constructor(props) {
        super(props);
        this.state = {
            txform: createRef(),
            decryptionKey: "",
            untilExe: "",
            executions: []
        };
    }

    async connectToMetamask() {
        if (window.ethereum) {
            console.log("Starting...")
                const options = {wasmUrl: "/shutter-crypto.wasm", keyperSetManagerAddress: "0x4200000000000000000000000000000000000067", inboxAddress: "0x4200000000000000000000000000000000000066", keyBroadcastAddress: "0x4200000000000000000000000000000000000068"};
            const provider = new ShutterProvider(options, window.ethereum);
            this.setState({provider: provider})
            console.log("provider ready")
                const accounts = await provider.send("eth_requestAccounts", []);
            const selectedAddress = accounts[0];
            let balance = await provider.getBalance(selectedAddress);
                // FIXME: for some reason the auto faucet stopped working
                if (false) {
                try {
                    await fund(selectedAddress);
                } catch (error) {
                    console.log("funding error:")
                        console.log(error)
                }
                console.log("funding done")
            }
            balance = await provider.getBalance(selectedAddress);
            let balanceInEther = ethers.formatEther(balance);
            const block = await provider.getBlockNumber();
            const signer = await provider.getSigner(selectedAddress);
            const eonkey = await signer.getCurrentEonKey();
            await init(options.wasmUrl);

            // For debugging
            window.dec = decrypt;
            window.provider = provider;
            window.signer = signer;

            this.provider = provider;
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

    async decryptMessage(msg: string, key: string): string {
        if (this.state.signer) {
            const a_msg = this.state.signer.hexKeyToArray(msg);
            const a_key = this.state.signer.hexKeyToArray(key);
            const decrypted = await decrypt(a_msg, a_key);
            console.log(decrypted)
        }
    }

    async encryptMessage() {
        const txstate = this.state.txform.current.state;
        if (this.state.signer) {
            let tx_request = {
                        from: this.state.selectedAddress,
                        to: txstate.txto,
                        value: txstate.txvalue,
            }
            const send = await this.state.signer._sendTransactionTrace(tx_request, 15)
            let tx = send[1]
            // const send = await this.state.signer.sendTransaction(tx_request)
            let msg = send[0]
            let executionBlock = send[2]
            await tx
            this.installBlockListener(executionBlock, this.state.provider)
            console.log("encrypted", msg);
            const msgHex = Buffer.from(msg).toString('hex');
            console.log("encryptedHex", msgHex);
            this.setState({msg: msg, msgHex: msgHex})
        }
    }

    async decodeShopReceipt(blocknumber: number) {
        let blockdata = await provider.getBlock(blocknumber, true)
        console.log(blockdata)
        let txhash = blockdata.getPrefetchedTransaction(0).hash;
        console.log(txhash)
        let receipt = await provider.getTransactionReceipt(txhash);
        console.log(receipt);
        let logdata = receipt.logs[0].data;
        console.log("executed", logdata);
        let [decryptionKey, executions] = signer.decodeExecutionReceipt(logdata)
        this.setState({decryptionKey: decryptionKey.slice(2), executions: executions})
        console.log(executions)
    }

    installBlockListener(number: number, provider: any) {
        return this.state.provider.once("block", async (blocknumber) => {
            if (blocknumber == number) {
                this.setState({untilExe: ""})
                this.decodeShopReceipt(blocknumber);
            } else {
                this.setState({untilExe: number - blocknumber})
                console.log(number - blocknumber, "blocks left");
                this.installBlockListener(number, provider);
            }
        })
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
                    <p>Current L2 Block is: {this.state.block} </p>
                    <p>{this.state.untilExe}</p>
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
                    <Transaction ref={this.state.txform} />
                    <button type="button" className="btn btn-red" onClick={() => this.encryptMessage()}>Encrypt Transaction</button>
                    </form>
                   )
        }
        if (this.state.msgHex) {
            return (
                    <div className="mb-6">
                    <label htmlFor="encryptedTx" 
                        className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Encrypted Transaction:</label>
                    <span type="text" id="encryptedTx" className="block w-full p-4 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-base focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 text-wrap break-words">{this.state.msgHex}</span>
                    <label htmlFor="large-input" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Decryption Key:</label>
                    <input onChange={(event) => this.decryptMessage(this.state.msgHex, event.target.value)} type="text" name="key" id="key" className="block w-full p-4 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-base focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 text-wrap break-words" value={this.state.decryptionKey}></input>
            {this.state.executions.map( 
                exe => { return <div><span className={"border " + (exe[0] == "0x64" ? "bg-green-500" : "bg-red-400")} key={exe[0]}>Status: {exe[0]}</span><span key={exe[1]}> Gas: {parseInt(exe[1], 16)} </span> <span key={exe[2]}>Log#: {exe[2]}</span></div>})
            }
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
                {this.renderMetamask()}
                </div>
              )
    }
}

export default Metamask;
