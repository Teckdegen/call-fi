export const CALLFI_ADDRESS = (
  process.env.NEXT_PUBLIC_CALLFI_ADDRESS ?? "0x0000000000000000000000000000000000000000"
) as `0x${string}`;

export const SOMNIA_CALL_ADDRESS = CALLFI_ADDRESS;

// ── CallFi v3 ABI — users sign directly, msg.sender is identity ─────────────
export const CALLFI_ABI = [
  // ── Call lifecycle ─────────────────────────────────────────────────────────
  {
    name: "initiateCall", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "receiver",    type: "address" },
      { name: "signalOffer", type: "string"  },
    ],
    outputs: [{ name: "callId", type: "uint256" }],
  },
  {
    name: "acceptCall", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "callId",       type: "uint256" },
      { name: "signalAnswer", type: "string"  },
    ],
    outputs: [],
  },
  {
    name: "declineCall", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "callId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "endCall", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "callId", type: "uint256" }],
    outputs: [],
  },

  // ── Payment requests ──────────────────────────────────────────────────────
  {
    name: "requestPayment", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "callId", type: "uint256" },
      { name: "target", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "requestId", type: "uint256" }],
  },
  {
    name: "declinePaymentRequest", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "requestId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "tip", type: "function", stateMutability: "payable",
    inputs: [
      { name: "callId", type: "uint256" },
      { name: "to",     type: "address" },
    ],
    outputs: [],
  },
  {
    name: "acceptPaymentRequest", type: "function", stateMutability: "payable",
    inputs: [{ name: "requestId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "markNoAnswer", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "callId", type: "uint256" }],
    outputs: [],
  },

  // ── Views ──────────────────────────────────────────────────────────────────
  {
    name: "getCall", type: "function", stateMutability: "view",
    inputs:  [{ name: "callId", type: "uint256" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "caller",    type: "address" },
        { name: "receiver",  type: "address" },
        { name: "startTime", type: "uint96"  },
        { name: "endTime",   type: "uint96"  },
        { name: "duration",  type: "uint64"  },
        { name: "status",    type: "uint8"   },
      ],
    }],
  },
  {
    name: "getUserCalls", type: "function", stateMutability: "view",
    inputs:  [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256[]" }],
  },
  {
    name: "totalCalls", type: "function", stateMutability: "view",
    inputs:  [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getPaymentRequest", type: "function", stateMutability: "view",
    inputs:  [{ name: "requestId", type: "uint256" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "callId",    type: "uint256" },
        { name: "requester", type: "address" },
        { name: "target",    type: "address" },
        { name: "amount",    type: "uint256" },
        { name: "status",    type: "uint8"   },
      ],
    }],
  },

  // ── Events ─────────────────────────────────────────────────────────────────
  {
    name: "CallInitiated", type: "event",
    inputs: [
      { name: "callId",      type: "uint256", indexed: true  },
      { name: "caller",      type: "address", indexed: true  },
      { name: "receiver",    type: "address", indexed: true  },
      { name: "signalOffer", type: "string",  indexed: false },
      { name: "ts",          type: "uint256", indexed: false },
    ],
  },
  {
    name: "CallAccepted", type: "event",
    inputs: [
      { name: "callId",       type: "uint256", indexed: true  },
      { name: "receiver",     type: "address", indexed: true  },
      { name: "signalAnswer", type: "string",  indexed: false },
      { name: "ts",           type: "uint256", indexed: false },
    ],
  },
  {
    name: "CallDeclined", type: "event",
    inputs: [
      { name: "callId",   type: "uint256", indexed: true  },
      { name: "receiver", type: "address", indexed: true  },
      { name: "ts",       type: "uint256", indexed: false },
    ],
  },
  {
    name: "CallEnded", type: "event",
    inputs: [
      { name: "callId",   type: "uint256", indexed: true  },
      { name: "endedBy",  type: "address", indexed: true  },
      { name: "duration", type: "uint256", indexed: false },
      { name: "ts",       type: "uint256", indexed: false },
    ],
  },
  {
    name: "PaymentRequested", type: "event",
    inputs: [
      { name: "callId",    type: "uint256", indexed: true  },
      { name: "requestId", type: "uint256", indexed: true  },
      { name: "requester", type: "address", indexed: true  },
      { name: "target",    type: "address", indexed: false },
      { name: "amount",    type: "uint256", indexed: false },
      { name: "ts",        type: "uint256", indexed: false },
    ],
  },
  {
    name: "PaymentRequestResolved", type: "event",
    inputs: [
      { name: "requestId",  type: "uint256", indexed: true  },
      { name: "resolvedBy", type: "address", indexed: true  },
      { name: "accepted",   type: "bool",    indexed: false },
      { name: "ts",         type: "uint256", indexed: false },
    ],
  },
  {
    name: "TipSent", type: "event",
    inputs: [
      { name: "callId", type: "uint256", indexed: true  },
      { name: "from",   type: "address", indexed: true  },
      { name: "to",     type: "address", indexed: true  },
      { name: "amount", type: "uint256", indexed: false },
      { name: "ts",     type: "uint256", indexed: false },
    ],
  },
] as const;

export const SOMNIA_CALL_ABI = CALLFI_ABI;
