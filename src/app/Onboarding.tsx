export async function checkOnboarding() {
  if (!window.ethereum) {
    alert("No Wallet provider!");
    return false;
  }
  try {
    const switched = await switchShopNetwork();
    console.log(switched);
  } catch (error) {
    console.log(JSON.stringify(error));
    if (error.code === 4902 || error.data?.originalError?.code === 4902) {
      alert("SHOP network not known. We will now ask to add it!");
      try {
        const added = await addShopNetwork();
      } catch (error) {
        alert("unrecoverable error:", JSON.stringify(error));
        console.error(error);
        return false;
      }
      await switchShopNetwork();
    } else {
      alert("switching to SHOP network failed:", JSON.stringify(error));
      console.error(error);
    }
  }
}

async function addShopNetwork() {
  return await window.ethereum.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: "0x281b6fc",
        chainName: "SHOP",
        rpcUrls: ["https://rpc.sepolia.staging.shutter.network"],
        iconUrls: ["https://demo.sepolia.staging.shutter.network/icon-192.png"],
        nativeCurrency: {
          name: "SHOPeth",
          symbol: "SHOP",
          decimals: 18,
        },
        blockExplorerUrls: null,
      },
    ],
  });
}

async function switchShopNetwork() {
  alert("Trying to switch to SHOP network, please allow in wallet.");
  return await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [
      {
        chainId: "0x281b6fc",
      },
    ],
  });
}

async function addSepoliaNetwork() {
  return await window.ethereum.request({
    method: "wallet_addEthereumChain",
    params: [
      {
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
      },
    ],
  });
}

async function switchSepoliaNetwork() {
  return await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [
      {
        chainId: "0xaa36a7",
      },
    ],
  });
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
