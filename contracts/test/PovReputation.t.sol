// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {PovReputation} from "../src/PovReputation.sol";

contract PovReputationTest is Test {
    PovReputation internal reputation;
    
    address internal owner = address(0xA11CE);
    address internal escrow = address(0xBEEF);
    address internal agent = address(0xCAFE);
    address internal anotherAgent = address(0xD00D);
    
    function setUp() public {
        vm.prank(owner);
        reputation = new PovReputation(escrow);
    }
    
    // ============ Constructor Tests ============
    
    function testConstructorSetsEscrow() public {
        assertEq(reputation.escrow(), escrow);
    }
    
    function testConstructorSetsOwner() public {
        assertEq(reputation.owner(), owner);
    }
    
    function testConstructorRejectsZeroAddressEscrow() public {
        vm.prank(owner);
        vm.expectRevert(PovReputation.InvalidRecipient.selector);
        new PovReputation(address(0));
    }
    
    // ============ setEscrow Tests ============
    
    function testSetEscrowUpdatesEscrow() public {
        address newEscrow = address(0x1234);
        
        vm.prank(owner);
        reputation.setEscrow(newEscrow);
        
        assertEq(reputation.escrow(), newEscrow);
    }
    
    function testSetEscrowEmitsEvent() public {
        address newEscrow = address(0x1234);
        
        vm.prank(owner);
        vm.expectEmit(true, false, false, false);
        emit PovReputation.EscrowUpdated(newEscrow);
        reputation.setEscrow(newEscrow);
    }
    
    function testSetEscrowRejectsZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(PovReputation.InvalidRecipient.selector);
        reputation.setEscrow(address(0));
    }
    
    function testSetEscrowRejectsNonOwner() public {
        vm.prank(agent);
        vm.expectRevert();
        reputation.setEscrow(address(0x1234));
    }
    
    // ============ recordOutcome Tests ============
    
    function testRecordOutcomeSuccess() public {
        vm.prank(escrow);
        reputation.recordOutcome(agent, true);
        
        (int32 score, uint32 completed, uint32 success) = reputation.getReputation(agent);
        assertEq(score, 10);
        assertEq(completed, 1);
        assertEq(success, 1);
    }
    
    function testRecordOutcomeFailure() public {
        vm.prank(escrow);
        reputation.recordOutcome(agent, false);
        
        (int32 score, uint32 completed, uint32 success) = reputation.getReputation(agent);
        assertEq(score, 0); // -5 clamped to 0
        assertEq(completed, 1);
        assertEq(success, 0);
    }
    
    function testRecordOutcomeEmitsEvent() public {
        vm.prank(escrow);
        vm.expectEmit(true, false, false, true);
        emit PovReputation.ReputationUpdated(agent, 10, 1, 1, true);
        reputation.recordOutcome(agent, true);
    }
    
    function testRecordOutcomeRejectsNonEscrow() public {
        vm.prank(agent);
        vm.expectRevert(PovReputation.Unauthorized.selector);
        reputation.recordOutcome(agent, true);
    }
    
    function testRecordOutcomeRejectsZeroAddressAgent() public {
        vm.prank(escrow);
        vm.expectRevert(PovReputation.InvalidRecipient.selector);
        reputation.recordOutcome(address(0), true);
    }

    function testRecordOutcomeRejectsEscrowAsAgent() public {
        vm.prank(escrow);
        vm.expectRevert(PovReputation.InvalidRecipient.selector);
        reputation.recordOutcome(escrow, true);
    }
    
    function testRecordOutcomeMultipleSuccesses() public {
        vm.startPrank(escrow);
        
        reputation.recordOutcome(agent, true);
        reputation.recordOutcome(agent, true);
        reputation.recordOutcome(agent, true);
        
        vm.stopPrank();
        
        (int32 score, uint32 completed, uint32 success) = reputation.getReputation(agent);
        assertEq(score, 30); // 3 * 10
        assertEq(completed, 3);
        assertEq(success, 3);
    }
    
    function testRecordOutcomeMultipleFailures() public {
        vm.startPrank(escrow);
        
        reputation.recordOutcome(agent, false);
        reputation.recordOutcome(agent, false);
        
        vm.stopPrank();
        
        (int32 score, uint32 completed, uint32 success) = reputation.getReputation(agent);
        assertEq(score, 0); // clamped at 0
        assertEq(completed, 2);
        assertEq(success, 0);
    }
    
    function testRecordOutcomeMixedOutcomes() public {
        vm.startPrank(escrow);
        
        reputation.recordOutcome(agent, true);  // +10, score = 10
        reputation.recordOutcome(agent, false); // -5, score = 5
        reputation.recordOutcome(agent, true);  // +10, score = 15
        reputation.recordOutcome(agent, false); // -5, score = 10
        
        vm.stopPrank();
        
        (int32 score, uint32 completed, uint32 success) = reputation.getReputation(agent);
        assertEq(score, 10);
        assertEq(completed, 4);
        assertEq(success, 2);
    }
    
    function testRecordOutcomeMaxScore() public {
        vm.startPrank(escrow);
        
        // Need to add 100 successful outcomes to reach 1000
        for (uint256 i = 0; i < 101; i++) {
            reputation.recordOutcome(agent, true);
        }
        
        vm.stopPrank();
        
        (int32 score, uint32 completed, uint32 success) = reputation.getReputation(agent);
        assertEq(score, 1000); // clamped at MAX_SCORE
        assertEq(completed, 101);
        assertEq(success, 101);
    }
    
    function testRecordOutcomeMultipleAgents() public {
        vm.startPrank(escrow);
        
        reputation.recordOutcome(agent, true);
        reputation.recordOutcome(anotherAgent, false);
        reputation.recordOutcome(agent, true);
        
        vm.stopPrank();
        
        (int32 score1, uint32 completed1, uint32 success1) = reputation.getReputation(agent);
        assertEq(score1, 20);
        assertEq(completed1, 2);
        assertEq(success1, 2);
        
        (int32 score2, uint32 completed2, uint32 success2) = reputation.getReputation(anotherAgent);
        assertEq(score2, 0);
        assertEq(completed2, 1);
        assertEq(success2, 0);
    }
    
    // ============ getReputation Tests ============
    
    function testGetReputationDefaultValues() public {
        (int32 score, uint32 completed, uint32 success) = reputation.getReputation(agent);
        assertEq(score, 0);
        assertEq(completed, 0);
        assertEq(success, 0);
    }
    
    function testGetReputationAfterUpdate() public {
        vm.prank(escrow);
        reputation.recordOutcome(agent, true);
        
        (int32 score, uint32 completed, uint32 success) = reputation.getReputation(agent);
        assertEq(score, 10);
        assertEq(completed, 1);
        assertEq(success, 1);
    }
    
    // ============ Constants Tests ============
    
    function testMaxScoreConstant() public {
        assertEq(reputation.MAX_SCORE(), 1000);
    }
}
