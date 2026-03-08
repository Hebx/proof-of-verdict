// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";

contract PovReputation is Ownable {
    error Unauthorized();
    error InvalidRecipient();

    uint32 public constant MAX_SCORE = 1000;

    address public escrow;

    mapping(address => uint32) public completedJobs;
    mapping(address => uint32) public successfulJobs;
    mapping(address => int32) public reputationScore;

    event EscrowUpdated(address indexed escrow);
    event ReputationUpdated(address indexed agent, int32 score, uint32 completed, uint32 success, bool outcome);

    constructor(address escrow_) {
        if (escrow_ == address(0)) revert InvalidRecipient();
        escrow = escrow_;
    }

    function setEscrow(address escrow_) external onlyOwner {
        if (escrow_ == address(0)) revert InvalidRecipient();
        escrow = escrow_;
        emit EscrowUpdated(escrow_);
    }

    function recordOutcome(address agent, bool success) external {
        if (msg.sender != escrow) revert Unauthorized();
        if (agent == address(0) || agent == escrow) revert InvalidRecipient();

        completedJobs[agent] += 1;
        if (success) {
            successfulJobs[agent] += 1;
            reputationScore[agent] += 10;
        } else {
            reputationScore[agent] -= 5;
        }

        if (reputationScore[agent] < 0) reputationScore[agent] = 0;
        if (reputationScore[agent] > int32(MAX_SCORE)) reputationScore[agent] = int32(MAX_SCORE);

        emit ReputationUpdated(agent, reputationScore[agent], completedJobs[agent], successfulJobs[agent], success);
    }

    function getReputation(address agent)
        external
        view
        returns (int32 score, uint32 completed, uint32 success)
    {
        return (reputationScore[agent], completedJobs[agent], successfulJobs[agent]);
    }
}
