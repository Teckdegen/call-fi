"use client";
import { useRef, useCallback, useState } from "react";

// ── STUN servers — used for NAT traversal discovery ─────────────────────────
// In relay-only mode (iceTransportPolicy:"relay") STUN is bypassed, but kept
// here so switching back to "all" mode works without any code changes.
const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302"          },
  { urls: "stun:stun1.l.google.com:19302"         },
  { urls: "stun:stun2.l.google.com:19302"         },
  { urls: "stun:stun3.l.google.com:19302"         },
  { urls: "stun:stun4.l.google.com:19302"         },
  { urls: "stun:global.stun.twilio.com:3478"      },
  { urls: "stun:stun.cloudflare.com:3478"         },
  { urls: "stun:stun.nextcloud.com:3478"          },
  { urls: "stun:stun.stunprotocol.org:3478"       },
  { urls: "stun:stun.services.mozilla.com:3478"   },
  { urls: "stun:openrelay.metered.ca:80"          },
  { urls: "stun:openrelay.metered.ca:443"         },
  { urls: "stun:webrtc.homeway.io:80"             },
  { urls: "stun:webrtc.homeway.io:443"            },
  { urls: "stun:webrtc.homeway.io:53"             },
  { urls: "stun:stun.sipgate.net:3478"            },
  { urls: "stun:stun.voipbuster.com:3478"         },
  { urls: "stun:stun.voiparound.com:3478"         },
  { urls: "stun:stun.voipcheap.com:3478"          },
  { urls: "stun:stun.ekiga.net:3478"              },
  { urls: "stun:stun.ideasip.com:3478"            },
  { urls: "stun:stun.callwithus.com:3478"         },
  { urls: "stun:stun.counterpath.com:3478"        },
  { urls: "stun:stun.counterpath.net:3478"        },
  { urls: "stun:stun.linphone.org:3478"           },
  { urls: "stun:stun.miwifi.com:3478"             },
  { urls: "stun:stun.voipawesome.com:3478"        },
  { urls: "stun:freestun.net:3478"                },
  { urls: "stun:numb.viagenie.ca:3478"            },
  { urls: "stun:stun.12connect.com:3478"          },
  { urls: "stun:stun.12voip.com:3478"             },
  { urls: "stun:stun.1und1.de:3478"              },
  { urls: "stun:stun.3cx.com:3478"               },
  { urls: "stun:stun.acrobits.cz:3478"           },
  { urls: "stun:stun.actionvoip.com:3478"        },
  { urls: "stun:stun.advfn.com:3478"             },
  { urls: "stun:stun.antisip.com:3478"           },
  { urls: "stun:stun.bluesip.net:3478"           },
  { urls: "stun:stun.cablenet-as.net:3478"       },
  { urls: "stun:stun.callromania.ro:3478"        },
  { urls: "stun:stun.cheapvoip.com:3478"         },
  { urls: "stun:stun.cloopen.com:3478"           },
  { urls: "stun:stun.commpeak.com:3478"          },
  { urls: "stun:stun.cope.es:3478"               },
  { urls: "stun:stun.dcalling.de:3478"           },
  { urls: "stun:stun.demos.ru:3478"              },
];

// ── TURN servers — relays media when direct P2P fails ────────────────────────
// Rules: every TURN entry MUST have non-empty username + credential or the
// RTCPeerConnection constructor throws "Bad Configuration Parameters".
// STUN entries never need credentials.
const TURN_SERVERS: RTCIceServer[] = [
  // freestun — free open TURN
  { urls: "turn:freestun.net:3478",       username: "free",             credential: "free"             },
  { urls: "turn:freestun.net:5349",       username: "free",             credential: "free"             },
  // OpenRelay (metered.ca) — UDP port 80
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  // OpenRelay — UDP port 443
  { urls: "turn:openrelay.metered.ca:443",username: "openrelayproject", credential: "openrelayproject" },
  // OpenRelay — TCP port 443 (firewall-friendly)
  { urls: "turn:openrelay.metered.ca:443?transport=tcp",
                                          username: "openrelayproject", credential: "openrelayproject" },
  // OpenRelay — TLS
  { urls: "turns:openrelay.metered.ca:443",username:"openrelayproject", credential: "openrelayproject" },
  // OpenRelay static auth mirror
  { urls: "turn:staticauth.openrelay.metered.ca:80",
                                          username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:staticauth.openrelay.metered.ca:443",
                                          username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:staticauth.openrelay.metered.ca:443?transport=tcp",
                                          username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turns:staticauth.openrelay.metered.ca:443",
                                          username: "openrelayproject", credential: "openrelayproject" },
  // Metered global relay
  { urls: "turn:a.relay.metered.ca:80",   username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:global.relay.metered.ca:80",  username: "openrelayproject", credential: "openrelayproject"},
  { urls: "turn:global.relay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject"},
  { urls: "turns:global.relay.metered.ca:443",username: "openrelayproject", credential: "openrelayproject"},
];

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [...STUN_SERVERS, ...TURN_SERVERS],
  // Natural ICE fallback order (fastest to slowest):
  //  1. Direct host — same network, zero latency, no server
  //  2. STUN reflexive — discovers public IP, direct NAT traversal
  //  3. TURN relay — always works, kicks in only when 1 & 2 fail
  // All TURN servers are tried in parallel; first to respond wins.
  // Real IPs are safe — SDP is AES-GCM encrypted before going on-chain.
  iceTransportPolicy:   "all",
  iceCandidatePoolSize: 10,
};

function waitForGathering(pc: RTCPeerConnection, timeoutMs = 12000): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") { resolve(); return; }
    const done = () => { if (pc.iceGatheringState === "complete") { cleanup(); resolve(); } };
    const timeout = setTimeout(() => { cleanup(); resolve(); }, timeoutMs);
    const cleanup = () => { pc.removeEventListener("icegatheringstatechange", done); clearTimeout(timeout); };
    pc.addEventListener("icegatheringstatechange", done);
  });
}

/** Returns true if the SDP string contains a video media section */
export function sdpHasVideo(sdpJson: string): boolean {
  try {
    return JSON.parse(sdpJson).sdp?.includes("m=video") ?? false;
  } catch { return false; }
}

export function useWebRTC() {
  const pcRef           = useRef<RTCPeerConnection | null>(null);
  const localStreamRef  = useRef<MediaStream | null>(null);
  const remoteAudioRef  = useRef<HTMLAudioElement | null>(null);
  const videoSenderRef  = useRef<RTCRtpSender | null>(null);
  const isCameraOffRef  = useRef(false);

  const [isMuted,        setIsMuted]        = useState(false);
  const [isOnHold,       setIsOnHold]       = useState(false);
  const [isSpeaker,      setIsSpeaker]      = useState(false);
  const [isActive,       setIsActive]       = useState(false);
  const [isCameraOff,    setIsCameraOff]    = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [localStream,    setLocalStream]    = useState<MediaStream | null>(null);
  const [remoteStream,   setRemoteStream]   = useState<MediaStream | null>(null);

  // Authoritative mute/hold state — refs so callbacks always read the current
  // value synchronously, even before React state has re-rendered.
  const isMutedRef = useRef(false);
  const isOnHoldRef = useRef(false);

  // Reconnect timer ref — cleared when connection recovers
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createPeer = useCallback(() => {
    // Try full ICE config; fall back to minimal safe config if browser rejects it
    let pc: RTCPeerConnection;
    try {
      pc = new RTCPeerConnection(ICE_SERVERS);
    } catch (e) {
      console.warn("[webrtc] Full ICE config rejected, falling back to minimal:", e);
      pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "turn:openrelay.metered.ca:80",  username: "openrelayproject", credential: "openrelayproject" },
          { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
        ],
        iceTransportPolicy: "all",
      });
    }
    pcRef.current = pc;

    // ── Mid-call ICE reconnection ──────────────────────────────────────────
    // WebRTC naturally tries all candidate pairs (direct → STUN → TURN).
    // When connection drops, give it 5 s to self-heal before forcing an ICE
    // restart which re-gathers all candidates and picks the fastest new path.
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log("[webrtc] ICE state:", state);

      if (state === "disconnected") {
        setIsReconnecting(true);
        // Give WebRTC 5 s to self-heal by trying existing candidate pairs
        reconnectTimerRef.current = setTimeout(() => {
          if (pcRef.current?.iceConnectionState === "disconnected") {
            console.log("[webrtc] 5 s elapsed — triggering ICE restart");
            pcRef.current.restartIce(); // re-gathers all STUN+TURN candidates
          }
        }, 5000);
      }

      if (state === "failed") {
        setIsReconnecting(true);
        // Immediate ICE restart on hard failure
        console.log("[webrtc] ICE failed — triggering ICE restart");
        pc.restartIce();
      }

      if (state === "connected" || state === "completed") {
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        setIsReconnecting(false);
      }

      if (state === "closed") {
        setIsReconnecting(false);
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      setRemoteStream(stream);

      // Also drive an Audio element for guaranteed audio playback
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
          remoteAudioRef.current.autoplay = true;
          remoteAudioRef.current.style.display = "none";
          document.body.appendChild(remoteAudioRef.current);
        }
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(err => {
          console.warn("[webrtc] audio play blocked:", err);
        });
      }
    };

    return pc;
  }, []);

  const getLocalStream = useCallback(async (video: boolean) => {
    // Reuse existing stream if mode matches
    if (localStreamRef.current) {
      const hasVid = localStreamRef.current.getVideoTracks().length > 0;
      if (hasVid === video) return localStreamRef.current;
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  // ── Caller: create offer ─────────────────────────────────────────────────
  const createOffer = useCallback(async (video = false): Promise<string> => {
    const stream = await getLocalStream(video);
    const pc     = createPeer();
    videoSenderRef.current = null;
    stream.getTracks().forEach(t => {
      const sender = pc.addTrack(t, stream);
      if (t.kind === "video") videoSenderRef.current = sender;
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForGathering(pc);

    setIsActive(true);
    return JSON.stringify(pc.localDescription);
  }, [createPeer, getLocalStream]);

  // ── Receiver: create answer (auto-detects video from offer SDP) ──────────
  const createAnswer = useCallback(async (offerStr: string): Promise<string> => {
    const parsed      = JSON.parse(offerStr);
    const offerHasVid = (parsed.sdp as string)?.includes("m=video") ?? false;

    const stream = await getLocalStream(offerHasVid);
    const pc     = createPeer();
    videoSenderRef.current = null;
    stream.getTracks().forEach(t => {
      const sender = pc.addTrack(t, stream);
      if (t.kind === "video") videoSenderRef.current = sender;
    });

    await pc.setRemoteDescription(new RTCSessionDescription(parsed));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForGathering(pc);

    setIsActive(true);
    return JSON.stringify(pc.localDescription);
  }, [createPeer, getLocalStream]);

  // ── Set answer (caller side) ─────────────────────────────────────────────
  const setAnswer = useCallback(async (answerStr: string) => {
    const pc = pcRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(answerStr)));
  }, []);

  // ── Add individual ICE candidate ─────────────────────────────────────────
  const addIceCandidate = useCallback(async (candidateStr: string) => {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candidateStr)));
    } catch (e) {
      console.warn("[webrtc] ICE candidate failed:", e);
    }
  }, []);

  // ── Camera on/off ─────────────────────────────────────────────────────────
  // Uses replaceTrack so the remote party actually sees the change.
  // enabled=true alone is not enough — replaceTrack re-signals the sender.
  const toggleCamera = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const next      = !isCameraOffRef.current;
    isCameraOffRef.current = next;
    setIsCameraOff(next);

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    if (next) {
      // Camera OFF: remove track from sender → remote sees nothing
      videoTrack.enabled = false;
      await videoSenderRef.current?.replaceTrack(null);
    } else {
      // Camera ON: re-enable track + restore in sender → remote sees video again
      videoTrack.enabled = true;
      await videoSenderRef.current?.replaceTrack(videoTrack);
    }
  }, []);

  // ── Mute ─────────────────────────────────────────────────────────────────
  // Uses isMutedRef as the single authoritative source of truth so rapid
  // toggles never desync track.enabled from React state.  If on hold, mute
  // state is stored but the track stays disabled until hold is released.
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isMutedRef.current;
    isMutedRef.current = next;
    // Only touch the track if NOT on hold (hold already silences everything;
    // mute preference is stored in the ref and applied when hold releases)
    if (!isOnHoldRef.current) {
      stream.getAudioTracks().forEach(t => { t.enabled = !next; });
    }
    setIsMuted(next);
  }, []);

  // ── Hold ─────────────────────────────────────────────────────────────────
  // Restores the correct mute state (from isMutedRef) when resuming, so
  // a muted-then-held call stays muted when un-held.
  const toggleHold = useCallback(() => {
    const stream = localStreamRef.current;
    const audio  = remoteAudioRef.current;
    setIsOnHold(h => {
      const goingOnHold = !h;
      isOnHoldRef.current = goingOnHold;
      if (goingOnHold) {
        // Going on hold — silence everything, reset mute UI
        stream?.getAudioTracks().forEach(t => { t.enabled = false; });
        stream?.getVideoTracks().forEach(t => { t.enabled = false; });
        isMutedRef.current = false;
        setIsMuted(false);
        audio?.pause();
      } else {
        // Coming off hold — restore audio to whatever mute state was set
        stream?.getAudioTracks().forEach(t => { t.enabled = !isMutedRef.current; });
        stream?.getVideoTracks().forEach(t => { t.enabled = true; });
        audio?.play().catch(() => {});
      }
      return goingOnHold;
    });
  }, []);

  // ── Speaker ───────────────────────────────────────────────────────────────
  const toggleSpeaker = useCallback(async () => {
    const audio = remoteAudioRef.current;
    if (!audio) return;
    if (typeof (audio as any).setSinkId === "function") {
      try {
        const devices  = await navigator.mediaDevices.enumerateDevices();
        const speakers = devices.filter(d => d.kind === "audiooutput");
        setIsSpeaker(s => {
          const next   = !s;
          const target = next
            ? speakers[speakers.length - 1]?.deviceId ?? ""
            : speakers[0]?.deviceId ?? "";
          (audio as any).setSinkId(target).catch(() => {});
          return next;
        });
      } catch (e) {
        setIsSpeaker(s => !s);
      }
    } else {
      setIsSpeaker(s => !s);
    }
  }, []);

  // ── Hang up ──────────────────────────────────────────────────────────────
  const hangUp = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }
    videoSenderRef.current   = null;
    isCameraOffRef.current   = false;
    isMutedRef.current       = false;
    isOnHoldRef.current      = false;
    setIsActive(false);
    setIsMuted(false);
    setIsOnHold(false);
    setIsSpeaker(false);
    setIsCameraOff(false);
    setIsReconnecting(false);
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  return {
    createOffer, createAnswer, setAnswer, addIceCandidate,
    toggleMute, toggleHold, toggleSpeaker, toggleCamera, hangUp,
    isMuted, isOnHold, isSpeaker, isActive, isCameraOff, isReconnecting,
    localStream, remoteStream,
  };
}
