import { expect } from "chai";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import type { OwnershipRegistry, AttendanceRegistry } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

function ticketKeyFor(id: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(id));
}

describe("AttendanceRegistry", function () {
  let registry: OwnershipRegistry;
  let attendance: AttendanceRegistry;
  let admin: SignerWithAddress;
  let verifier: SignerWithAddress;
  let venueVerifier: SignerWithAddress;
  let owner: SignerWithAddress;
  let stranger: SignerWithAddress;

  const ticketKey = ticketKeyFor("attendance-ticket-1");
  const tokenId = BigInt(ticketKey);
  const venueHash = ethers.keccak256(ethers.toUtf8Bytes("Lusail Stadium"));

  beforeEach(async () => {
    [admin, verifier, venueVerifier, owner, stranger] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("OwnershipRegistry");
    registry = (await Registry.deploy(admin.address)) as unknown as OwnershipRegistry;
    await registry.connect(admin).grantRole(await registry.VERIFIER_ROLE(), verifier.address);

    const AttendanceFactory = await ethers.getContractFactory("AttendanceRegistry");
    attendance = (await AttendanceFactory.deploy(await registry.getAddress(), admin.address)) as unknown as AttendanceRegistry;
    await registry.connect(admin).grantRole(await registry.ATTENDANCE_ROLE(), await attendance.getAddress());
    await attendance.connect(admin).grantRole(await attendance.VENUE_VERIFIER_ROLE(), venueVerifier.address);

    const vHash = ethers.keccak256(ethers.toUtf8Bytes("verification"));
    const mHash = ethers.keccak256(ethers.toUtf8Bytes("metadata"));
    const qHash = ethers.keccak256(ethers.toUtf8Bytes("qr"));
    await registry.connect(verifier).registerTicket(ticketKey, owner.address, vHash, mHash, qHash);
  });

  it("marks attendance, records the attendee from the registry, and flips registry status", async () => {
    await expect(attendance.connect(venueVerifier).checkIn(tokenId, venueHash))
      .to.emit(attendance, "AttendanceMarked")
      .withArgs(tokenId, owner.address, venueHash, anyValue);

    expect(await attendance.hasAttended(tokenId)).to.equal(true);
    const record = await attendance.attendanceOf(tokenId);
    expect(record.attendee).to.equal(owner.address);
    expect(record.venueHash).to.equal(venueHash);
    expect(await registry.statusOf(tokenId)).to.equal(5); // CheckedIn
  });

  it("rejects duplicate check-in", async () => {
    await attendance.connect(venueVerifier).checkIn(tokenId, venueHash);
    await expect(attendance.connect(venueVerifier).checkIn(tokenId, venueHash)).to.be.revertedWithCustomError(
      attendance,
      "AlreadyAttended"
    );
  });

  it("rejects check-in from a non-venue-verifier", async () => {
    await expect(attendance.connect(stranger).checkIn(tokenId, venueHash)).to.be.revertedWithCustomError(
      attendance,
      "AccessControlUnauthorizedAccount"
    );
  });

  it("rejects check-in on a ticket not yet eligible (e.g. Listed)", async () => {
    // Grant marketplace role to admin just to drive the registry into Listed for this one test.
    await registry.connect(admin).grantRole(await registry.MARKETPLACE_ROLE(), admin.address);
    await registry.connect(admin).markListed(tokenId);
    await expect(attendance.connect(venueVerifier).checkIn(tokenId, venueHash)).to.be.revertedWithCustomError(
      registry,
      "InvalidStatusTransition"
    );
  });
});
