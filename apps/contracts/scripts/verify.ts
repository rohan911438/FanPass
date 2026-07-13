import "dotenv/config";
import { run, network } from "hardhat";
import { readDeployment } from "./lib";

/** Verifies all three contracts on Blockscout, reading addresses from deployments/<network>.json. */
async function main() {
  const record = readDeployment(network.name);
  if (!record) throw new Error(`No deployment record for network "${network.name}".`);
  if (!record.ownershipRegistry || !record.escrowMarketplace || !record.attendanceRegistry) {
    throw new Error("Deployment record is missing one or more contract addresses.");
  }

  console.log("Verifying OwnershipRegistry...");
  await run("verify:verify", {
    address: record.ownershipRegistry,
    constructorArguments: [record.admin],
  });

  console.log("Verifying EscrowMarketplace...");
  await run("verify:verify", {
    address: record.escrowMarketplace,
    constructorArguments: [record.ownershipRegistry, record.usdc, record.admin],
  });

  console.log("Verifying AttendanceRegistry...");
  await run("verify:verify", {
    address: record.attendanceRegistry,
    constructorArguments: [record.ownershipRegistry, record.admin],
  });

  console.log("All contracts verified.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
