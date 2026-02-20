// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {VerdictRegistry} from "../src/VerdictRegistry.sol";
import {PovEscrowERC20} from "../src/PovEscrowERC20.sol";

contract DeployPoV is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address verdictSigner = vm.envAddress("VERDICT_SIGNER");
        address protocolFeeRecipient = vm.envAddress("PROTOCOL_FEE_RECIPIENT");
        address arbitratorFeeRecipient = vm.envAddress("ARBITRATOR_FEE_RECIPIENT");

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
