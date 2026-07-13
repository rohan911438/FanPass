// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IEscrowMarketplace} from "./interfaces/IEscrowMarketplace.sol";
import {IOwnershipRegistry} from "./interfaces/IOwnershipRegistry.sol";

/// @title EscrowMarketplace
/// @notice Listing + escrow lifecycle for FanPass Ownership Certificates. One listing has at most one
///         escrow — merges what used to be two separate Escrow/Marketplace contracts, since neither was
///         independently reusable. See docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md §4.
contract EscrowMarketplace is AccessControl, Pausable, ReentrancyGuard, IEscrowMarketplace {
    using SafeERC20 for IERC20;

    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");
    uint64 public constant DISPUTE_WINDOW = 3 days;

    IERC20 public immutable USDC;
    IOwnershipRegistry public immutable REGISTRY;
    IERC721 public immutable REGISTRY_NFT;

    mapping(uint256 listingId => Listing) private _listings;
    mapping(uint256 listingId => Escrow) private _escrows;
    mapping(uint256 tokenId => uint256 listingId) private _activeListingOf;
    mapping(uint256 listingId => uint64) private _disputeRaisedAt;
    uint256 private _nextListingId = 1; // 0 is reserved for "no active listing"

    constructor(address ownershipRegistry, address usdc, address admin) {
        if (ownershipRegistry == address(0) || usdc == address(0) || admin == address(0)) revert ZeroAddress();
        REGISTRY = IOwnershipRegistry(ownershipRegistry);
        REGISTRY_NFT = IERC721(ownershipRegistry);
        USDC = IERC20(usdc);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ---------------------------------------------------------------------
    // Listing lifecycle
    // ---------------------------------------------------------------------

    function createListing(uint256 tokenId, uint256 price, uint64 expiresAt) external whenNotPaused returns (uint256 listingId) {
        if (price == 0) revert ZeroAmount();
        if (REGISTRY_NFT.ownerOf(tokenId) != msg.sender) revert NotOwnerOfToken(tokenId, msg.sender);
        uint256 existing = _activeListingOf[tokenId];
        if (existing != 0) revert DuplicateActiveListing(tokenId, existing);

        listingId = _nextListingId++;
        _listings[listingId] = Listing({
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            createdAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            status: ListingStatus.Active
        });
        _activeListingOf[tokenId] = listingId;

        REGISTRY.markListed(tokenId);

        emit ListingCreated(listingId, tokenId, msg.sender, price, expiresAt);
    }

    function cancelListing(uint256 listingId) external whenNotPaused {
        Listing storage listing = _requireListing(listingId);
        if (listing.status != ListingStatus.Active) revert ListingNotActive(listingId);
        if (listing.seller != msg.sender) revert NotSeller(listingId, msg.sender);

        listing.status = ListingStatus.Cancelled;
        _activeListingOf[listing.tokenId] = 0;
        REGISTRY.markUnlisted(listing.tokenId);

        emit ListingCancelled(listingId);
    }

    function reclaimExpired(uint256 listingId) external whenNotPaused {
        Listing storage listing = _requireListing(listingId);
        if (listing.status != ListingStatus.Active) revert ListingNotActive(listingId);
        if (listing.expiresAt == 0 || block.timestamp < listing.expiresAt) revert ListingNotExpired(listingId);

        listing.status = ListingStatus.Expired;
        _activeListingOf[listing.tokenId] = 0;
        REGISTRY.markUnlisted(listing.tokenId);

        emit ListingExpired(listingId);
    }

    // ---------------------------------------------------------------------
    // Escrow lifecycle
    // ---------------------------------------------------------------------

    function buy(uint256 listingId, uint256 amount) external nonReentrant whenNotPaused {
        Listing storage listing = _requireListing(listingId);
        if (listing.status != ListingStatus.Active) revert ListingNotActive(listingId);
        if (listing.expiresAt != 0 && block.timestamp >= listing.expiresAt) revert ListingExpiredError(listingId);
        if (msg.sender == listing.seller) revert SelfBuyNotAllowed();
        if (amount != listing.price) revert PriceMismatch(listing.price, amount);

        // Effects before interactions: flip state first so a reentrant call sees a non-Active listing.
        listing.status = ListingStatus.PendingEscrow;
        _escrows[listingId] = Escrow({buyer: msg.sender, amount: amount, state: EscrowState.Funded, fundedAt: uint64(block.timestamp)});
        REGISTRY.markInEscrow(listing.tokenId);

        USDC.safeTransferFrom(msg.sender, address(this), amount);

        emit FundsLocked(listingId, msg.sender, amount);
    }

    function releaseEscrow(uint256 listingId) external nonReentrant whenNotPaused {
        Escrow storage escrow = _requireEscrow(listingId);
        if (escrow.state != EscrowState.Funded) revert EscrowNotFunded(listingId);
        _release(listingId);
    }

    /// @dev Deliberately NOT gated by whenNotPaused — pausing must never be able to trap buyer funds.
    function refundBuyer(uint256 listingId) external nonReentrant {
        Listing storage listing = _requireListing(listingId);
        Escrow storage escrow = _requireEscrow(listingId);
        if (listing.seller != msg.sender) revert NotSeller(listingId, msg.sender);
        if (escrow.state != EscrowState.Funded) revert EscrowNotFunded(listingId);
        _refund(listingId);
    }

    // ---------------------------------------------------------------------
    // Disputes
    // ---------------------------------------------------------------------

    function raiseDispute(uint256 listingId, string calldata reason) external whenNotPaused {
        Listing storage listing = _requireListing(listingId);
        Escrow storage escrow = _requireEscrow(listingId);
        if (escrow.state != EscrowState.Funded) revert EscrowNotFunded(listingId);
        if (msg.sender != listing.seller && msg.sender != escrow.buyer) revert NotPartyToListing(listingId, msg.sender);

        escrow.state = EscrowState.Disputed;
        _disputeRaisedAt[listingId] = uint64(block.timestamp);

        emit DisputeRaised(listingId, msg.sender, reason);
    }

    function resolveDispute(uint256 listingId, bool refundToBuyer) external onlyRole(ARBITER_ROLE) nonReentrant whenNotPaused {
        Escrow storage escrow = _requireEscrow(listingId);
        if (escrow.state != EscrowState.Disputed) revert NotDisputed(listingId);

        if (refundToBuyer) {
            _refund(listingId);
        } else {
            _release(listingId);
        }
        emit DisputeResolved(listingId, refundToBuyer);
    }

    /// @notice Safety valve: if a dispute sits unresolved past DISPUTE_WINDOW, anyone can force a
    /// buyer-favorable refund so funds are never permanently stuck on an absent arbiter.
    function forceResolveDispute(uint256 listingId) external nonReentrant whenNotPaused {
        Escrow storage escrow = _requireEscrow(listingId);
        if (escrow.state != EscrowState.Disputed) revert NotDisputed(listingId);
        uint64 readyAt = _disputeRaisedAt[listingId] + DISPUTE_WINDOW;
        if (block.timestamp < readyAt) revert DisputeWindowNotElapsed(listingId, readyAt);

        _refund(listingId);
        emit DisputeResolved(listingId, true);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function listingOf(uint256 tokenId) external view returns (uint256) {
        return _activeListingOf[tokenId];
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return _listings[listingId];
    }

    function getEscrow(uint256 listingId) external view returns (Escrow memory) {
        return _escrows[listingId];
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    function _requireListing(uint256 listingId) private view returns (Listing storage listing) {
        listing = _listings[listingId];
        if (listing.seller == address(0)) revert ListingNotActive(listingId);
    }

    function _requireEscrow(uint256 listingId) private view returns (Escrow storage escrow) {
        escrow = _escrows[listingId];
        if (escrow.buyer == address(0)) revert EscrowNotFunded(listingId);
    }

    function _release(uint256 listingId) private {
        Listing storage listing = _listings[listingId];
        Escrow storage escrow = _escrows[listingId];

        address buyer = escrow.buyer;
        address seller = listing.seller;
        uint256 amount = escrow.amount;
        uint256 tokenId = listing.tokenId;

        escrow.state = EscrowState.Released;
        listing.status = ListingStatus.Sold;
        _activeListingOf[tokenId] = 0;

        REGISTRY.completeSale(tokenId, seller, buyer);
        USDC.safeTransfer(seller, amount);

        emit FundsReleased(listingId, seller, amount);
        emit TicketPurchased(listingId, tokenId, buyer, seller, amount);
    }

    function _refund(uint256 listingId) private {
        Listing storage listing = _listings[listingId];
        Escrow storage escrow = _escrows[listingId];

        address buyer = escrow.buyer;
        uint256 amount = escrow.amount;

        escrow.state = EscrowState.Refunded;
        listing.status = ListingStatus.Cancelled;
        _activeListingOf[listing.tokenId] = 0;

        REGISTRY.markUnlisted(listing.tokenId);
        USDC.safeTransfer(buyer, amount);

        emit BuyerRefunded(listingId, buyer, amount);
    }
}
