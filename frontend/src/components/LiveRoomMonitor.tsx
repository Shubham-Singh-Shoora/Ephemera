'use client';

import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert, ShieldCheck, Flame, ExternalLink, RefreshCw } from 'lucide-react';

interface LiveRoomMonitorProps {
  roomData: {
    swarmReference: string;
    batchId: string;
    ephemeralKey: string;
    fileName: string;
    industry: string;
    byteSize: number;
    chunkCount: number;
    ttlSeconds: number;
    expiresAt: number;
  };
  onExpire: () => void;
  onOpenAudit: () => void;
}

export function LiveRoomMonitor({ roomData, onExpire, onOpenAudit }: LiveRoomMonitorProps) {
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isExpiring, setIsExpiring] = useState<boolean>(false);

  useEffect(() => {
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((roomData.expiresAt - Date.now()) / 1000));
      setTimeLeftSeconds(remaining);
      if (remaining === 0) {
        setIsExpired(true);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [roomData.expiresAt]);

  const handleManualExpire = async () => {
    setIsExpiring(true);
    try {
      const res = await fetch('/api/expire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ swarmReference: roomData.swarmReference })
      });
      if (res.ok) {
        setIsExpired(true);
        setTimeLeftSeconds(0);
        onExpire();
      }
    } catch (err) {
      console.error('Failed to trigger expiration', err);
    } finally {
      setIsExpiring(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`border rounded-xl p-6 transition shadow-xl ${
      isExpired
        ? 'bg-[#181116] border-red-900/60'
        : 'bg-[#111726] border-[#23304B]'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#23304B] gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-medium text-white">{roomData.fileName}</h3>
            <span className="text-[11px] bg-[#172033] border border-[#23304B] text-gray-300 px-2 py-0.5 rounded capitalize">
              {roomData.industry}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Size: {(roomData.byteSize / 1024).toFixed(1)} KB • {roomData.chunkCount} Encrypted 4KB Chunks
          </p>
        </div>

        {/* Status Badge */}
        <div>
          {isExpired ? (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-950/80 border border-red-700/60 text-red-300">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>ERASED GLOBALLY (404)</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/80 border border-emerald-600/50 text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ACTIVE & SECURE</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-center">
        {/* Countdown Timer Display */}
        <div className="bg-[#090D16] border border-[#23304B] rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isExpired ? 'bg-red-950/40 text-red-400' : 'bg-amber-950/40 text-amber-400'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
                {isExpired ? 'Self-Destruct Status' : 'Automatic Self-Destruct In'}
              </p>
              <p className={`text-2xl font-mono font-bold ${
                isExpired ? 'text-red-400' : 'text-amber-300'
              }`}>
                {isExpired ? 'EXPIRED (00:00)' : formatTimer(timeLeftSeconds)}
              </p>
            </div>
          </div>

          <span className="text-xs text-gray-400 font-mono">
            {isExpired ? '0 Chunks Online' : `${roomData.chunkCount} Chunks Seeded`}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!isExpired ? (
            <button
              onClick={handleManualExpire}
              disabled={isExpiring}
              className="flex-1 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 py-3 px-4 rounded-lg text-xs font-medium transition flex items-center justify-center space-x-2"
            >
              {isExpiring ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Flame className="w-3.5 h-3.5 text-red-400" />
              )}
              <span>Trigger Self-Destruct Now</span>
            </button>
          ) : (
            <div className="flex-1 bg-[#181116] border border-red-900/50 p-3 rounded-lg text-xs text-red-300 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
              <span>All 4KB chunks dropped. Subsequent requests will return 404.</span>
            </div>
          )}

          <button
            onClick={onOpenAudit}
            className="bg-[#172033] hover:bg-[#1E293B] border border-[#23304B] text-gray-300 hover:text-white py-3 px-4 rounded-lg text-xs font-medium transition flex items-center justify-center space-x-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Audit Proof</span>
          </button>
        </div>
      </div>
    </div>
  );
}
