// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MaliciousReentrantERC20
/// @notice Test-only token that attempts a reentrant call during transfer/transferFrom, once armed.
///         Used to prove EscrowMarketplace's ReentrancyGuard actually blocks cross-function reentrancy —
///         never deployed anywhere real.
contract MaliciousReentrantERC20 is ERC20 {
    address public target;
    bytes public reentrantCalldata;
    bool public armed;

    constructor() ERC20("Malicious", "EVIL") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function arm(address _target, bytes calldata _data) external {
        target = _target;
        reentrantCalldata = _data;
        armed = true;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        bool ok = super.transferFrom(from, to, amount);
        _maybeReenter();
        return ok;
    }

    function _maybeReenter() private {
        if (!armed) return;
        armed = false; // disarm first so the reentrant call itself doesn't loop
        (bool success, bytes memory returndata) = target.call(reentrantCalldata);
        if (!success) {
            assembly {
                revert(add(returndata, 32), mload(returndata))
            }
        }
    }
}
