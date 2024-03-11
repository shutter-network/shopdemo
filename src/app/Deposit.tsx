import { ethers } from "ethers";
import L1Bridge from "./L1StandardBridge";
import addresses from "./addresses";
import {
  sepoliaChain,
  switchSepoliaNetwork,
  switchShopNetwork,
} from "./Onboarding";

export async function switchAndDeposit(amount: number, status: Function) {
  console.log("Running deposit");
  if (window.ethereum) {
    try {
      await switchSepoliaNetwork(status);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const bridge = new ethers.Contract(
        addresses.L1StandardBridgeProxy,
        L1Bridge.abi,
        signer,
      );
      const gasLimit = 130000;
      const deposit = await bridge.depositETH(130000, "0x54a11e22", {
        value: amount,
      });
      await deposit.wait();

      console.log("deposit successful");
      await switchShopNetwork(status);
    } catch (error) {
      console.log("error on deposit");
      console.error(error);
    }
  }
}
