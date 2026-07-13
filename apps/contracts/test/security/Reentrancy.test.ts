import { expect } from "chai";
import { ethers } from "hardhat";
import type { OwnershipRegistry, EscrowMarketplace, MaliciousReentrantERC20 } from "../../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

function ticketKeyFor(id: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(id));
}

const PRICE = 100_000_000n;

describe("Security: reentrancy", function () {
  let registry: OwnershipRegistry;
  let evilToken: MaliciousReentrantERC20;
  let marketplace: EscrowMarketplace;
  let admin: SignerWithAddress;
  let verifier: SignerWithAddress;
  let seller: SignerWithAddress;
  let buyer1: SignerWithAddress;
  let buyer2: SignerWithAddress;

  let tokenId1: bigint;
  let tokenId2: bigint;

  beforeEach(async () => {
    [admin, verifier, seller, buyer1, buyer2] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("OwnershipRegistry");
    registry = (await Registry.deploy(admin.address)) as unknown as OwnershipRegistry;
    await registry.connect(admin).grantRole(await registry.VERIFIER_ROLE(), verifier.address);

    const EvilToken = await ethers.getContractFactory("MaliciousReentrantERC20");
    evilToken = (await EvilToken.deploy()) as unknown as MaliciousReentrantERC20;

    const Marketplace = await ethers.getContractFactory("EscrowMarketplace");
    marketplace = (await Marketplace.deploy(
      await registry.getAddress(),
      await evilToken.getAddress(),
      admin.address
    )) as unknown as EscrowMarketplace;
    await registry.connect(admin).grantRole(await registry.MARKETPLACE_ROLE(), await marketplace.getAddress());

    const mkTicket = async (label: string, owner: string) => {
      const key = ticketKeyFor(label);
      await registry
        .connect(verifier)
        .registerTicket(
          key,
          owner,
          ethers.keccak256(ethers.toUtf8Bytes(`${label}-v`)),
          ethers.keccak256(ethers.toUtf8Bytes(`${label}-m`)),
          ethers.keccak256(ethers.toUtf8Bytes(`${label}-q`))
        );
      return BigInt(key);
    };

    tokenId1 = await mkTicket("evil-1", seller.address);
    tokenId2 = await mkTicket("evil-2", seller.address);

    await evilToken.mint(buyer1.address, PRICE * 10n);
    await evilToken.mint(buyer2.address, PRICE * 10n);
    await evilToken.connect(buyer1).approve(await marketplace.getAddress(), PRICE * 10n);
    await evilToken.connect(buyer2).approve(await marketplace.getAddress(), PRICE * 10n);

    await marketplace.connect(seller).createListing(tokenId1, PRICE, 0);
    await marketplace.connect(seller).createListing(tokenId2, PRICE, 0);
  });

  it("blocks a cross-function reentrant call into releaseEscrow() triggered mid-buy()", async () => {
    // Listing 2 is funded first, normally (token not armed yet).
    await marketplace.connect(buyer2).buy(2n, PRICE);

    // Arm the token: when its transferFrom callback fires during buy(1, ...), it will try to call
    // releaseEscrow(2) on the marketplace — which must be blocked by the shared ReentrancyGuard lock,
    // since buy(1, ...) is still executing.
    const reentrantCalldata = marketplace.interface.encodeFunctionData("releaseEscrow", [2n]);
    await evilToken.arm(await marketplace.getAddress(), reentrantCalldata);

    await expect(marketplace.connect(buyer1).buy(1n, PRICE)).to.be.revertedWithCustomError(
      marketplace,
      "ReentrancyGuardReentrantCall"
    );

    // The whole buy(1, ...) transaction reverted — listing 1 must be untouched.
    const listing1 = await marketplace.getListing(1n);
    expect(listing1.status).to.equal(1); // Active, unchanged
  });
});
