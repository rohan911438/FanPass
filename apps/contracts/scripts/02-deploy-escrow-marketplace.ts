import "dotenv/config";
import { ethers, network } from "hardhat";
import { deployEscrowMarketplace, deployMockUSDC, readDeployment, writeDeployment } from "./lib";

async function main() {
  const [deployer] = await ethers.getSigners();
  const admin = process.env.ADMIN_ADDRESS ?? deployer.address;
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  const existing = readDeployment(network.name);
  const registryAddress = process.env.OWNERSHIP_REGISTRY_ADDRESS ?? existing?.ownershipRegistry;
  if (!registryAddress) {
    throw new Error("No OwnershipRegistry address found — run 01-deploy-ownership-registry.ts first.");
  }

  let usdcAddress = process.env.USDC_TOKEN_ADDRESS ?? existing?.usdc;
  if (!usdcAddress) {
    const usdc = await deployMockUSDC();
    usdcAddress = await usdc.getAddress();
    console.log(`No USDC address configured — deployed MockUSDC at ${usdcAddress}`);
  }

  const marketplace = await deployEscrowMarketplace(registryAddress, usdcAddress, admin);
  const address = await marketplace.getAddress();
  console.log(`EscrowMarketplace deployed at ${address}`);

  writeDeployment(network.name, { network: network.name, chainId, escrowMarketplace: address, usdc: usdcAddress, admin });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
