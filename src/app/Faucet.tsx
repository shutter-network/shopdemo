import { ethers, Wallet, BrowserProvider } from "@shutter-network/shop-sdk";
import L1Bridge from "./L1StandardBridge";
import addresses from "./addresses";
import { sepoliaChain, switchSepoliaNetwork } from "./Onboarding";

export async function fund(status: Function) {
  console.log("Running deposit");
  if (window.ethereum) {
    try {
      await switchSepoliaNetwork(status);

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const bridge = new ethers.Contract(
        addresses.L1StandardBridgeProxy,
        L1Bridge.abi,
        signer,
      );
      const gasLimit = 130000;
      const deposit = await bridge.bridgeETH(130000, "0x54a11e22", {
        value: ethers.parseEther("0.1"),
      });
      await deposit.wait();

      console.log("deposit successful");
    } catch (error) {
      console.log("error on deposit");
      console.error(error);
    }
  }
}
