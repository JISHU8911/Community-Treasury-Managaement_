"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStellarWallet } from "../hooks/use-stellar-wallet";
import { Coins, LayoutDashboard, Vote, Activity, History, Wallet, Check, AlertCircle, ArrowDownLeft } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { address, balance, connect, connectMock, disconnect, isConnecting } = useStellarWallet();

  const isMock = process.env.NEXT_PUBLIC_MOCK_BLOCKCHAIN === "true" || !process.env.NEXT_PUBLIC_CONTRACT_ID || process.env.NEXT_PUBLIC_CONTRACT_ID === "CCDAO_TREASURY_MOCK_CONTRACT_ID";

  const truncateAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const navLinks = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Treasury proposals", href: "/treasury", icon: Vote },
    { name: "Deposit reserves", href: "/deposit", icon: ArrowDownLeft },
    { name: "Activity feed", href: "/activity", icon: Activity },
    { name: "Transactions", href: "/transactions", icon: History },
    { name: "Wallet settings", href: "/wallet", icon: Wallet },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/8 bg-[#07090e]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400">
            <Coins className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <Link href="/" className="font-bold text-lg tracking-tight gradient-text">
              TreasuryDAO
            </Link>
            {isMock && (
              <span className="ml-2 px-1.5 py-0.5 text-[9px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-400/20 rounded">
                SIMULATION
              </span>
            )}
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-violet-500/10 text-violet-300 border border-violet-500/20"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Action Controls / Wallet trigger */}
        <div className="flex items-center gap-3">
          {address ? (
            <div className="flex items-center gap-3">
              {/* Truncated address & balance display */}
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs text-gray-400 font-medium">
                  {truncateAddress(address)}
                </span>
                <span className="text-xs font-bold text-violet-400">
                  {balance} XLM
                </span>
              </div>
              <button
                onClick={disconnect}
                className="px-4 py-2 text-xs font-semibold text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all glow-hover"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 animate-fade-in">
              {isMock && (
                <button
                  onClick={connectMock}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-cyan-400 border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors shrink-0"
                >
                  Demo Account
                </button>
              )}
              <button
                onClick={connect}
                disabled={isConnecting}
                className="px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 border border-violet-500/30 rounded-xl transition-all shadow-md shadow-violet-950/20"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
