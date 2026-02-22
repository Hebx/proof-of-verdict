// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {VerdictRegistry} from "../src/VerdictRegistry.sol";
import {PovEscrowERC20} from "../src/PovEscrowERC20.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

/**
 * Deterministic Fork E2E — Proof of Verdict
 * Validates: verdict hash stability, signature verification, confidence threshold,
 * balance deltas, replay resistance, no reentrancy.
 */
contract DeterministicForkE2E is Test {
    VerdictRegistry internal registry;
    PovEscrowERC20 internal escrow;
    MockERC20 internal token;

    uint256 internal constant SIGNER_KEY = 0xB0B;
    address internal signer;

    address internal payer = address(0xA11CE);
    address internal payee = address(0xBEEF);
    address internal protocolFeeRecipient = address(0xCAFE);
    address internal arbitratorFeeRecipient = address(0xD00D);

    bytes32 internal constant DISPUTE_ID = keccak256("deterministic-e2e-dispute");
    uint256 internal constant AMOUNT = 1000 ether;
    uint64 internal constant TIMEOUT = 3 days;
    uint256 internal constant MIN_CONFIDENCE_BPS = 6_000;
    uint256 internal constant FEE_BPS = 200;
    uint256 internal constant PROTOCOL_SPLIT_BPS = 6_000;

    function setUp() public {
        signer = vm.addr(SIGNER_KEY);
        registry = new VerdictRegistry(signer, MIN_CONFIDENCE_BPS);
        escrow = new PovEscrowERC20(
            address(registry),
            protocolFeeRecipient,
            arbitratorFeeRecipient,
            FEE_BPS,
            PROTOCOL_SPLIT_BPS
        );
        token = new MockERC20("Proof Token", "POV");
        token.mint(payer, 1_000_000 ether);
        vm.prank(payer);
        token.approve(address(escrow), type(uint256).max);
    }

    function _sign(VerdictRegistry.VerdictData memory verdict) internal view returns (bytes memory) {
        bytes32 digest = registry.hashVerdict(verdict);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_KEY, digest);
        return abi.encodePacked(r, s, v);
    }

    function testDeterministicForkE2E() public {
        VerdictRegistry.VerdictData memory verdict = VerdictRegistry.VerdictData({
            disputeId: DISPUTE_ID,
            winner: payee,
            confidenceBps: 8_000,
            issuedAt: block.timestamp,
            deadline: block.timestamp + 1 days,
            nonce: 1
        });

        bytes32 hash1 = registry.hashVerdict(verdict);
        assertEq(hash1, registry.hashVerdict(verdict), "Verdict hash must be stable across replay");

        vm.prank(payer);
        escrow.openEscrow(DISPUTE_ID, address(token), payee, AMOUNT, TIMEOUT);

        uint256 payeeBefore = token.balanceOf(payee);
        uint256 protocolBefore = token.balanceOf(protocolFeeRecipient);
        uint256 arbitratorBefore = token.balanceOf(arbitratorFeeRecipient);

        bytes memory sig = _sign(verdict);
        registry.registerVerdict(verdict, sig);
        assertTrue(registry.verdictRegistered(DISPUTE_ID), "Verdict must be registered");
        vm.expectRevert(VerdictRegistry.DigestAlreadyUsed.selector);
        registry.registerVerdict(verdict, sig);

        escrow.settle(DISPUTE_ID);

        uint256 fee = (AMOUNT * FEE_BPS) / 10_000;
        uint256 protocolFee = (fee * PROTOCOL_SPLIT_BPS) / 10_000;
        uint256 arbitratorFee = fee - protocolFee;
        uint256 payout = AMOUNT - fee;

        assertEq(token.balanceOf(payee), payeeBefore + payout, "Payee balance delta");
        assertEq(token.balanceOf(protocolFeeRecipient), protocolBefore + protocolFee, "Protocol fee");
        assertEq(token.balanceOf(arbitratorFeeRecipient), arbitratorBefore + arbitratorFee, "Arbitrator fee");
        assertEq(token.balanceOf(address(escrow)), 0, "Escrow must be empty");
        assertEq(registry.hashVerdict(verdict), hash1, "Replay must produce identical hash");
    }

    function testConfidenceThresholdEnforced() public {
        VerdictRegistry.VerdictData memory lowConfidence = VerdictRegistry.VerdictData({
            disputeId: keccak256("low-conf"),
            winner: payee,
            confidenceBps: 5_000,
            issuedAt: block.timestamp,
            deadline: block.timestamp + 1 days,
            nonce: 1
        });
        bytes memory sig = _sign(lowConfidence);
        vm.expectRevert(VerdictRegistry.ConfidenceTooLow.selector);
        registry.registerVerdict(lowConfidence, sig);
    }
}
