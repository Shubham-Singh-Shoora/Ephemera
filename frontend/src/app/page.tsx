'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { DataRoomUploader } from '@/components/DataRoomUploader';
import { LiveRoomMonitor } from '@/components/LiveRoomMonitor';
import { ConfidentialAnalysis } from '@/components/ConfidentialAnalysis';
import { AuditProofModal } from '@/components/AuditProofModal';
import { Shield, Sparkles, ArrowRight, Lock, CheckCircle2, RotateCcw } from 'lucide-react';

export default function Home() {
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const handleRoomCreated = (roomData: any) => {
    setActiveRoom(roomData);
    setIsExpired(false);
  };

  const handleExpire = () => {
    setIsExpired(true);
  };

  const handleReset = () => {
    setActiveRoom(null);
    setIsExpired(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090D16]">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Executive Hero Intro */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>Zero-Trace Decentralized Infrastructure</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Confidential AI Workspaces with Guaranteed Physical Erasure
          </h1>
          <p className="text-sm sm:text-base text-gray-400 mt-3 leading-relaxed">
            Expose confidential trading algorithms, patient medical cohorts, or merger contracts to AI reasoning without storing them in centralized cloud buckets. The AI executes strictly in memory—and when the timer expires, the underlying files vanish globally.
          </p>
        </div>

        {/* Dynamic Workflow Area */}
        {!activeRoom ? (
          <div>
            <DataRoomUploader onRoomCreated={handleRoomCreated} />

            {/* Architecture Explainer Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
              <div className="bg-[#111726]/60 border border-[#23304B] p-5 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-medium text-white">1. Client-Side Encryption</h3>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  Your dataset is shredded into 4KB Merkle chunks and encrypted locally with AES-256-GCM before leaving your computer.
                </p>
              </div>

              <div className="bg-[#111726]/60 border border-[#23304B] p-5 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-medium text-white">2. In-Memory Execution</h3>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  The AI loads chunks directly into hardware-protected RAM. No temporary files or database rows are ever written to disk.
                </p>
              </div>

              <div className="bg-[#111726]/60 border border-[#23304B] p-5 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-medium text-white">3. Network-Wide Pruning</h3>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  Once your postage batch timer expires, storage nodes automatically discard chunks. There is no central master copy to seize.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Bar with Reset Option */}
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                Active Session Dashboard
              </span>
              <button
                onClick={handleReset}
                className="text-xs text-gray-400 hover:text-white flex items-center space-x-1.5 bg-[#172033] px-3 py-1.5 rounded-lg border border-[#23304B] transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Create New Data Room</span>
              </button>
            </div>

            {/* Room Monitor with Countdown */}
            <LiveRoomMonitor
              roomData={activeRoom}
              onExpire={handleExpire}
              onOpenAudit={() => setIsAuditModalOpen(true)}
            />

            {/* AI Reasoning Console */}
            <ConfidentialAnalysis
              roomData={activeRoom}
              isExpired={isExpired}
            />

            {/* Audit Modal */}
            {isAuditModalOpen && (
              <AuditProofModal
                roomData={activeRoom}
                onClose={() => setIsAuditModalOpen(false)}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#23304B] bg-[#0B101D] py-6 mt-12 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>Aegis Zero-Trace Data Room • Powered by Ethereum Swarm & TEE Enclaves</span>
          <span>Local Development Build (Testing Mode)</span>
        </div>
      </footer>
    </div>
  );
}
