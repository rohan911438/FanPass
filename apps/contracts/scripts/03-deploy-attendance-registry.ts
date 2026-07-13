import "dotenv/config";
import { ethers, network } from "hardhat";
import { deployAttendanceRegistry, readDeployment, writeDeployment } from "./lib";

async function main() {
  const [deployer] = await ethers.getSigners();
  const admin = process.env.ADMIN_ADDRESS ?? deployer.address;
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  const existing = readDeployment(network.name);
  const registryAddress = process.env.OWNERSHIP_REGISTRY_ADDRESS ?? existing?.ownershipRegistry;
  if (!registryAddress) {
    throw new Error("No OwnershipRegistry address found — run 01-deploy-ownership-registry.ts first.");
  }

  const attendance = await deployAttendanceRegistry(registryAddress, admin);
  const address = await attendance.getAddress();
  console.log(`AttendanceRegistry deployed at ${address}`);

  writeDeployment(network.name, { network: network.name, chainId, attendanceRegistry: address, admin });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
