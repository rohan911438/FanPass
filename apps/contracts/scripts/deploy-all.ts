import "dotenv/config";
import { ethers, network } from "hardhat";
import {
  deployAttendanceRegistry,
  deployEscrowMarketplace,
  deployMockUSDC,
  deployOwnershipRegistry,
  grantAllRoles,
  writeDeployment,
} from "./lib";

/**
 * Deploys OwnershipRegistry -> EscrowMarketplace -> AttendanceRegistry, grants every cross-contract
 * role, and writes deployments/<network>.json. Matches docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md §9.1.
 *
 * For this deployment, one wallet (the deployer) holds admin + VERIFIER_ROLE + VENUE_VERIFIER_ROLE —
 * override with TRUST_ENGINE_SIGNER_ADDRESS / VENUE_SIGNER_ADDRESS / ADMIN_ADDRESS to split them later;
 * splitting is a grantRole/revokeRole pair, never a redeploy.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  const admin = process.env.ADMIN_ADDRESS ?? deployer.address;
  const verifierAddress = process.env.TRUST_ENGINE_SIGNER_ADDRESS ?? deployer.address;
  const venueVerifierAddress = process.env.VENUE_SIGNER_ADDRESS ?? deployer.address;

  console.log(`Deploying to network "${network.name}" (chainId ${chainId}) as ${deployer.address}`);
  console.log(`  admin=${admin} verifier=${verifierAddress} venueVerifier=${venueVerifierAddress}`);

  let usdcAddress = process.env.USDC_TOKEN_ADDRESS;
  if (!usdcAddress) {
    console.log("No USDC_TOKEN_ADDRESS set — deploying MockUSDC for this network.");
    const usdc = await deployMockUSDC();
    usdcAddress = await usdc.getAddress();
    console.log(`  MockUSDC deployed at ${usdcAddress}`);
  }

  const registry = await deployOwnershipRegistry(admin);
  const registryAddress = await registry.getAddress();
  console.log(`OwnershipRegistry deployed at ${registryAddress}`);

  const marketplace = await deployEscrowMarketplace(registryAddress, usdcAddress, admin);
  const marketplaceAddress = await marketplace.getAddress();
  console.log(`EscrowMarketplace deployed at ${marketplaceAddress}`);

  const attendance = await deployAttendanceRegistry(registryAddress, admin);
  const attendanceAddress = await attendance.getAddress();
  console.log(`AttendanceRegistry deployed at ${attendanceAddress}`);

  console.log("Granting roles...");
  await grantAllRoles(registry, marketplaceAddress, attendanceAddress, verifierAddress, attendance, venueVerifierAddress);

  const record = writeDeployment(network.name, {
    network: network.name,
    chainId,
    ownershipRegistry: registryAddress,
    escrowMarketplace: marketplaceAddress,
    attendanceRegistry: attendanceAddress,
    usdc: usdcAddress,
    admin,
    verifier: verifierAddress,
    venueVerifier: venueVerifierAddress,
  });

  console.log("\nDeployment complete. Written to deployments/" + network.name + ".json:");
  console.log(JSON.stringify(record, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
