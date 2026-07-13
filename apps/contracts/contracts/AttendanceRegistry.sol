// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IAttendanceRegistry} from "./interfaces/IAttendanceRegistry.sol";
import {IOwnershipRegistry} from "./interfaces/IOwnershipRegistry.sol";

/// @title AttendanceRegistry
/// @notice Immutable proof of venue check-in. Deliberately minimal — badges, memory cards, and
///         collectibles are future contracts that subscribe to AttendanceMarked, not features of this
///         one. See docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md §5.
contract AttendanceRegistry is AccessControl, IAttendanceRegistry {
    bytes32 public constant VENUE_VERIFIER_ROLE = keccak256("VENUE_VERIFIER_ROLE");

    IOwnershipRegistry public immutable REGISTRY;
    IERC721 public immutable REGISTRY_NFT;

    mapping(uint256 tokenId => AttendanceRecord) private _attendance;
    mapping(uint256 tokenId => bool) private _hasAttended;

    constructor(address ownershipRegistry, address admin) {
        if (ownershipRegistry == address(0) || admin == address(0)) revert ZeroAddress();
        REGISTRY = IOwnershipRegistry(ownershipRegistry);
        REGISTRY_NFT = IERC721(ownershipRegistry);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function checkIn(uint256 tokenId, bytes32 venueHash) external onlyRole(VENUE_VERIFIER_ROLE) {
        if (_hasAttended[tokenId]) revert AlreadyAttended(tokenId);

        // Reverts with the registry's own error if the token doesn't exist / isn't in a checkable state.
        REGISTRY.markCheckedIn(tokenId);

        address attendee = REGISTRY_NFT.ownerOf(tokenId);
        _hasAttended[tokenId] = true;
        _attendance[tokenId] = AttendanceRecord({attendee: attendee, venueHash: venueHash, checkedInAt: uint64(block.timestamp)});

        emit AttendanceMarked(tokenId, attendee, venueHash, block.timestamp);
    }

    function hasAttended(uint256 tokenId) external view returns (bool) {
        return _hasAttended[tokenId];
    }

    function attendanceOf(uint256 tokenId) external view returns (AttendanceRecord memory) {
        return _attendance[tokenId];
    }
}
