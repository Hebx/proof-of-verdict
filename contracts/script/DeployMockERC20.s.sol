// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract DeployMockERC20 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address mintTo = vm.envOr("MINT_TO", vm.addr(deployerPrivateKey));
        uint256 mintAmount = vm.envOr("MINT_AMOUNT", uint256(1_000_000 * 10**18));

        vm.startBroadcast(deployerPrivateKey);

        MockERC20 token = new MockERC20("ProofOfVerdict Token", "POV");
        token.mint(mintTo, mintAmount);

        console.log("MockERC20 deployed to:", address(token));
        console.log("Minted", mintAmount / 10**18, "POV to", mintTo);

        vm.stopBroadcast();
    }
}
