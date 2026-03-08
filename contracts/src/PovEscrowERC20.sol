// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/security/ReentrancyGuard.sol";

import {VerdictRegistry} from "./VerdictRegistry.sol";

interface IPovReputation {
    function recordOutcome(address agent, bool success) external;
}

contract PovEscrowERC20 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Escrow {
        address token;
        address payer;
        address payee;
        uint256 amount;
        uint64 createdAt;
        uint64 timeout;
        bool settled;
        bool refunded;
    }

    uint256 public constant BPS = 10_000;

    VerdictRegistry public registry;
    uint256 public feeBps;
    uint256 public protocolSplitBps;
    address public protocolFeeRecipient;
    address public arbitratorFeeRecipient;
    address public reputation;

    mapping(bytes32 => Escrow) private escrows;

    event EscrowOpened(
        bytes32 indexed disputeId,
        address indexed payer,
        address indexed payee,
        address token,
        uint256 amount,
        uint64 timeout
    );
    event EscrowSettled(
        bytes32 indexed disputeId,
        address indexed winner,
        uint256 payout,
        uint256 fee,
        uint256 protocolFee,
        uint256 arbitratorFee
    );
    event EscrowRefunded(bytes32 indexed disputeId, address indexed payer, uint256 amount);
    event FeeParamsUpdated(uint256 feeBps, uint256 protocolSplitBps, address protocolFeeRecipient, address arbitratorFeeRecipient);
    event RegistryUpdated(address indexed registry);
    event ReputationUpdated(address indexed reputation);
    event ReputationHookFailed(bytes32 indexed disputeId, address indexed agent, bool success, bytes reason);

    error EscrowExists();
    error EscrowMissing();
    error InvalidAmount();
    error InvalidTimeout();
    error InvalidRecipient();
    error InvalidBps();
    error NotPayer();
    error NotRefundable();
    error AlreadyFinalized();
    error VerdictMissing();
    error InvalidWinner();

    constructor(
        address registry_,
        address protocolFeeRecipient_,
        address arbitratorFeeRecipient_,
        uint256 feeBps_,
        uint256 protocolSplitBps_
    ) {
        if (registry_ == address(0)) revert InvalidRecipient();
        if (protocolFeeRecipient_ == address(0)) revert InvalidRecipient();
        if (arbitratorFeeRecipient_ == address(0)) revert InvalidRecipient();
        if (feeBps_ > BPS) revert InvalidBps();
        if (protocolSplitBps_ > BPS) revert InvalidBps();

        registry = VerdictRegistry(registry_);
        protocolFeeRecipient = protocolFeeRecipient_;
        arbitratorFeeRecipient = arbitratorFeeRecipient_;
        feeBps = feeBps_;
        protocolSplitBps = protocolSplitBps_;
    }

    function setRegistry(address registry_) external onlyOwner {
        if (registry_ == address(0)) revert InvalidRecipient();
        registry = VerdictRegistry(registry_);
        emit RegistryUpdated(registry_);
    }

    function setFeeParams(
        uint256 feeBps_,
        uint256 protocolSplitBps_,
        address protocolFeeRecipient_,
        address arbitratorFeeRecipient_
    ) external onlyOwner {
        if (feeBps_ > BPS) revert InvalidBps();
        if (protocolSplitBps_ > BPS) revert InvalidBps();
        if (protocolFeeRecipient_ == address(0)) revert InvalidRecipient();
        if (arbitratorFeeRecipient_ == address(0)) revert InvalidRecipient();

        feeBps = feeBps_;
        protocolSplitBps = protocolSplitBps_;
        protocolFeeRecipient = protocolFeeRecipient_;
        arbitratorFeeRecipient = arbitratorFeeRecipient_;

        emit FeeParamsUpdated(feeBps_, protocolSplitBps_, protocolFeeRecipient_, arbitratorFeeRecipient_);
    }

    function setReputation(address reputation_) external onlyOwner {
        reputation = reputation_;
        emit ReputationUpdated(reputation_);
    }

    function openEscrow(
        bytes32 disputeId,
        address token,
        address payee,
        uint256 amount,
        uint64 timeout
    ) external nonReentrant {
        if (escrows[disputeId].payer != address(0)) revert EscrowExists();
        if (payee == address(0) || payee == address(this) || token == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        if (timeout == 0) revert InvalidTimeout();

        escrows[disputeId] = Escrow({
            token: token,
            payer: msg.sender,
            payee: payee,
            amount: amount,
            createdAt: uint64(block.timestamp),
            timeout: timeout,
            settled: false,
            refunded: false
        });

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit EscrowOpened(disputeId, msg.sender, payee, token, amount, timeout);
    }

    function settle(bytes32 disputeId) external nonReentrant {
        Escrow storage escrow = escrows[disputeId];
        if (escrow.payer == address(0)) revert EscrowMissing();
        if (escrow.settled || escrow.refunded) revert AlreadyFinalized();

        VerdictRegistry.Verdict memory verdict = registry.getVerdict(disputeId);
        if (verdict.winner == address(0)) revert VerdictMissing();
        if (verdict.winner != escrow.payer && verdict.winner != escrow.payee) revert InvalidWinner();

        uint256 fee = (escrow.amount * feeBps) / BPS;
        uint256 protocolFee = (fee * protocolSplitBps) / BPS;
        uint256 arbitratorFee = fee - protocolFee;
        uint256 payout = escrow.amount - fee;

        escrow.settled = true;

        IERC20 token = IERC20(escrow.token);
        if (protocolFee > 0) token.safeTransfer(protocolFeeRecipient, protocolFee);
        if (arbitratorFee > 0) token.safeTransfer(arbitratorFeeRecipient, arbitratorFee);
        token.safeTransfer(verdict.winner, payout);

        // Optional reputation hook
        if (reputation != address(0)) {
            address loser = verdict.winner == escrow.payer ? escrow.payee : escrow.payer;
            _recordOutcomeSafe(disputeId, verdict.winner, true);
            _recordOutcomeSafe(disputeId, loser, false);
        }

        emit EscrowSettled(disputeId, verdict.winner, payout, fee, protocolFee, arbitratorFee);
    }

    function refund(bytes32 disputeId) external nonReentrant {
        Escrow storage escrow = escrows[disputeId];
        if (escrow.payer == address(0)) revert EscrowMissing();
        if (escrow.settled || escrow.refunded) revert AlreadyFinalized();
        if (msg.sender != escrow.payer) revert NotPayer();
        if (block.timestamp <= escrow.createdAt + escrow.timeout) revert NotRefundable();

        escrow.refunded = true;
        IERC20(escrow.token).safeTransfer(escrow.payer, escrow.amount);

        // Optional reputation hook: refund penalizes payee (non-delivery) and does not reward payer.
        if (reputation != address(0)) {
            _recordOutcomeSafe(disputeId, escrow.payee, false);
        }

        emit EscrowRefunded(disputeId, escrow.payer, escrow.amount);
    }

    function getEscrow(bytes32 disputeId) external view returns (Escrow memory) {
        return escrows[disputeId];
    }

    function _recordOutcomeSafe(bytes32 disputeId, address agent, bool success) internal {
        try IPovReputation(reputation).recordOutcome(agent, success) {
            // no-op
        } catch (bytes memory reason) {
            emit ReputationHookFailed(disputeId, agent, success, reason);
        }
    }
}
