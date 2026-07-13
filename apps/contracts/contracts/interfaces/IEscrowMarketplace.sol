// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title IEscrowMarketplace
/// @notice Listing + escrow lifecycle for Ownership Certificates. One listing has at most one escrow,
///         exactly like the off-chain marketplaceListings.escrow field always modeled it.
/// @dev See docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md §4 for the full design + why buy()/releaseEscrow()
///      stay two calls instead of one atomic transaction.
interface IEscrowMarketplace {
    enum ListingStatus {
        None,
        Active,
        PendingEscrow,
        Sold,
        Cancelled,
        Expired
    }

    enum EscrowState {
        None,
        Funded,
        Released,
        Refunded,
        Disputed
    }

    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        uint64 createdAt;
        uint64 expiresAt;
        ListingStatus status;
    }

    struct Escrow {
        address buyer;
        uint256 amount;
        EscrowState state;
        uint64 fundedAt;
    }

    event ListingCreated(uint256 indexed listingId, uint256 indexed tokenId, address indexed seller, uint256 price, uint64 expiresAt);
    event ListingCancelled(uint256 indexed listingId);
    event ListingExpired(uint256 indexed listingId);
    event FundsLocked(uint256 indexed listingId, address indexed buyer, uint256 amount);
    event FundsReleased(uint256 indexed listingId, address indexed seller, uint256 amount);
    event BuyerRefunded(uint256 indexed listingId, address indexed buyer, uint256 amount);
    event TicketPurchased(uint256 indexed listingId, uint256 indexed tokenId, address indexed buyer, address seller, uint256 price);
    event DisputeRaised(uint256 indexed listingId, address indexed raisedBy, string reason);
    event DisputeResolved(uint256 indexed listingId, bool refundedToBuyer);

    error ListingNotActive(uint256 listingId);
    error NotSeller(uint256 listingId, address caller);
    error SelfBuyNotAllowed();
    error PriceMismatch(uint256 expected, uint256 provided);
    error DuplicateActiveListing(uint256 tokenId, uint256 existingListingId);
    error ListingExpiredError(uint256 listingId);
    error ListingNotExpired(uint256 listingId);
    error EscrowNotFunded(uint256 listingId);
    error DisputeWindowNotElapsed(uint256 listingId, uint64 readyAt);
    error NotOwnerOfToken(uint256 tokenId, address caller);
    error NotPartyToListing(uint256 listingId, address caller);
    error NotDisputed(uint256 listingId);
    error ZeroAmount();
    error ZeroAddress();

    function createListing(uint256 tokenId, uint256 price, uint64 expiresAt) external returns (uint256 listingId);
    function cancelListing(uint256 listingId) external;
    function reclaimExpired(uint256 listingId) external;

    function buy(uint256 listingId, uint256 amount) external;
    function releaseEscrow(uint256 listingId) external;
    function refundBuyer(uint256 listingId) external;

    function raiseDispute(uint256 listingId, string calldata reason) external;
    function resolveDispute(uint256 listingId, bool refundToBuyer) external;
    function forceResolveDispute(uint256 listingId) external;

    function listingOf(uint256 tokenId) external view returns (uint256 listingId);
    function getListing(uint256 listingId) external view returns (Listing memory);
    function getEscrow(uint256 listingId) external view returns (Escrow memory);
}
