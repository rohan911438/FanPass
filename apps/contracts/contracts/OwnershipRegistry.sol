// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IOwnershipRegistry} from "./interfaces/IOwnershipRegistry.sol";

/// @title OwnershipRegistry
/// @notice The ledger of truth for who owns a FanPass ticket and its lifecycle status. An ERC-721 under
///         the hood ("Ownership Certificate" to the product — never exposed to users as "NFT").
/// @dev Only hashes, an address, an enum, and timestamps are stored — no images, OCR output, trust
///      scores, or pricing. See docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md §3 for the full rationale.
///
///      Transfers are restricted: the only ways a token moves are registerTicket (mint), completeSale
///      (called by MARKETPLACE_ROLE), and revoke (burn). Standard ERC-721 transferFrom/safeTransferFrom/
///      approve/setApprovalForAll are permanently disabled so on-chain status can never desync from
///      actual ownership.
contract OwnershipRegistry is ERC721, AccessControl, Pausable, IOwnershipRegistry {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");
    bytes32 public constant ATTENDANCE_ROLE = keccak256("ATTENDANCE_ROLE");

    struct TicketRecord {
        bytes32 verificationHash;
        bytes32 metadataHash;
        bytes32 qrHash;
        TicketStatus status;
        uint64 mintedAt;
        uint64 updatedAt;
    }

    mapping(uint256 tokenId => TicketRecord) private _records;
    mapping(bytes32 ticketKey => bool) private _registered;

    constructor(address admin) ERC721("FanPass Ownership Certificate", "FANPASS-OC") {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ---------------------------------------------------------------------
    // Verifier-gated: mint / revoke
    // ---------------------------------------------------------------------

    function registerTicket(
        bytes32 ticketKey,
        address owner,
        bytes32 verificationHash,
        bytes32 metadataHash,
        bytes32 qrHash
    ) external onlyRole(VERIFIER_ROLE) whenNotPaused returns (uint256 tokenId) {
        if (owner == address(0)) revert ZeroAddress();
        if (_registered[ticketKey]) revert TicketAlreadyRegistered(ticketKey);

        tokenId = uint256(ticketKey);
        _registered[ticketKey] = true;

        uint64 nowTs = uint64(block.timestamp);
        _records[tokenId] = TicketRecord({
            verificationHash: verificationHash,
            metadataHash: metadataHash,
            qrHash: qrHash,
            status: TicketStatus.Active,
            mintedAt: nowTs,
            updatedAt: nowTs
        });

        _safeMint(owner, tokenId);

        emit TicketRegistered(tokenId, ticketKey, owner, verificationHash, metadataHash, qrHash, nowTs);
        emit StatusChanged(tokenId, TicketStatus.Unregistered, TicketStatus.Active, nowTs);
    }

    function revoke(uint256 tokenId, string calldata reason) external onlyRole(VERIFIER_ROLE) {
        TicketRecord storage record = _requireRegistered(tokenId);
        if (record.status == TicketStatus.Revoked) revert TicketIsRevoked(tokenId);

        TicketStatus previous = record.status;
        record.status = TicketStatus.Revoked;
        record.updatedAt = uint64(block.timestamp);

        _update(address(0), tokenId, address(0));

        emit StatusChanged(tokenId, previous, TicketStatus.Revoked, block.timestamp);
        emit TicketRevoked(tokenId, reason, block.timestamp);
    }

    // ---------------------------------------------------------------------
    // Marketplace-gated: listing/escrow/sale status transitions
    // ---------------------------------------------------------------------

    function markListed(uint256 tokenId) external onlyRole(MARKETPLACE_ROLE) whenNotPaused {
        _transitionStatus(tokenId, TicketStatus.Active, TicketStatus.Listed);
    }

    function markInEscrow(uint256 tokenId) external onlyRole(MARKETPLACE_ROLE) whenNotPaused {
        _transitionStatus(tokenId, TicketStatus.Listed, TicketStatus.InEscrow);
    }

    /// @notice Reverts a listing back to Active — used for cancel, expiry, and refund paths alike.
    function markUnlisted(uint256 tokenId) external onlyRole(MARKETPLACE_ROLE) whenNotPaused {
        TicketRecord storage record = _requireRegistered(tokenId);
        if (record.status != TicketStatus.Listed && record.status != TicketStatus.InEscrow) {
            revert InvalidStatusTransition(record.status, TicketStatus.Active);
        }
        _setStatus(tokenId, record.status, TicketStatus.Active);
    }

    function completeSale(uint256 tokenId, address from, address to) external onlyRole(MARKETPLACE_ROLE) whenNotPaused {
        if (to == address(0)) revert ZeroAddress();
        TicketRecord storage record = _requireRegistered(tokenId);
        if (record.status != TicketStatus.InEscrow) revert InvalidStatusTransition(record.status, TicketStatus.Sold);
        if (ownerOf(tokenId) != from) revert TransferRestricted();

        _update(to, tokenId, address(0));
        _setStatus(tokenId, TicketStatus.InEscrow, TicketStatus.Sold);

        emit OwnershipTransferred(tokenId, from, to, block.timestamp);
    }

    // ---------------------------------------------------------------------
    // Attendance-gated
    // ---------------------------------------------------------------------

    function markCheckedIn(uint256 tokenId) external onlyRole(ATTENDANCE_ROLE) whenNotPaused {
        TicketRecord storage record = _requireRegistered(tokenId);
        if (record.status != TicketStatus.Active && record.status != TicketStatus.Sold) {
            revert InvalidStatusTransition(record.status, TicketStatus.CheckedIn);
        }
        _setStatus(tokenId, record.status, TicketStatus.CheckedIn);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function statusOf(uint256 tokenId) external view returns (TicketStatus) {
        return _requireRegisteredView(tokenId).status;
    }

    function verificationHashOf(uint256 tokenId) external view returns (bytes32) {
        return _requireRegisteredView(tokenId).verificationHash;
    }

    function tokenIdFor(bytes32 ticketKey) external pure returns (uint256) {
        return uint256(ticketKey);
    }

    function isRegistered(bytes32 ticketKey) external view returns (bool) {
        return _registered[ticketKey];
    }

    // ---------------------------------------------------------------------
    // Transfer restriction — the standard ERC-721 mutation surface is disabled
    // ---------------------------------------------------------------------

    // Note: ERC721's 3-arg safeTransferFrom is a non-virtual wrapper that calls the 4-arg overload
    // below internally, so overriding the 4-arg version alone closes that entry point too.
    function transferFrom(address, address, uint256) public pure override(ERC721) {
        revert TransferRestricted();
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override(ERC721) {
        revert TransferRestricted();
    }

    function approve(address, uint256) public pure override(ERC721) {
        revert TransferRestricted();
    }

    function setApprovalForAll(address, bool) public pure override(ERC721) {
        revert TransferRestricted();
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

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    function _requireRegistered(uint256 tokenId) private view returns (TicketRecord storage record) {
        record = _records[tokenId];
        if (record.mintedAt == 0) revert TicketNotRegistered(tokenId);
    }

    function _requireRegisteredView(uint256 tokenId) private view returns (TicketRecord memory record) {
        record = _records[tokenId];
        if (record.mintedAt == 0) revert TicketNotRegistered(tokenId);
    }

    function _transitionStatus(uint256 tokenId, TicketStatus from, TicketStatus to) private {
        TicketRecord storage record = _requireRegistered(tokenId);
        if (record.status != from) revert InvalidStatusTransition(record.status, to);
        _setStatus(tokenId, from, to);
    }

    function _setStatus(uint256 tokenId, TicketStatus from, TicketStatus to) private {
        TicketRecord storage record = _records[tokenId];
        record.status = to;
        record.updatedAt = uint64(block.timestamp);
        emit StatusChanged(tokenId, from, to, block.timestamp);
    }
}
