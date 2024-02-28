const addShopNetwork = () =>
  await window.ethereum.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: "0x281b6fc",
        chainName: "SHOP",
        rpcUrls: ["http://165.227.150.52:9545"],
        iconUrls: [],
        nativeCurrency: {
          name: "SHOPeth",
          symbol: "SHOP",
          decimals: 18,
        },
        blockExplorerUrls: [],
      },
    ],
  });

const switchShopNetwork = () =>
  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [
      {
        chainId: "0x281b6fc",
      },
    ],
  });

const addSepoliaNetwork = () =>
  await window.ethereum.request({
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

const switchSepoliaNetwork = () =>
  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [
      {
        chainId: "0xaa36a7",
      },
    ],
  });

/* Sepolia FAUCETS
https://coinbase.com/faucets/ethereum-sepolia-faucet
https://grabteeth.xyz
https://sepolia-faucet.pk910.de/ (PoW powered)
https://faucet-sepolia.rockx.com/
https://faucet.quicknode.com/ethereum/sepolia
https://sepoliafaucet.com/ (Alchemy's free faucet)
https://learnweb3.io/faucets/sepolia (LearnWeb3's free faucet)
*/
