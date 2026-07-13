import "dotenv/config";
import { ethers, network } from "hardhat";
import type { OwnershipRegistry, AttendanceRegistry } from "../typechain-types";
import { grantAllRoles, readDeployment, writeDeployment } from "./lib";

async function main() {
  const [deployer] = await ethers.getSigners();
  const verifierAddress = process.env.TRUST_ENGINE_SIGNER_ADDRESS ?? deployer.address;
  const venueVerifierAddress = process.env.VENUE_SIGNER_ADDRESS ?? deployer.address;

  const existing = readDeployment(network.name);
  if (!existing?.ownershipRegistry || !existing?.escrowMarketplace || !existing?.attendanceRegistry) {
    throw new Error("Missing one or more contract addresses in deployments/" + network.name + ".json — deploy all three first.");
  }

  const registry = (await ethers.getContractAt("OwnershipRegistry", existing.ownershipRegistry)) as unknown as OwnershipRegistry;
  const attendance = (await ethers.getContractAt(
    "AttendanceRegistry",
    existing.attendanceRegistry
  )) as unknown as AttendanceRegistry;

  await grantAllRoles(registry, existing.escrowMarketplace, existing.attendanceRegistry, verifierAddress, attendance, venueVerifierAddress);
  console.log("Roles granted.");

  writeDeployment(network.name, { verifier: verifierAddress, venueVerifier: venueVerifierAddress });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
