import { ethers, Wallet, BrowserProvider } from "shutter-sdk";

export async function fund(target_address: string) {
    const FAUCET_ADDRESS = "0x7F6E15098861Aac5C88B49e7353bc3Ddec9E89cF";
    const FAUCET_PK = "0xaf44e03c2baca827b38e20e266d982fdd5ec2c7dd9c4484442ff8706e80cd3b8"
    console.log("faucet funding", target_address);
    if (window.ethereum) {
        const faucetprovider = new BrowserProvider(window.ethereum);
        const faucetsigner = new Wallet(FAUCET_PK, faucetprovider);
        let txresponse = await faucetsigner.sendTransaction({from: FAUCET_ADDRESS, to: target_address, value: ethers.parseEther('1.1')}); 
        faucetprovider.waitForTransaction(txresponse.hash)
        .then((receipt) => {
        })
        .catch((error) => {
            console.log(error)
        })
    }
}
