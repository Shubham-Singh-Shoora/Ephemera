import React from 'react';
import { Shield, Lock, Server, Cpu } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-surface-border bg-[#0B101D]/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-white tracking-tight">AEGIS</span>
              <span className="text-xs bg-surface-raised border border-surface-border text-gray-300 px-2 py-0.5 rounded font-mono">
                DATA ROOM
              </span>
            </div>
            <p className="text-[11px] text-gray-400">Zero-Trace Confidential AI Vault</p>
          </div>
        </div>

        {/* Institutional System Status */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="hidden sm:flex items-center space-x-2 bg-surface-raised border border-surface-border px-2.5 py-1 rounded-md text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Storage: Ephemeral</span>
          </div>
          <div className="hidden md:flex items-center space-x-2 bg-surface-raised border border-surface-border px-2.5 py-1 rounded-md text-gray-300">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>Compute: RAM-Only</span>
          </div>
          <div className="flex items-center space-x-1.5 text-gray-400 border border-surface-border/60 bg-surface/50 px-2.5 py-1 rounded-md">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Sepolia Testnet</span>
          </div>
        </div>
      </div>
    </header>
  );
}
