import { expect } from "chai";
import { ethers } from "hardhat";
import type { OwnershipRegistry, EscrowMarketplace, AttendanceRegistry, MockUSDC } from "../../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

function ticketKeyFor(id: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(id));
}

const PRICE = 250_000_000n; // 250 mUSDC

describe("Integration: register -> list -> buy -> release -> check in", function () {
  let registry: OwnershipRegistry;
  let marketplace: EscrowMarketplace;
  let attendanceRegistry: AttendanceRegistry;
  let usdc: MockUSDC;

  let admin: SignerWithAddress;
  let verifier: SignerWithAddress;
  let venueVerifier: SignerWithAddress;
  let seller: SignerWithAddress;
  let buyer: SignerWithAddress;

  const ticketKey = ticketKeyFor("integration-ticket-1");
  const tokenId = BigInt(ticketKey);

  it("walks the entire trust layer for one ticket, asserting state at every step", async () => {
    [admin, verifier, venueVerifier, seller, buyer] = await ethers.getSigners();

    // --- Deploy all three, wire roles, exactly per the deployment architecture (§9.1) ---
    const Registry = await ethers.getContractFactory("OwnershipRegistry");
    registry = (await Registry.deploy(admin.address)) as unknown as OwnershipRegistry;

    const USDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = (await USDCFactory.deploy()) as unknown as MockUSDC;

    const Marketplace = await ethers.getContractFactory("EscrowMarketplace");
    marketplace = (await Marketplace.deploy(
      await registry.getAddress(),
      await usdc.getAddress(),
      admin.address
    )) as unknown as EscrowMarketplace;

    const AttendanceFactory = await ethers.getContractFactory("AttendanceRegistry");
    attendanceRegistry = (await AttendanceFactory.deploy(await registry.getAddress(), admin.address)) as unknown as AttendanceRegistry;

    await registry.connect(admin).grantRole(await registry.MARKETPLACE_ROLE(), await marketplace.getAddress());
    await registry.connect(admin).grantRole(await registry.ATTENDANCE_ROLE(), await attendanceRegistry.getAddress());
    await registry.connect(admin).grantRole(await registry.VERIFIER_ROLE(), verifier.address);
    await attendanceRegistry.connect(admin).grantRole(await attendanceRegistry.VENUE_VERIFIER_ROLE(), venueVerifier.address);

    // --- 1. Verify -> mint (Trust Engine calls registerTicket after off-chain verification passes) ---
    const verificationHash = ethers.keccak256(ethers.toUtf8Bytes("verification-report"));
    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("event-metadata"));
    const qrHash = ethers.keccak256(ethers.toUtf8Bytes("qr-fingerprint"));

    await registry.connect(verifier).registerTicket(ticketKey, seller.address, verificationHash, metadataHash, qrHash);
    expect(await registry.ownerOf(tokenId)).to.equal(seller.address);
    expect(await registry.statusOf(tokenId)).to.equal(1); // Active

    // --- 2. List ---
    await marketplace.connect(seller).createListing(tokenId, PRICE, 0);
    expect(await registry.statusOf(tokenId)).to.equal(2); // Listed
    expect(await marketplace.listingOf(tokenId)).to.equal(1n);

    // --- 3. Buy (funds escrow) ---
    await usdc.mint(buyer.address, PRICE);
    await usdc.connect(buyer).approve(await marketplace.getAddress(), PRICE);
    await marketplace.connect(buyer).buy(1n, PRICE);
    expect(await registry.statusOf(tokenId)).to.equal(3); // InEscrow
    const escrow = await marketplace.getEscrow(1n);
    expect(escrow.state).to.equal(1); // Funded

    // --- 4. Release (ownership + funds settle together) ---
    const sellerBalanceBefore = await usdc.balanceOf(seller.address);
    await marketplace.releaseEscrow(1n);
    expect(await registry.ownerOf(tokenId)).to.equal(buyer.address);
    expect(await registry.statusOf(tokenId)).to.equal(4); // Sold
    expect(await usdc.balanceOf(seller.address)).to.equal(sellerBalanceBefore + PRICE);

    // --- 5. Venue check-in ---
    const venueHash = ethers.keccak256(ethers.toUtf8Bytes("Lusail Stadium, Doha"));
    await expect(attendanceRegistry.connect(venueVerifier).checkIn(tokenId, venueHash)).to.emit(
      attendanceRegistry,
      "AttendanceMarked"
    );
    expect(await registry.statusOf(tokenId)).to.equal(5); // CheckedIn
    expect(await attendanceRegistry.hasAttended(tokenId)).to.equal(true);
    const record = await attendanceRegistry.attendanceOf(tokenId);
    expect(record.attendee).to.equal(buyer.address); // the NEW owner, not the original seller
  });
});
