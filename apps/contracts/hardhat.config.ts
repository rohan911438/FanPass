import "dotenv/config";
import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { INJECTIVE_EVM_TESTNET } from "@fanpass/shared";

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // OpenZeppelin 5.1+ uses MCOPY (introduced in Cancun) — Hardhat's default target is Paris.
      evmVersion: "cancun",
    },
  },
  networks: {
    injectiveTestnet: {
      url: process.env.INJECTIVE_EVM_TESTNET_RPC ?? INJECTIVE_EVM_TESTNET.rpcUrl,
      chainId: INJECTIVE_EVM_TESTNET.id,
      accounts: deployerKey ? [deployerKey] : [],
      timeout: 120_000,
      // This RPC never responds to eth_maxPriorityFeePerGas (hangs indefinitely), which breaks ethers
      // v6's automatic EIP-1559 fee estimation. A fixed gasPrice forces legacy (type-0) transactions,
      // which only need eth_gasPrice — confirmed working on this endpoint.
      gasPrice: 200_000_000,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
