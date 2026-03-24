"use client";

/**
 * SDP encryption for CallFi
 * ─────────────────────────
 * Protects the WebRTC SDP strings stored on-chain.
 * Both parties derive the SAME key independently using their Ethereum addresses —
 * no extra round-trip or key exchange transaction needed.
 *
 * Key derivation:
 *   SHA-256( sort([callerAddr, receiverAddr]).join(":") + ":callfi-v1" )
 *
 * What this protects:
 *   ✓ ICE candidates (relay IPs + ephemeral ports from TURN server)
 *   ✓ DTLS fingerprint (private from chain explorers)
 *   ✓ Codec preferences
 *
 * Honesty note:
 *   The key is derived from the two wallet addresses, which are themselves
 *   public on-chain (they're the call participants). Anyone who knows both
 *   addresses CAN derive the key. This prevents casual chain scanning and
 *   makes bulk scraping impractical, but does not provide absolute privacy
 *   from a targeted attacker who knows the two addresses.
 *   True end-to-end SDP privacy would require a pre-registered encryption
 *   public key stored on-chain for each address (out of scope here).
 *
 * IP privacy:
 *   In addition to encrypting the SDP content, iceTransportPolicy: "relay"
 *   is set in RTCPeerConnection so only TURN relay IPs ever appear in the
 *   SDP — your real IP is never included at all.
 */

async function deriveSessionKey(callerAddr: string, receiverAddr: string): Promise<CryptoKey> {
  const sorted  = [callerAddr.toLowerCase(), receiverAddr.toLowerCase()].sort();
  const material = new TextEncoder().encode(`${sorted[0]}:${sorted[1]}:callfi-v1`);
  const hash     = await crypto.subtle.digest("SHA-256", material);
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/**
 * Encrypt an SDP JSON string.
 * Returns "enc1:<base64(iv + ciphertext)>"
 */
export async function encryptSDP(
  sdp: string,
  callerAddr: string,
  receiverAddr: string,
): Promise<string> {
  const key        = await deriveSessionKey(callerAddr, receiverAddr);
  const iv         = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(sdp),
  );

  // Pack: iv (12 bytes) + ciphertext
  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), 12);

  return "enc1:" + btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt an SDP string produced by encryptSDP.
 * If the string does not start with "enc1:" it is returned as-is (backward compat).
 */
export async function decryptSDP(
  data: string,
  callerAddr: string,
  receiverAddr: string,
): Promise<string> {
  if (!data.startsWith("enc1:")) return data; // unencrypted (old call or backward compat)

  const key      = await deriveSessionKey(callerAddr, receiverAddr);
  const combined = Uint8Array.from(atob(data.slice(5)), c => c.charCodeAt(0));
  const iv         = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}
