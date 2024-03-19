import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import L1StandardBridge from "./L1StandardBridge";

const shopChain = {
  chainId: "0x281b6fc",
  chainName: "SHOP",
  rpcUrls: ["https://rpc.op-sepolia.shutter.network"],
  iconUrls: ["https://demo.op-sepolia.shutter.network/icon-192.png"],
  nativeCurrency: {
    name: "SHOPeth",
    symbol: "SHOP",
    decimals: 18,
  },
  blockExplorerUrls: null,
};

export const sepoliaChain = {
  chainId: "0xaa36a7",
  chainName: "Sepolia",
  rpcUrls: [
    "https://rpc.sepolia.org/",
    "https://rpc2.sepolia.org/",
    "https://ethereum-sepolia-rpc.publicnode.com",
  ],
  iconUrls: [],
  nativeCurrency: {
    name: "SEP",
    symbol: "SEP",
    decimals: 18,
  },
  blockExplorerUrls: ["https://sepolia.etherscan.io/"],
};

export async function checkL1Balance(
  status: Function,
  account: address,
): Promise<number> {
  return await checkBalance(sepoliaChain.rpcUrls[0], status, account);
}

export async function checkL2Balance(
  status: Function,
  account: address,
): Promise<number> {
  return await checkBalance(shopChain.rpcUrls[0], status, account);
}

async function checkBalance(
  rpc: string,
  status: Function,
  account: address,
): Promise<number> {
  const provider = new JsonRpcProvider(rpc);
  let balance = await provider.getBalance(account);
  return balance;
}

export async function checkOnboarding(status: Function): Promise<boolean | undefined> {
  if (!window.ethereum) {
    status("No Wallet provider!");
    return false;
  }
  try {
    const switched = await switchShopNetwork(status);
    console.log(switched);
  } catch (error) {
    console.log(JSON.stringify(error));
    if (error.code === 4902 || error.data?.originalError?.code === 4902) {
      status("SHOP network not known. We will now ask to add it!");
      try {
        const added = await addShopNetwork(status);
      } catch (error) {
        status("unrecoverable error:", JSON.stringify(error));
        console.error(error);
        return false;
      }
      await switchShopNetwork(status);
      status("You're now connected to SHOP network!");
      return true;
    } else {
      status("switching to SHOP network failed:", JSON.stringify(error));
      console.error(error);
      return false;
    }
  }
}

async function addShopNetwork(status: Function) {
  return await window.ethereum.request({
    method: "wallet_addEthereumChain",
    params: [shopChain],
  });
}

export async function switchShopNetwork(status: Function) {
  const currentChain = await window.ethereum.request({ method: "eth_chainId" });
  if (currentChain != shopChain.chainId) {
    status("Trying to switch to SHOP network, please allow in wallet.");
    return await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: shopChain.chainId }],
    });
    status("Ready.");
  }
}

async function addSepoliaNetwork(status: Function) {
  return await window.ethereum.request({
    method: "wallet_addEthereumChain",
    params: [sepoliaChain],
  });
}

export async function switchSepoliaNetwork(status: Function) {
  const currentChain = await window.ethereum.request({ method: "eth_chainId" });
  if (currentChain != sepoliaChain.chainId) {
    status("Trying to switch to Sepolia network, please allow in wallet.");
    try {
      return await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: sepoliaChain.chainId }],
      });
    } catch (error) {
      status("!switching to Sepolia network failed:", JSON.stringify(error));
      console.error(error);
      return false;
    }

  }
}

export async function queryL1(status: Function) {
  if (window.ethereum) {
    await switchSepoliaNetwork(status);
    const provider = new BrowserProvider(window.ethereum);
    const l1StandardBridge = new Contract(
      "0x00000000000000000000000000000000",
      L1StandardBridge.abi,
      provider,
    );
    return [provider, l1StandardBridge];
  }
}

/* Sepolia FAUCETS
https://coinbase.com/faucets/ethereum-sepolia-faucet
https://grabteeth.xyz
https://sepolia-faucet.pk910.de/ (PoW powered)
https://faucet-sepolia.rockx.com/
https://faucet.quicknode.com/ethereum/sepolia
https://sepoliafaucet.com/ (Alchemy's free faucet)
https://learnweb3.io/faucets/sepolia (LearnWeb3's free faucet)
*/
