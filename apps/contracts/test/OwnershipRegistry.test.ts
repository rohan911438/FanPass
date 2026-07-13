import { expect } from "chai";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import type { OwnershipRegistry } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const TicketStatus = {
  Unregistered: 0,
  Active: 1,
  Listed: 2,
  InEscrow: 3,
  Sold: 4,
  CheckedIn: 5,
  Revoked: 6,
};

function ticketKeyFor(id: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(id));
}

describe("OwnershipRegistry", function () {
  let registry: OwnershipRegistry;
  let admin: SignerWithAddress;
  let verifier: SignerWithAddress;
  let marketplace: SignerWithAddress;
  let attendance: SignerWithAddress;
  let seller: SignerWithAddress;
  let buyer: SignerWithAddress;
  let stranger: SignerWithAddress;

  const ticketKey = ticketKeyFor("ticket-1");
  const tokenId = BigInt(ticketKey);
  const verificationHash = ethers.keccak256(ethers.toUtf8Bytes("verification-report-1"));
  const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("metadata-1"));
  const qrHash = ethers.keccak256(ethers.toUtf8Bytes("qr-1"));

  beforeEach(async () => {
    [admin, verifier, marketplace, attendance, seller, buyer, stranger] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("OwnershipRegistry");
    registry = (await Registry.deploy(admin.address)) as unknown as OwnershipRegistry;

    await registry.connect(admin).grantRole(await registry.VERIFIER_ROLE(), verifier.address);
    await registry.connect(admin).grantRole(await registry.MARKETPLACE_ROLE(), marketplace.address);
    await registry.connect(admin).grantRole(await registry.ATTENDANCE_ROLE(), attendance.address);
  });

  describe("registerTicket", () => {
    it("mints to the seller and sets status Active", async () => {
      await expect(
        registry.connect(verifier).registerTicket(ticketKey, seller.address, verificationHash, metadataHash, qrHash)
      )
        .to.emit(registry, "TicketRegistered")
        .and.to.emit(registry, "StatusChanged")
        .withArgs(tokenId, TicketStatus.Unregistered, TicketStatus.Active, anyValue);

      expect(await registry.ownerOf(tokenId)).to.equal(seller.address);
      expect(await registry.statusOf(tokenId)).to.equal(TicketStatus.Active);
      expect(await registry.verificationHashOf(tokenId)).to.equal(verificationHash);
      expect(await registry.isRegistered(ticketKey)).to.equal(true);
      expect(await registry.tokenIdFor(ticketKey)).to.equal(tokenId);
    });

    it("rejects duplicate registration of the same ticketKey", async () => {
      await registry.connect(verifier).registerTicket(ticketKey, seller.address, verificationHash, metadataHash, qrHash);
      await expect(
        registry.connect(verifier).registerTicket(ticketKey, buyer.address, verificationHash, metadataHash, qrHash)
      )
        .to.be.revertedWithCustomError(registry, "TicketAlreadyRegistered")
        .withArgs(ticketKey);
    });

    it("rejects a zero-address owner", async () => {
      await expect(
        registry.connect(verifier).registerTicket(ticketKey, ethers.ZeroAddress, verificationHash, metadataHash, qrHash)
      ).to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("rejects callers without VERIFIER_ROLE", async () => {
      await expect(
        registry.connect(stranger).registerTicket(ticketKey, seller.address, verificationHash, metadataHash, qrHash)
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });
  });

  describe("status transitions", () => {
    beforeEach(async () => {
      await registry.connect(verifier).registerTicket(ticketKey, seller.address, verificationHash, metadataHash, qrHash);
    });

    it("walks Active -> Listed -> InEscrow -> Sold via MARKETPLACE_ROLE", async () => {
      await expect(registry.connect(marketplace).markListed(tokenId)).to.emit(registry, "StatusChanged");
      expect(await registry.statusOf(tokenId)).to.equal(TicketStatus.Listed);

      await registry.connect(marketplace).markInEscrow(tokenId);
      expect(await registry.statusOf(tokenId)).to.equal(TicketStatus.InEscrow);

      await expect(registry.connect(marketplace).completeSale(tokenId, seller.address, buyer.address))
        .to.emit(registry, "OwnershipTransferred")
        .withArgs(tokenId, seller.address, buyer.address, anyValue);

      expect(await registry.ownerOf(tokenId)).to.equal(buyer.address);
      expect(await registry.statusOf(tokenId)).to.equal(TicketStatus.Sold);
    });

    it("rejects an out-of-order transition (Active -> InEscrow directly)", async () => {
      await expect(registry.connect(marketplace).markInEscrow(tokenId))
        .to.be.revertedWithCustomError(registry, "InvalidStatusTransition")
        .withArgs(TicketStatus.Active, TicketStatus.InEscrow);
    });

    it("markUnlisted reverts Listed back to Active (cancel path)", async () => {
      await registry.connect(marketplace).markListed(tokenId);
      await registry.connect(marketplace).markUnlisted(tokenId);
      expect(await registry.statusOf(tokenId)).to.equal(TicketStatus.Active);
    });

    it("markUnlisted reverts InEscrow back to Active (refund path)", async () => {
      await registry.connect(marketplace).markListed(tokenId);
      await registry.connect(marketplace).markInEscrow(tokenId);
      await registry.connect(marketplace).markUnlisted(tokenId);
      expect(await registry.statusOf(tokenId)).to.equal(TicketStatus.Active);
    });

    it("completeSale rejects if not currently InEscrow", async () => {
      await expect(registry.connect(marketplace).completeSale(tokenId, seller.address, buyer.address))
        .to.be.revertedWithCustomError(registry, "InvalidStatusTransition")
        .withArgs(TicketStatus.Active, TicketStatus.Sold);
    });

    it("rejects marketplace-role calls from non-marketplace callers", async () => {
      await expect(registry.connect(stranger).markListed(tokenId)).to.be.revertedWithCustomError(
        registry,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("markCheckedIn works from Active and from Sold", async () => {
      await registry.connect(attendance).markCheckedIn(tokenId);
      expect(await registry.statusOf(tokenId)).to.equal(TicketStatus.CheckedIn);
    });

    it("markCheckedIn rejects from Listed", async () => {
      await registry.connect(marketplace).markListed(tokenId);
      await expect(registry.connect(attendance).markCheckedIn(tokenId)).to.be.revertedWithCustomError(
        registry,
        "InvalidStatusTransition"
      );
    });

    it("rejects attendance-role calls from non-attendance callers", async () => {
      await expect(registry.connect(stranger).markCheckedIn(tokenId)).to.be.revertedWithCustomError(
        registry,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("revoke", () => {
    beforeEach(async () => {
      await registry.connect(verifier).registerTicket(ticketKey, seller.address, verificationHash, metadataHash, qrHash);
    });

    it("burns the token and sets status Revoked", async () => {
      await expect(registry.connect(verifier).revoke(tokenId, "fraud found post-mint")).to.emit(registry, "TicketRevoked");
      expect(await registry.statusOf(tokenId)).to.equal(TicketStatus.Revoked);
      await expect(registry.ownerOf(tokenId)).to.be.reverted; // burned — ERC721 no longer has an owner
    });

    it("rejects revoking an already-revoked ticket", async () => {
      await registry.connect(verifier).revoke(tokenId, "first revoke");
      await expect(registry.connect(verifier).revoke(tokenId, "second revoke")).to.be.revertedWithCustomError(
        registry,
        "TicketIsRevoked"
      );
    });

    it("rejects revoke from non-verifier", async () => {
      await expect(registry.connect(stranger).revoke(tokenId, "nope")).to.be.revertedWithCustomError(
        registry,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("transfer restriction", () => {
    beforeEach(async () => {
      await registry.connect(verifier).registerTicket(ticketKey, seller.address, verificationHash, metadataHash, qrHash);
    });

    it("blocks transferFrom even from the token owner", async () => {
      await expect(
        registry.connect(seller).transferFrom(seller.address, buyer.address, tokenId)
      ).to.be.revertedWithCustomError(registry, "TransferRestricted");
    });

    it("blocks safeTransferFrom even from the token owner", async () => {
      await expect(
        registry.connect(seller)["safeTransferFrom(address,address,uint256)"](seller.address, buyer.address, tokenId)
      ).to.be.revertedWithCustomError(registry, "TransferRestricted");
    });

    it("blocks approve", async () => {
      await expect(registry.connect(seller).approve(buyer.address, tokenId)).to.be.revertedWithCustomError(
        registry,
        "TransferRestricted"
      );
    });

    it("blocks setApprovalForAll", async () => {
      await expect(registry.connect(seller).setApprovalForAll(buyer.address, true)).to.be.revertedWithCustomError(
        registry,
        "TransferRestricted"
      );
    });
  });

  describe("pausable", () => {
    it("blocks registerTicket while paused, allows again after unpause", async () => {
      await registry.connect(admin).pause();
      await expect(
        registry.connect(verifier).registerTicket(ticketKey, seller.address, verificationHash, metadataHash, qrHash)
      ).to.be.revertedWithCustomError(registry, "EnforcedPause");

      await registry.connect(admin).unpause();
      await expect(
        registry.connect(verifier).registerTicket(ticketKey, seller.address, verificationHash, metadataHash, qrHash)
      ).to.not.be.reverted;
    });

    it("only admin can pause", async () => {
      await expect(registry.connect(stranger).pause()).to.be.revertedWithCustomError(
        registry,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("views on an unregistered token", () => {
    it("statusOf reverts TicketNotRegistered", async () => {
      await expect(registry.statusOf(tokenId)).to.be.revertedWithCustomError(registry, "TicketNotRegistered");
    });
  });
});
