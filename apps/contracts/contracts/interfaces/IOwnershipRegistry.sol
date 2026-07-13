// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title IOwnershipRegistry
/// @notice The single source of truth for "who owns this ticket" and its lifecycle status.
/// @dev Backs an ERC-721 ("Ownership Certificate" to the product, never exposed as "NFT"). Only
///      hashes/status are stored on-chain — see docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md §3.
interface IOwnershipRegistry {
    enum TicketStatus {
        Unregistered,
        Active,
        Listed,
        InEscrow,
        Sold,
        CheckedIn,
        Revoked
    }

    event TicketRegistered(
        uint256 indexed tokenId,
        bytes32 indexed ticketKey,
        address indexed owner,
        bytes32 verificationHash,
        bytes32 metadataHash,
        bytes32 qrHash,
        uint256 timestamp
    );

    event StatusChanged(uint256 indexed tokenId, TicketStatus previousStatus, TicketStatus newStatus, uint256 timestamp);

    event OwnershipTransferred(uint256 indexed tokenId, address indexed from, address indexed to, uint256 timestamp);

    event TicketRevoked(uint256 indexed tokenId, string reason, uint256 timestamp);

    error TicketAlreadyRegistered(bytes32 ticketKey);
    error TicketNotRegistered(uint256 tokenId);
    error InvalidStatusTransition(TicketStatus from, TicketStatus to);
    error TicketIsRevoked(uint256 tokenId);
    error TransferRestricted();
    error ZeroAddress();

    /// @notice Mints an Ownership Certificate for a ticket that has passed off-chain verification.
    /// @param ticketKey keccak256 of the off-chain ticket id — never the id itself.
    /// @return tokenId deterministic: uint256(ticketKey).
    function registerTicket(
        bytes32 ticketKey,
        address owner,
        bytes32 verificationHash,
        bytes32 metadataHash,
        bytes32 qrHash
    ) external returns (uint256 tokenId);

    /// @notice Burns a certificate (fraud found post-mint, dispute lost, etc).
    function revoke(uint256 tokenId, string calldata reason) external;

    function markListed(uint256 tokenId) external;
    function markInEscrow(uint256 tokenId) external;
    function markUnlisted(uint256 tokenId) external;
    function completeSale(uint256 tokenId, address from, address to) external;
    function markCheckedIn(uint256 tokenId) external;

    function statusOf(uint256 tokenId) external view returns (TicketStatus);
    function verificationHashOf(uint256 tokenId) external view returns (bytes32);
    function tokenIdFor(bytes32 ticketKey) external view returns (uint256);
    function isRegistered(bytes32 ticketKey) external view returns (bool);
}
