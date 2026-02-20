// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {VerdictRegistry} from "../src/VerdictRegistry.sol";

contract VerdictRegistryTest is Test {
    VerdictRegistry internal registry;
    uint256 internal signerKey;
    address internal signer;

    function setUp() public {
        signerKey = 0xA11CE;
        signer = vm.addr(signerKey);
        registry = new VerdictRegistry(signer, 7_000);
    }

    function _sign(VerdictRegistry.VerdictData memory verdict) internal view returns (bytes memory) {
        bytes32 digest = registry.hashVerdict(verdict);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function testRegisterVerdictAndReplayProtection() public {
        VerdictRegistry.VerdictData memory verdict = VerdictRegistry.VerdictData({
            disputeId: keccak256("dispute-1"),
            winner: address(0xBEEF),
            confidenceBps: 8_500,
            issuedAt: block.timestamp,
            deadline: block.timestamp + 1 days,
            nonce: 1
        });

        bytes memory signature = _sign(verdict);
        registry.registerVerdict(verdict, signature);
        assertTrue(registry.verdictRegistered(verdict.disputeId));

        vm.expectRevert(VerdictRegistry.DigestAlreadyUsed.selector);
        registry.registerVerdict(verdict, signature);
    }
}
