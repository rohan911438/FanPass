// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title IAttendanceRegistry
/// @notice Minimal, deliberately unfinished: proof of venue check-in only. Badges/memory
///         cards/collectibles are future contracts that subscribe to AttendanceMarked — not built here.
/// @dev See docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md §5.
interface IAttendanceRegistry {
    struct AttendanceRecord {
        address attendee;
        bytes32 venueHash;
        uint64 checkedInAt;
    }

    event AttendanceMarked(uint256 indexed tokenId, address indexed attendee, bytes32 venueHash, uint256 timestamp);

    error AlreadyAttended(uint256 tokenId);
    error ZeroAddress();

    function checkIn(uint256 tokenId, bytes32 venueHash) external;
    function hasAttended(uint256 tokenId) external view returns (bool);
    function attendanceOf(uint256 tokenId) external view returns (AttendanceRecord memory);
}
