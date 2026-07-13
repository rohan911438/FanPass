import { expect } from "chai";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import type { OwnershipRegistry, EscrowMarketplace, MockUSDC } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

function ticketKeyFor(id: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(id));
}

const PRICE = 100_000_000n; // 100 mUSDC (6 decimals)

describe("EscrowMarketplace", function () {
  let registry: OwnershipRegistry;
  let usdc: MockUSDC;
  let marketplace: EscrowMarketplace;
  let admin: SignerWithAddress;
  let verifier: SignerWithAddress;
  let arbiter: SignerWithAddress;
  let seller: SignerWithAddress;
  let buyer: SignerWithAddress;
  let stranger: SignerWithAddress;

  let tokenId: bigint;

  async function mintAndFundBuyer() {
    const ticketKey = ticketKeyFor(`ticket-${Math.random()}`);
    tokenId = BigInt(ticketKey);
    const vHash = ethers.keccak256(ethers.toUtf8Bytes("verification"));
    const mHash = ethers.keccak256(ethers.toUtf8Bytes("metadata"));
    const qHash = ethers.keccak256(ethers.toUtf8Bytes("qr"));
    await registry.connect(verifier).registerTicket(ticketKey, seller.address, vHash, mHash, qHash);
    await usdc.mint(buyer.address, PRICE * 10n);
    await usdc.connect(buyer).approve(await marketplace.getAddress(), PRICE * 10n);
  }

  beforeEach(async () => {
    [admin, verifier, arbiter, seller, buyer, stranger] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("OwnershipRegistry");
    registry = (await Registry.deploy(admin.address)) as unknown as OwnershipRegistry;
    await registry.connect(admin).grantRole(await registry.VERIFIER_ROLE(), verifier.address);

    const USDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = (await USDCFactory.deploy()) as unknown as MockUSDC;

    const Marketplace = await ethers.getContractFactory("EscrowMarketplace");
    marketplace = (await Marketplace.deploy(
      await registry.getAddress(),
      await usdc.getAddress(),
      admin.address
    )) as unknown as EscrowMarketplace;

    await registry.connect(admin).grantRole(await registry.MARKETPLACE_ROLE(), await marketplace.getAddress());
    await marketplace.connect(admin).grantRole(await marketplace.ARBITER_ROLE(), arbiter.address);

    await mintAndFundBuyer();
  });

  describe("createListing", () => {
    it("creates an active listing and marks the token Listed on the registry", async () => {
      await expect(marketplace.connect(seller).createListing(tokenId, PRICE, 0))
        .to.emit(marketplace, "ListingCreated")
        .withArgs(1n, tokenId, seller.address, PRICE, 0n);
      expect(await registry.statusOf(tokenId)).to.equal(2); // Listed
    });

    it("rejects a non-owner creating a listing", async () => {
      await expect(marketplace.connect(stranger).createListing(tokenId, PRICE, 0)).to.be.revertedWithCustomError(
        marketplace,
        "NotOwnerOfToken"
      );
    });

    it("rejects zero price", async () => {
      await expect(marketplace.connect(seller).createListing(tokenId, 0, 0)).to.be.revertedWithCustomError(
        marketplace,
        "ZeroAmount"
      );
    });

    it("rejects a duplicate active listing for the same token", async () => {
      await marketplace.connect(seller).createListing(tokenId, PRICE, 0);
      await expect(marketplace.connect(seller).createListing(tokenId, PRICE, 0)).to.be.revertedWithCustomError(
        marketplace,
        "DuplicateActiveListing"
      );
    });
  });

  describe("cancelListing / reclaimExpired", () => {
    it("cancel reverts the token back to Active", async () => {
      await marketplace.connect(seller).createListing(tokenId, PRICE, 0);
      await marketplace.connect(seller).cancelListing(1n);
      expect(await registry.statusOf(tokenId)).to.equal(1); // Active
      expect(await marketplace.listingOf(tokenId)).to.equal(0n);
    });

    it("rejects cancel from a non-seller", async () => {
      await marketplace.connect(seller).createListing(tokenId, PRICE, 0);
      await expect(marketplace.connect(stranger).cancelListing(1n)).to.be.revertedWithCustomError(marketplace, "NotSeller");
    });

    it("reclaimExpired works after expiry, rejects before", async () => {
      const latest = await ethers.provider.getBlock("latest");
      const expiresAt = latest!.timestamp + 100;
      await marketplace.connect(seller).createListing(tokenId, PRICE, expiresAt);

      await expect(marketplace.reclaimExpired(1n)).to.be.revertedWithCustomError(marketplace, "ListingNotExpired");

      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);

      await expect(marketplace.reclaimExpired(1n)).to.emit(marketplace, "ListingExpired");
      expect(await registry.statusOf(tokenId)).to.equal(1); // Active again
    });
  });

  describe("buy / releaseEscrow", () => {
    beforeEach(async () => {
      await marketplace.connect(seller).createListing(tokenId, PRICE, 0);
    });

    it("locks funds and marks the token InEscrow", async () => {
      await expect(marketplace.connect(buyer).buy(1n, PRICE))
        .to.emit(marketplace, "FundsLocked")
        .withArgs(1n, buyer.address, PRICE);
      expect(await registry.statusOf(tokenId)).to.equal(3); // InEscrow
      expect(await usdc.balanceOf(await marketplace.getAddress())).to.equal(PRICE);
    });

    it("rejects self-buy", async () => {
      await usdc.mint(seller.address, PRICE);
      await usdc.connect(seller).approve(await marketplace.getAddress(), PRICE);
      await expect(marketplace.connect(seller).buy(1n, PRICE)).to.be.revertedWithCustomError(marketplace, "SelfBuyNotAllowed");
    });

    it("rejects price mismatch", async () => {
      await expect(marketplace.connect(buyer).buy(1n, PRICE - 1n)).to.be.revertedWithCustomError(marketplace, "PriceMismatch");
    });

    it("rejects a second buy on the same listing (double purchase)", async () => {
      await marketplace.connect(buyer).buy(1n, PRICE);
      await usdc.mint(stranger.address, PRICE);
      await usdc.connect(stranger).approve(await marketplace.getAddress(), PRICE);
      await expect(marketplace.connect(stranger).buy(1n, PRICE)).to.be.revertedWithCustomError(marketplace, "ListingNotActive");
    });

    it("releaseEscrow transfers the certificate and pays the seller", async () => {
      await marketplace.connect(buyer).buy(1n, PRICE);
      const sellerBalanceBefore = await usdc.balanceOf(seller.address);

      await expect(marketplace.releaseEscrow(1n))
        .to.emit(marketplace, "TicketPurchased")
        .withArgs(1n, tokenId, buyer.address, seller.address, PRICE);

      expect(await registry.ownerOf(tokenId)).to.equal(buyer.address);
      expect(await registry.statusOf(tokenId)).to.equal(4); // Sold
      expect(await usdc.balanceOf(seller.address)).to.equal(sellerBalanceBefore + PRICE);
    });

    it("rejects releaseEscrow when escrow isn't funded", async () => {
      await expect(marketplace.releaseEscrow(1n)).to.be.revertedWithCustomError(marketplace, "EscrowNotFunded");
    });
  });

  describe("refundBuyer", () => {
    beforeEach(async () => {
      await marketplace.connect(seller).createListing(tokenId, PRICE, 0);
      await marketplace.connect(buyer).buy(1n, PRICE);
    });

    it("seller can refund a funded escrow", async () => {
      const buyerBalanceBefore = await usdc.balanceOf(buyer.address);
      await expect(marketplace.connect(seller).refundBuyer(1n))
        .to.emit(marketplace, "BuyerRefunded")
        .withArgs(1n, buyer.address, PRICE);
      expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBalanceBefore + PRICE);
      expect(await registry.statusOf(tokenId)).to.equal(1); // back to Active
    });

    it("rejects refund from a non-seller", async () => {
      await expect(marketplace.connect(stranger).refundBuyer(1n)).to.be.revertedWithCustomError(marketplace, "NotSeller");
    });
  });

  describe("disputes", () => {
    beforeEach(async () => {
      await marketplace.connect(seller).createListing(tokenId, PRICE, 0);
      await marketplace.connect(buyer).buy(1n, PRICE);
    });

    it("buyer can raise a dispute; arbiter resolves in buyer's favor (refund)", async () => {
      await expect(marketplace.connect(buyer).raiseDispute(1n, "ticket never delivered")).to.emit(marketplace, "DisputeRaised");

      const buyerBalanceBefore = await usdc.balanceOf(buyer.address);
      await expect(marketplace.connect(arbiter).resolveDispute(1n, true))
        .to.emit(marketplace, "DisputeResolved")
        .withArgs(1n, true);
      expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBalanceBefore + PRICE);
    });

    it("arbiter can resolve in seller's favor (release)", async () => {
      await marketplace.connect(seller).raiseDispute(1n, "buyer disputing in bad faith");
      await marketplace.connect(arbiter).resolveDispute(1n, false);
      expect(await registry.ownerOf(tokenId)).to.equal(buyer.address);
      expect(await registry.statusOf(tokenId)).to.equal(4); // Sold
    });

    it("rejects dispute raised by a non-party", async () => {
      await expect(marketplace.connect(stranger).raiseDispute(1n, "not my business")).to.be.revertedWithCustomError(
        marketplace,
        "NotPartyToListing"
      );
    });

    it("rejects resolveDispute from non-arbiter", async () => {
      await marketplace.connect(buyer).raiseDispute(1n, "reason");
      await expect(marketplace.connect(stranger).resolveDispute(1n, true)).to.be.revertedWithCustomError(
        marketplace,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("forceResolveDispute rejects before the window elapses, succeeds after", async () => {
      await marketplace.connect(buyer).raiseDispute(1n, "reason");
      await expect(marketplace.forceResolveDispute(1n)).to.be.revertedWithCustomError(marketplace, "DisputeWindowNotElapsed");

      await ethers.provider.send("evm_increaseTime", [3 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      const buyerBalanceBefore = await usdc.balanceOf(buyer.address);
      await expect(marketplace.forceResolveDispute(1n)).to.emit(marketplace, "DisputeResolved").withArgs(1n, true);
      expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBalanceBefore + PRICE);
    });
  });

  describe("pausable", () => {
    it("refundBuyer still works while paused (buyers must always be able to exit)", async () => {
      await marketplace.connect(seller).createListing(tokenId, PRICE, 0);
      await marketplace.connect(buyer).buy(1n, PRICE);
      await marketplace.connect(admin).pause();

      const buyerBalanceBefore = await usdc.balanceOf(buyer.address);
      await expect(marketplace.connect(seller).refundBuyer(1n)).to.emit(marketplace, "BuyerRefunded");
      expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBalanceBefore + PRICE);
    });

    it("blocks new listings while paused", async () => {
      await marketplace.connect(admin).pause();
      await expect(marketplace.connect(seller).createListing(tokenId, PRICE, 0)).to.be.revertedWithCustomError(
        marketplace,
        "EnforcedPause"
      );
    });
  });
});
