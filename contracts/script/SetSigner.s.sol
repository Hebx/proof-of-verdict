// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {VerdictRegistry} from "../src/VerdictRegistry.sol";

contract SetSigner is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address registry = vm.envAddress("VERDICT_REGISTRY_ADDRESS");
        address newSigner = vm.envAddress("NEW_SIGNER");

        vm.startBroadcast(deployerPrivateKey);
        VerdictRegistry(registry).setVerdictSigner(newSigner);
        console.log("Signer updated to:", newSigner);
        vm.stopBroadcast();
    }
}
