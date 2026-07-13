import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ethers } from "ethers";

/**
 * A hardened, manual deployment path for a flaky RPC: k8s.testnet.json-rpc.injective.network never
 * responds to eth_maxPriorityFeePerGas (hangs indefinitely), and — discovered the hard way —
 * eth_getTransactionReceipt/eth_getTransactionByHash are served inconsistently (seemingly a
 * load-balanced multi-node backend with no session affinity: one call's node has never heard of a
 * transaction another node already confirmed). eth_getTransactionCount("latest") and eth_getCode read
 * consistently instead, so confirmation here is: send the raw tx, poll the sender's confirmed nonce
 * until it passes this tx's nonce, then verify success directly — a deploy's address is derived
 * deterministically (CREATE = keccak256(rlp([sender, nonce]))) and checked via eth_getCode; a call's
 * effect is checked via eth_call (e.g. hasRole returns true). Progress is written to
 * deployments/injectiveTestnet.json after every step, so reruns resume instead of redeploying.
 */
const RPC_URL = process.env.INJECTIVE_EVM_TESTNET_RPC ?? "https://k8s.testnet.json-rpc.injective.network/";
const CHAIN_ID = 1439;
const GAS_PRICE = 200_000_000n;
const GAS_LIMIT = 6_000_000n;
const CALL_TIMEOUT_MS = 20_000;
const NONCE_POLL_INTERVAL_MS = 3_000;
const NONCE_POLL_ATTEMPTS = 60; // 3 minutes per transaction
const RPC_RETRY_ATTEMPTS = 5;

interface DeploymentRecord {
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

function readDeployment(network: string): DeploymentRecord | null {
  const file = path.join(DEPLOYMENTS_DIR, `${network}.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf-8"));
}

function writeDeployment(network: string, patch: Partial<DeploymentRecord>): DeploymentRecord {
  if (!existsSync(DEPLOYMENTS_DIR)) mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
  const existing = readDeployment(network) ?? { network, chainId: 0 };
  const merged: DeploymentRecord = { ...existing, ...patch, deployedAt: new Date().toISOString() };
  writeFileSync(path.join(DEPLOYMENTS_DIR, `${network}.json`), JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}

function loadArtifact(contractPath: string, contractName: string): { abi: unknown[]; bytecode: string } {
  const file = path.resolve(__dirname, `../artifacts/contracts/${contractPath}/${contractName}.json`);
  const json = JSON.parse(readFileSync(file, "utf-8"));
  return { abi: json.abi, bytecode: json.bytecode };
}

let rpcId = 1;

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method, params, id: rpcId++ }),
      signal: controller.signal,
    });
    const body = await res.json();
    if (body.error) throw new Error(`RPC error on ${method}: ${JSON.stringify(body.error)}`);
    return body.result as T;
  } finally {
    clearTimeout(timer);
  }
}

async function rpcWithRetry<T>(method: string, params: unknown[], attempts = RPC_RETRY_ATTEMPTS): Promise<T> {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await rpc<T>(method, params);
    } catch (error) {
      lastError = error;
      console.log(`  ${method} attempt ${i}/${attempts} failed: ${(error as Error).message}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw lastError;
}

async function waitForNonceToPass(sender: string, txNonce: number): Promise<void> {
  for (let attempt = 1; attempt <= NONCE_POLL_ATTEMPTS; attempt++) {
    try {
      const confirmed = parseInt(await rpc<string>("eth_getTransactionCount", [sender, "latest"]), 16);
      if (confirmed > txNonce) return;
    } catch (error) {
      console.log(`  nonce poll ${attempt}/${NONCE_POLL_ATTEMPTS} error: ${(error as Error).message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, NONCE_POLL_INTERVAL_MS));
  }
  throw new Error(`Nonce ${txNonce} never confirmed after ${NONCE_POLL_ATTEMPTS} polls — rerun to rebroadcast.`);
}

async function send(wallet: ethers.Wallet, tx: ethers.TransactionRequest, label: string): Promise<void> {
  const signed = await wallet.signTransaction(tx);
  console.log(`${label} (nonce ${tx.nonce})...`);
  const hash = await rpcWithRetry<string>("eth_sendRawTransaction", [signed]);
  console.log(`  tx ${hash}, waiting for nonce to confirm...`);
  await waitForNonceToPass(wallet.address, tx.nonce as number);
  console.log(`  confirmed.`);
}

async function deployContract(
  wallet: ethers.Wallet,
  contractPath: string,
  contractName: string,
  args: unknown[],
  nonce: number
): Promise<string> {
  const { abi, bytecode } = loadArtifact(contractPath, contractName);
  const factory = new ethers.ContractFactory(abi, bytecode);
  const deployTx = await factory.getDeployTransaction(...args);

  const tx: ethers.TransactionRequest = { data: deployTx.data, value: 0n, chainId: CHAIN_ID, nonce, gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT, type: 0 };
  await send(wallet, tx, `Deploying ${contractName}`);

  const address = ethers.getCreateAddress({ from: wallet.address, nonce });
  const code = await rpcWithRetry<string>("eth_getCode", [address, "latest"]);
  if (!code || code === "0x") throw new Error(`${contractName} expected at ${address} but no code found there`);
  console.log(`  ${contractName} verified at ${address}`);
  return address;
}

async function callAndConfirm(
  wallet: ethers.Wallet,
  to: string,
  data: string,
  nonce: number,
  label: string,
  verify: () => Promise<boolean>
): Promise<void> {
  const tx: ethers.TransactionRequest = { to, data, value: 0n, chainId: CHAIN_ID, nonce, gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT, type: 0 };
  await send(wallet, tx, label);
  const ok = await verify();
  if (!ok) throw new Error(`${label} sent and nonce confirmed, but the on-chain effect didn't verify.`);
}

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY not set in apps/contracts/.env");
  const wallet = new ethers.Wallet(privateKey);
  const admin = wallet.address;

  let nonce = parseInt(await rpcWithRetry<string>("eth_getTransactionCount", [admin, "latest"]), 16);
  console.log(`Deployer ${admin}, starting nonce ${nonce}`);

  let record = readDeployment("injectiveTestnet") ?? { network: "injectiveTestnet", chainId: CHAIN_ID };

  if (!record.usdc) {
    record = writeDeployment("injectiveTestnet", { usdc: await deployContract(wallet, "mocks/MockUSDC.sol", "MockUSDC", [], nonce++) });
  } else {
    console.log(`MockUSDC already at ${record.usdc}, skipping.`);
  }

  if (!record.ownershipRegistry) {
    record = writeDeployment("injectiveTestnet", {
      ownershipRegistry: await deployContract(wallet, "OwnershipRegistry.sol", "OwnershipRegistry", [admin], nonce++),
      admin,
    });
  } else {
    console.log(`OwnershipRegistry already at ${record.ownershipRegistry}, skipping.`);
  }

  if (!record.escrowMarketplace) {
    record = writeDeployment("injectiveTestnet", {
      escrowMarketplace: await deployContract(
        wallet,
        "EscrowMarketplace.sol",
        "EscrowMarketplace",
        [record.ownershipRegistry, record.usdc, admin],
        nonce++
      ),
    });
  } else {
    console.log(`EscrowMarketplace already at ${record.escrowMarketplace}, skipping.`);
  }

  if (!record.attendanceRegistry) {
    record = writeDeployment("injectiveTestnet", {
      attendanceRegistry: await deployContract(wallet, "AttendanceRegistry.sol", "AttendanceRegistry", [record.ownershipRegistry, admin], nonce++),
    });
  } else {
    console.log(`AttendanceRegistry already at ${record.attendanceRegistry}, skipping.`);
  }

  if (!record.verifier) {
    const { abi: registryAbi } = loadArtifact("OwnershipRegistry.sol", "OwnershipRegistry");
    const { abi: attendanceAbi } = loadArtifact("AttendanceRegistry.sol", "AttendanceRegistry");
    const registryIface = new ethers.Interface(registryAbi as ethers.InterfaceAbi);
    const attendanceIface = new ethers.Interface(attendanceAbi as ethers.InterfaceAbi);

    const MARKETPLACE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MARKETPLACE_ROLE"));
    const ATTENDANCE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ATTENDANCE_ROLE"));
    const VERIFIER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VERIFIER_ROLE"));
    const VENUE_VERIFIER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VENUE_VERIFIER_ROLE"));

    const hasRole = async (contract: string, iface: ethers.Interface, role: string, account: string): Promise<boolean> => {
      const data = iface.encodeFunctionData("hasRole", [role, account]);
      const result = await rpcWithRetry<string>("eth_call", [{ to: contract, data }, "latest"]);
      return iface.decodeFunctionResult("hasRole", result)[0] as boolean;
    };

    await callAndConfirm(
      wallet,
      record.ownershipRegistry!,
      registryIface.encodeFunctionData("grantRole", [MARKETPLACE_ROLE, record.escrowMarketplace]),
      nonce++,
      "Granting MARKETPLACE_ROLE",
      () => hasRole(record.ownershipRegistry!, registryIface, MARKETPLACE_ROLE, record.escrowMarketplace!)
    );
    await callAndConfirm(
      wallet,
      record.ownershipRegistry!,
      registryIface.encodeFunctionData("grantRole", [ATTENDANCE_ROLE, record.attendanceRegistry]),
      nonce++,
      "Granting ATTENDANCE_ROLE",
      () => hasRole(record.ownershipRegistry!, registryIface, ATTENDANCE_ROLE, record.attendanceRegistry!)
    );
    await callAndConfirm(
      wallet,
      record.ownershipRegistry!,
      registryIface.encodeFunctionData("grantRole", [VERIFIER_ROLE, admin]),
      nonce++,
      "Granting VERIFIER_ROLE",
      () => hasRole(record.ownershipRegistry!, registryIface, VERIFIER_ROLE, admin)
    );
    await callAndConfirm(
      wallet,
      record.attendanceRegistry!,
      attendanceIface.encodeFunctionData("grantRole", [VENUE_VERIFIER_ROLE, admin]),
      nonce++,
      "Granting VENUE_VERIFIER_ROLE",
      () => hasRole(record.attendanceRegistry!, attendanceIface, VENUE_VERIFIER_ROLE, admin)
    );

    writeDeployment("injectiveTestnet", { verifier: admin, venueVerifier: admin });
  } else {
    console.log("Roles already granted, skipping.");
  }

  console.log("\nDeployment complete:");
  console.log(JSON.stringify(readDeployment("injectiveTestnet"), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
