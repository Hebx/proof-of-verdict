// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract VerdictRegistry is EIP712, Ownable {
    using ECDSA for bytes32;

    struct VerdictData {
        bytes32 disputeId;
        address winner;
        uint256 confidenceBps;
        uint256 issuedAt;
        uint256 deadline;
        uint256 nonce;
    }

    struct Verdict {
        address winner;
        uint256 confidenceBps;
        uint256 issuedAt;
        uint256 deadline;
        uint256 nonce;
    }

    bytes32 public constant VERDICT_TYPEHASH =
        keccak256(
            "Verdict(bytes32 disputeId,address winner,uint256 confidenceBps,uint256 issuedAt,uint256 deadline,uint256 nonce)"
        );

    address public verdictSigner;
    uint256 public minConfidenceBps;

    mapping(bytes32 => Verdict) private verdicts;
    mapping(bytes32 => bool) public verdictRegistered;
    mapping(bytes32 => bool) public usedDigests;

    event VerdictSignerUpdated(address indexed signer);
    event MinConfidenceUpdated(uint256 minConfidenceBps);
    event VerdictRegistered(
        bytes32 indexed disputeId,
        address indexed winner,
        uint256 confidenceBps,
        uint256 issuedAt,
        uint256 deadline,
        uint256 nonce,
        bytes32 digest
    );

    error InvalidSigner();
    error VerdictAlreadyRegistered();
    error DigestAlreadyUsed();
    error ConfidenceTooLow();
    error VerdictExpired();
    error InvalidWinner();
    error InvalidBps();
    error ZeroAddress();

    constructor(address signer, uint256 minConfidenceBps_) EIP712("VerdictRegistry", "1") Ownable() {
        if (signer == address(0)) revert ZeroAddress();
        if (minConfidenceBps_ > 10_000) revert InvalidBps();

        verdictSigner = signer;
        minConfidenceBps = minConfidenceBps_;
    }

    function setVerdictSigner(address signer) external onlyOwner {
        if (signer == address(0)) revert ZeroAddress();
        verdictSigner = signer;
        emit VerdictSignerUpdated(signer);
    }

    function setMinConfidenceBps(uint256 minConfidenceBps_) external onlyOwner {
        if (minConfidenceBps_ > 10_000) revert InvalidBps();
        minConfidenceBps = minConfidenceBps_;
        emit MinConfidenceUpdated(minConfidenceBps_);
    }

    function hashVerdict(VerdictData calldata verdict) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                VERDICT_TYPEHASH,
                verdict.disputeId,
                verdict.winner,
                verdict.confidenceBps,
                verdict.issuedAt,
                verdict.deadline,
                verdict.nonce
            )
        );
        return _hashTypedDataV4(structHash);
    }

    function registerVerdict(VerdictData calldata verdict, bytes calldata signature) external returns (bytes32) {
        if (verdict.winner == address(0)) revert InvalidWinner();
        if (verdict.confidenceBps < minConfidenceBps) revert ConfidenceTooLow();
        if (verdict.deadline != 0 && block.timestamp > verdict.deadline) revert VerdictExpired();

        bytes32 digest = hashVerdict(verdict);
        if (usedDigests[digest]) revert DigestAlreadyUsed();
        if (verdictRegistered[verdict.disputeId]) revert VerdictAlreadyRegistered();

        address signer = digest.recover(signature);
        if (signer != verdictSigner) revert InvalidSigner();

        usedDigests[digest] = true;
        verdictRegistered[verdict.disputeId] = true;
        verdicts[verdict.disputeId] =
            Verdict(verdict.winner, verdict.confidenceBps, verdict.issuedAt, verdict.deadline, verdict.nonce);

        emit VerdictRegistered(
            verdict.disputeId,
            verdict.winner,
            verdict.confidenceBps,
            verdict.issuedAt,
            verdict.deadline,
            verdict.nonce,
            digest
        );

        return digest;
    }

    function getVerdict(bytes32 disputeId) external view returns (Verdict memory) {
        return verdicts[disputeId];
    }
}
