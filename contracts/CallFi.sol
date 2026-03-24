// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title  CallFi v4
 * @notice On-chain voice/video calls + peer-to-peer STT payments.
 *
 * Architecture:
 *  - Users call contract functions directly — msg.sender is the identity.
 *  - Each call lifecycle action is one user-signed transaction.
 *  - Tips are routed through the contract so Reactivity can notify the receiver.
 *  - Payment request acceptance is also on-chain for the same reason.
 *  - WebRTC signaling (offer/answer SDP) is embedded in call events,
 *    pushed instantly via Somnia Reactivity — no polling, no extra txs.
 *
 * Flow:
 *  Caller: initiateCall(receiver, offerSDP)      → 1 TX
 *  Callee: acceptCall(callId, answerSDP)         → 1 TX
 *      or: declineCall(callId)                   → 1 TX
 *  Caller: markNoAnswer(callId)                  → 1 TX  (3-min timeout)
 *  Either: endCall(callId)                       → 1 TX
 *  Tip:    tip(callId, to)  + value              → 1 TX  (ETH forwarded instantly)
 *  Request: requestPayment(callId, target, amt)  → 1 TX
 *  Accept:  acceptPaymentRequest(requestId)      → 1 TX  (ETH forwarded instantly)
 *  Decline: declinePaymentRequest(requestId)     → 1 TX
 */
contract CallFi is ReentrancyGuard {

    // ── Enums ────────────────────────────────────────────────────────────────
    enum CallStatus    { Pending, Active, Ended, Declined, Missed }
    enum RequestStatus { Pending, Accepted, Declined }

    // ── Structs ──────────────────────────────────────────────────────────────
    struct Call {
        address    caller;
        address    receiver;
        uint96     startTime;
        uint96     endTime;
        uint64     duration;
        CallStatus status;
    }

    struct PaymentRequest {
        uint256       callId;
        address       requester;
        address       target;
        uint256       amount;
        RequestStatus status;
    }

    // ── Storage ──────────────────────────────────────────────────────────────
    uint256 private _callCounter;
    uint256 private _requestCounter;

    mapping(uint256 => Call)           private _calls;
    mapping(uint256 => PaymentRequest) private _requests;
    mapping(address => uint256[])      private _userCalls;

    // ── Events ───────────────────────────────────────────────────────────────
    event CallInitiated (uint256 indexed callId, address indexed caller,   address indexed receiver, string signalOffer,  uint256 ts);
    event CallAccepted  (uint256 indexed callId, address indexed receiver,                           string signalAnswer, uint256 ts);
    event CallDeclined  (uint256 indexed callId, address indexed receiver,                                                uint256 ts);
    event CallEnded     (uint256 indexed callId, address indexed endedBy,  uint256 duration,                             uint256 ts);

    event TipSent                (uint256 indexed callId, address indexed from, address indexed to, uint256 amount, uint256 ts);
    event PaymentRequested       (uint256 indexed callId, uint256 indexed requestId, address indexed requester, address target, uint256 amount, uint256 ts);
    event PaymentRequestResolved (uint256 indexed requestId, address resolvedBy, bool accepted, uint256 ts);

    // ─────────────────────────────────────────────────────────────────────────
    // CALL LIFECYCLE
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Start a call. Offer SDP pushed via Somnia Reactivity to receiver.
    function initiateCall(address receiver, string calldata signalOffer)
        external returns (uint256 callId)
    {
        require(receiver != address(0) && receiver != msg.sender, "CF: bad receiver");
        callId = ++_callCounter;
        _calls[callId] = Call({
            caller:    msg.sender,
            receiver:  receiver,
            startTime: uint96(block.timestamp),
            endTime:   0,
            duration:  0,
            status:    CallStatus.Pending
        });
        _userCalls[msg.sender].push(callId);
        _userCalls[receiver].push(callId);
        emit CallInitiated(callId, msg.sender, receiver, signalOffer, block.timestamp);
    }

    /// @notice Receiver accepts. Answer SDP pushed to caller via Reactivity.
    function acceptCall(uint256 callId, string calldata signalAnswer) external {
        Call storage c = _calls[callId];
        require(msg.sender == c.receiver,           "CF: not receiver");
        require(c.status == CallStatus.Pending,     "CF: not pending");
        c.status    = CallStatus.Active;
        c.startTime = uint96(block.timestamp);
        emit CallAccepted(callId, msg.sender, signalAnswer, block.timestamp);
    }

    /// @notice Receiver declines the call.
    function declineCall(uint256 callId) external {
        Call storage c = _calls[callId];
        require(msg.sender == c.receiver,           "CF: not receiver");
        require(c.status == CallStatus.Pending,     "CF: not pending");
        c.status = CallStatus.Declined;
        emit CallDeclined(callId, msg.sender, block.timestamp);
    }

    /// @notice Caller marks an unanswered call as missed (no-answer timeout).
    ///         Called automatically by the frontend after 3 minutes of ringing.
    function markNoAnswer(uint256 callId) external {
        Call storage c = _calls[callId];
        require(msg.sender == c.caller,         "CF: not caller");
        require(c.status == CallStatus.Pending, "CF: not pending");
        c.status  = CallStatus.Missed;
        c.endTime = uint96(block.timestamp);
        // duration stays 0 — call was never answered
        emit CallEnded(callId, msg.sender, 0, block.timestamp);
    }

    /// @notice Either party ends an active call.
    function endCall(uint256 callId) external {
        Call storage c = _calls[callId];
        require(msg.sender == c.caller || msg.sender == c.receiver, "CF: not in call");
        require(c.status == CallStatus.Active || c.status == CallStatus.Pending, "CF: not live");
        c.status   = CallStatus.Ended;
        c.endTime  = uint96(block.timestamp);
        c.duration = uint64(block.timestamp - c.startTime);
        emit CallEnded(callId, msg.sender, c.duration, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TIPS — ETH forwarded instantly, Reactivity notifies receiver
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Send a tip to the other party during a call.
    ///         ETH is forwarded instantly — the contract holds nothing.
    ///         TipSent event triggers Reactivity so the receiver sees it in-app.
    function tip(uint256 callId, address payable to) external payable nonReentrant {
        require(msg.value > 0, "CF: zero tip");
        to.transfer(msg.value);
        emit TipSent(callId, msg.sender, to, msg.value, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAYMENT REQUESTS — on-chain intent + on-chain resolution
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Request a payment from the other party during a call.
    function requestPayment(uint256 callId, address target, uint256 amount)
        external returns (uint256 requestId)
    {
        require(amount > 0, "CF: zero amount");
        requestId = ++_requestCounter;
        _requests[requestId] = PaymentRequest({
            callId:    callId,
            requester: msg.sender,
            target:    target,
            amount:    amount,
            status:    RequestStatus.Pending
        });
        emit PaymentRequested(callId, requestId, msg.sender, target, amount, block.timestamp);
    }

    /// @notice Target accepts a payment request.
    ///         ETH is forwarded instantly to the requester.
    ///         PaymentRequestResolved event triggers Reactivity so requester sees it.
    function acceptPaymentRequest(uint256 requestId) external payable nonReentrant {
        PaymentRequest storage req = _requests[requestId];
        require(msg.sender == req.target,            "CF: not target");
        require(req.status == RequestStatus.Pending, "CF: not pending");
        require(msg.value == req.amount,             "CF: wrong amount");
        req.status = RequestStatus.Accepted;
        payable(req.requester).transfer(msg.value);
        emit PaymentRequestResolved(requestId, msg.sender, true, block.timestamp);
    }

    /// @notice Target declines a payment request.
    function declinePaymentRequest(uint256 requestId) external {
        PaymentRequest storage req = _requests[requestId];
        require(msg.sender == req.target,            "CF: not target");
        require(req.status == RequestStatus.Pending, "CF: not pending");
        req.status = RequestStatus.Declined;
        emit PaymentRequestResolved(requestId, msg.sender, false, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VIEWS
    // ─────────────────────────────────────────────────────────────────────────

    function getCall(uint256 callId) external view returns (Call memory) {
        return _calls[callId];
    }

    function getUserCalls(address user) external view returns (uint256[] memory) {
        return _userCalls[user];
    }

    function getPaymentRequest(uint256 requestId) external view returns (PaymentRequest memory) {
        return _requests[requestId];
    }

    /// @notice Total number of calls ever initiated on the platform.
    function totalCalls() external view returns (uint256) {
        return _callCounter;
    }
}
