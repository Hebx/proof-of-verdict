// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {VerdictRegistry} from "../src/VerdictRegistry.sol";
import {PovEscrowERC20} from "../src/PovEscrowERC20.sol";
import {PovReputation} from "../src/PovReputation.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract RevertingReputation {
    function recordOutcome(address, bool) external pure {
        revert("rep-failed");
    }
}

contract PovEscrowERC20Test is Test {
    VerdictRegistry internal registry;
    PovEscrowERC20 internal escrow;
    MockERC20 internal token;
    PovReputation internal rep;

    uint256 internal signerKey;
    address internal signer;

    address internal payer = address(0xA11CE);
    address internal payee = address(0xBEEF);
    address internal protocolFeeRecipient = address(0xCAFE);
    address internal arbitratorFeeRecipient = address(0xD00D);

    function setUp() public {
        signerKey = 0xB0B;
        signer = vm.addr(signerKey);
        registry = new VerdictRegistry(signer, 7_000);
        escrow = new PovEscrowERC20(address(registry), protocolFeeRecipient, arbitratorFeeRecipient, 200, 6_000);
        rep = new PovReputation(address(escrow));
        escrow.setReputation(address(rep));

        token = new MockERC20("Proof Token", "POV");
        token.mint(payer, 1_000_000 ether);
        vm.prank(payer);
        token.approve(address(escrow), type(uint256).max);
    }

    function _sign(VerdictRegistry.VerdictData memory verdict) internal view returns (bytes memory) {
        bytes32 digest = registry.hashVerdict(verdict);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function testSettlementAndFeeDistribution() public {
        bytes32 disputeId = keccak256("dispute-escrow-1");
        uint256 amount = 1000 ether;

        vm.prank(payer);
        escrow.openEscrow(disputeId, address(token), payee, amount, 3 days);

        VerdictRegistry.VerdictData memory verdict = VerdictRegistry.VerdictData({
            disputeId: disputeId,
            winner: payee,
            confidenceBps: 8_000,
            issuedAt: block.timestamp,
            deadline: block.timestamp + 1 days,
            nonce: 1
        });

        registry.registerVerdict(verdict, _sign(verdict));
        escrow.settle(disputeId);

        uint256 fee = (amount * 200) / 10_000;
        uint256 protocolFee = (fee * 6_000) / 10_000;
        uint256 arbitratorFee = fee - protocolFee;
        uint256 payout = amount - fee;

        assertEq(token.balanceOf(payee), payout);
        assertEq(token.balanceOf(protocolFeeRecipient), protocolFee);
        assertEq(token.balanceOf(arbitratorFeeRecipient), arbitratorFee);
        assertEq(token.balanceOf(address(escrow)), 0);

        // Reputation: winner +10, loser -5 (clamped)
        (int32 payeeScore, uint32 payeeCompleted, uint32 payeeSuccess) = rep.getReputation(payee);
        (int32 payerScore, uint32 payerCompleted, uint32 payerSuccess) = rep.getReputation(payer);
        assertEq(payeeCompleted, 1);
        assertEq(payeeSuccess, 1);
        assertEq(payeeScore, 10);
        assertEq(payerCompleted, 1);
        assertEq(payerSuccess, 0);
        assertEq(payerScore, 0);
    }

    function testRefundAfterTimeout() public {
        bytes32 disputeId = keccak256("dispute-escrow-2");
        uint256 amount = 500 ether;

        vm.prank(payer);
        escrow.openEscrow(disputeId, address(token), payee, amount, 1 days);

        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(payer);
        escrow.refund(disputeId);

        assertEq(token.balanceOf(payer), 1_000_000 ether);
        assertEq(token.balanceOf(address(escrow)), 0);

        // Reputation: refund penalizes payee
        (int32 payeeScore, uint32 payeeCompleted, uint32 payeeSuccess) = rep.getReputation(payee);
        assertEq(payeeCompleted, 1);
        assertEq(payeeSuccess, 0);
        assertEq(payeeScore, 0);
    }

    function testOpenEscrowRevertsWhenPayeeIsEscrowAddress() public {
        bytes32 disputeId = keccak256("dispute-escrow-invalid-payee");
        uint256 amount = 100 ether;

        vm.prank(payer);
        vm.expectRevert(PovEscrowERC20.InvalidRecipient.selector);
        escrow.openEscrow(disputeId, address(token), address(escrow), amount, 1 days);
    }

    function testSettleSucceedsWhenReputationHookReverts() public {
        bytes32 disputeId = keccak256("dispute-rep-revert-settle");
        uint256 amount = 1000 ether;

        RevertingReputation badRep = new RevertingReputation();
        escrow.setReputation(address(badRep));

        vm.prank(payer);
        escrow.openEscrow(disputeId, address(token), payee, amount, 3 days);

        VerdictRegistry.VerdictData memory verdict = VerdictRegistry.VerdictData({
            disputeId: disputeId,
            winner: payee,
            confidenceBps: 8_000,
            issuedAt: block.timestamp,
            deadline: block.timestamp + 1 days,
            nonce: 1
        });

        registry.registerVerdict(verdict, _sign(verdict));
        escrow.settle(disputeId);

        uint256 fee = (amount * 200) / 10_000;
        uint256 payout = amount - fee;
        assertEq(token.balanceOf(payee), payout);
    }

    function testRefundSucceedsWhenReputationHookReverts() public {
        bytes32 disputeId = keccak256("dispute-rep-revert-refund");
        uint256 amount = 500 ether;

        RevertingReputation badRep = new RevertingReputation();
        escrow.setReputation(address(badRep));

        vm.prank(payer);
        escrow.openEscrow(disputeId, address(token), payee, amount, 1 days);

        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(payer);
        escrow.refund(disputeId);

        assertEq(token.balanceOf(payer), 1_000_000 ether);
        assertEq(token.balanceOf(address(escrow)), 0);
    }

}
