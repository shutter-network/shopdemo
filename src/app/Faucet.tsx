import { ethers, Wallet, BrowserProvider } from "shutter-sdk";

export async function fund(target_address: string) {
  const FAUCET_ADDRESS = "0x2a0D87eA3a9E0ca33Ddd4a62C33878b58152effE";
  const FAUCET_PK =
    "0x83b6122c38b58e37ce42adafd43e7b402e19f4413ce6de9dc9219f50d71c3768";
  console.log("faucet funding", target_address);
  if (window.ethereum) {
    try {
      const faucetprovider = new BrowserProvider(window.ethereum);
      const faucetsigner = new Wallet(FAUCET_PK, faucetprovider);
      window.faucetsigner = faucetsigner;
      const gasPrice = (await faucetprovider.getFeeData()).gasPrice;
      console.log(gasPrice);
      let txresponse = faucetsigner.sendTransaction({
        from: FAUCET_ADDRESS,
        to: target_address,
        value: ethers.parseEther("1.1"),
        nonce: await faucetprovider.getTransactionCount(FAUCET_ADDRESS),
        gasPrice: gasPrice,
        gasLimit: "0x5208", // 21000
      });
    } catch (error) {
      console.log("silent error in faucet");
    }
  }
}
