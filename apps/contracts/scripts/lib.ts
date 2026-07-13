import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ethers } from "hardhat";
import type { OwnershipRegistry, EscrowMarketplace, AttendanceRegistry, MockUSDC } from "../typechain-types";

export interface DeploymentRecord {
  network: string;
  chainId: number;
  ownershipRegistry?: string;
  escrowMarketplace?: string;
  attendanceRegistry?: string;
  usdc?: string;
  admin?: string;
  verifier?: string;
  venueVerifier?: string;
  deployedAt?: string;
}

const DEPLOYMENTS_DIR = path.resolve(__dirname, "../deployments");

export function readDeployment(network: string): DeploymentRecord | null {
  const file = path.join(DEPLOYMENTS_DIR, `${network}.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf-8"));
}

export function writeDeployment(network: string, patch: Partial<DeploymentRecord>): DeploymentRecord {
  if (!existsSync(DEPLOYMENTS_DIR)) mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
  const existing = readDeployment(network) ?? { network, chainId: 0 };
  const merged: DeploymentRecord = { ...existing, ...patch, deployedAt: new Date().toISOString() };
  writeFileSync(path.join(DEPLOYMENTS_DIR, `${network}.json`), JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}

export async function deployMockUSDC(): Promise<MockUSDC> {
  const Factory = await ethers.getContractFactory("MockUSDC");
  const usdc = (await Factory.deploy()) as unknown as MockUSDC;
  await usdc.waitForDeployment();
  return usdc;
}

export async function deployOwnershipRegistry(admin: string): Promise<OwnershipRegistry> {
  const Factory = await ethers.getContractFactory("OwnershipRegistry");
  const registry = (await Factory.deploy(admin)) as unknown as OwnershipRegistry;
  await registry.waitForDeployment();
  return registry;
}

export async function deployEscrowMarketplace(
  registryAddress: string,
  usdcAddress: string,
  admin: string
): Promise<EscrowMarketplace> {
  const Factory = await ethers.getContractFactory("EscrowMarketplace");
  const marketplace = (await Factory.deploy(registryAddress, usdcAddress, admin)) as unknown as EscrowMarketplace;
  await marketplace.waitForDeployment();
  return marketplace;
}

export async function deployAttendanceRegistry(registryAddress: string, admin: string): Promise<AttendanceRegistry> {
  const Factory = await ethers.getContractFactory("AttendanceRegistry");
  const attendance = (await Factory.deploy(registryAddress, admin)) as unknown as AttendanceRegistry;
  await attendance.waitForDeployment();
  return attendance;
}

export async function grantAllRoles(
  registry: OwnershipRegistry,
  marketplaceAddress: string,
  attendanceAddress: string,
  verifierAddress: string,
  attendanceContract: AttendanceRegistry,
  venueVerifierAddress: string
): Promise<void> {
  await (await registry.grantRole(await registry.MARKETPLACE_ROLE(), marketplaceAddress)).wait();
  await (await registry.grantRole(await registry.ATTENDANCE_ROLE(), attendanceAddress)).wait();
  await (await registry.grantRole(await registry.VERIFIER_ROLE(), verifierAddress)).wait();
  await (await attendanceContract.grantRole(await attendanceContract.VENUE_VERIFIER_ROLE(), venueVerifierAddress)).wait();
}
