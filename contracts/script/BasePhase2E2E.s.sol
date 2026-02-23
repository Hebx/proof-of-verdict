// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {VerdictRegistry} from "../src/VerdictRegistry.sol";
import {PovEscrowERC20} from "../src/PovEscrowERC20.sol";

/**
 * Base Phase 2 E2E — Deploy and broadcast to Base Sepolia
 * Requires: PRIVATE_KEY, BASE_SEPOLIA_RPC (or NEXT_PUBLIC_BASE_SEPOLIA_RPC)
 *           VERDICT_SIGNER, PROTOCOL_FEE_RECIPIENT, ARBITRATOR_FEE_RECIPIENT
 */
contract BasePhase2E2E is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address verdictSigner = vm.envOr("VERDICT_SIGNER", deployer);
        address protocolFeeRecipient = vm.envOr("PROTOCOL_FEE_RECIPIENT", deployer);
        address arbitratorFeeRecipient = vm.envOr("ARBITRATOR_FEE_RECIPIENT", deployer);

        uint256 minConfidenceBps = 5000; // 50%
        uint256 feeBps = 250; // 2.5%
        uint256 protocolSplitBps = 5000; // 50/50 protocol/arbitrator

        vm.startBroadcast(deployerPrivateKey);

        VerdictRegistry registry = new VerdictRegistry(verdictSigner, minConfidenceBps);
        console.log("VerdictRegistry deployed to:", address(registry));

        PovEscrowERC20 escrow = new PovEscrowERC20(
            address(registry),
            protocolFeeRecipient,
            arbitratorFeeRecipient,
            feeBps,
            protocolSplitBps
        );
        console.log("PovEscrowERC20 deployed to:", address(escrow));

        vm.stopBroadcast();
    }
}
