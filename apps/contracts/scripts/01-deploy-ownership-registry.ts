import "dotenv/config";
import { ethers, network } from "hardhat";
import { deployOwnershipRegistry, writeDeployment } from "./lib";

async function main() {
  const [deployer] = await ethers.getSigners();
  const admin = process.env.ADMIN_ADDRESS ?? deployer.address;
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  const registry = await deployOwnershipRegistry(admin);
  const address = await registry.getAddress();
  console.log(`OwnershipRegistry deployed at ${address}`);

  writeDeployment(network.name, { network: network.name, chainId, ownershipRegistry: address, admin });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
