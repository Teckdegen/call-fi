"use client";
import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { createWeb3Modal }    from "@web3modal/wagmi/react";
import { somniaTestnet }      from "./chain";
import { cookieStorage, createStorage } from "wagmi";

export const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "";

const metadata = {
  name:        "Call Fi",
  description: "On-chain voice calls with crypto payments, powered by Somnia Reactivity.",
  url:         "https://callfi.vercel.app",
  icons:       ["https://callfi.vercel.app/icon.png"],
};

export const wagmiConfig = defaultWagmiConfig({
  chains:    [somniaTestnet],
  projectId,
  metadata,
  ssr:       true,
  storage:   createStorage({ storage: cookieStorage }),
});

// Initialise Web3Modal — runs once at module load (client-side only)
createWeb3Modal({
  wagmiConfig,
  projectId,
  enableAnalytics:   false,
  enableOnramp:      false,
  themeMode:         "light",
  themeVariables: {
    "--w3m-font-family":        "Space Mono, monospace",
    "--w3m-accent":             "#0A0A0A",
    "--w3m-border-radius-master": "0px",
  },
});
