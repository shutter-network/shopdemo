import { ethers, Wallet, BrowserProvider } from "@shutter-network/shop-sdk";
import L1Bridge from "./L1StandardBridge";
import addresses from "./addresses";

export async function fund(target_address: string) {
  console.log("Running deposit");
  return;
  if (window.ethereum) {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const bridge = new ethers.Contract(
        addresses.L1StandardBridge,
        L1Bridge.api,
        signer,
      );
      const deposit = bridge.bridgeETH(13000, "0x", { value: 10000000000 });
      await deposit.wait();

      console.log("deposit successful");
    } catch (error) {
      console.log("error on deposit");
      console.error(error);
    }
  }
}
