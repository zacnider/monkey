import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const OPERATOR_PRIVATE_KEY = process.env.OPERATOR_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    monadMainnet: {
      url: "https://rpc.monad.xyz",
      chainId: 143,
      accounts: [OPERATOR_PRIVATE_KEY],
    },
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
    cache: "./cache",
  },
  sourcify: {
    enabled: true,
    apiUrl: "https://sourcify-api-monad.blockvision.org",
    browserUrl: "https://monadvision.com",
  },
  etherscan: {
    enabled: true,
    apiKey: {
      monadMainnet: ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: "monadMainnet",
        chainId: 143,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=143",
          browserURL: "https://monadscan.com",
        },
      },
    ],
  },
};

export default config;
