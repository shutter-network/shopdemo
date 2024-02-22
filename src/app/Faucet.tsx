import { ethers, Wallet, BrowserProvider } from "shutter-sdk";

export async function fund(target_address: string) {
    const FAUCET_ADDRESS = "0x2a0D87eA3a9E0ca33Ddd4a62C33878b58152effE";
    const FAUCET_PK = "0x83b6122c38b58e37ce42adafd43e7b402e19f4413ce6de9dc9219f50d71c3768"
    console.log("faucet funding", target_address);
    if (window.ethereum) {
        console.log("Getting provider")
        const faucetprovider = new BrowserProvider(window.ethereum);
        console.log("Getting signer")
        const faucetsigner = new Wallet(FAUCET_PK, faucetprovider);
        window.faucetsigner = faucetsigner
        console.log("sending tx")
        let txresponse = await faucetsigner.sendTransaction({from: FAUCET_ADDRESS, to: target_address, value: ethers.parseEther('1.1')}); 
        console.log(txresponse.hash)
        faucetprovider.waitForTransaction(txresponse.hash)
        .then((receipt) => {
            console.log("receipt", receipt)
        })
        .catch((error) => {
            console.log(error)
        })
    } else {
        throw("Ethereum not available")
    }
}
