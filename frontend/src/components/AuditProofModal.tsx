'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface AuditProofModalProps {
  roomData: {
    swarmReference: string;
    batchId: string;
    ephemeralKey: string;
    fileName: string;
    byteSize: number;
    chunkCount: number;
    ttlSeconds: number;
  };
  onClose: () => void;
}

export function AuditProofModal({ roomData, onClose }: AuditProofModalProps) {
  const [showKey, setShowKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#111726] border border-[#23304B] rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-emerald-400 mb-2">
          <ShieldCheck className="w-5 h-5" />
          <h3 className="text-base font-medium text-white">Cryptographic Audit Proof</h3>
        </div>
        <p className="text-xs text-gray-400 mb-6">
          Raw decentralized storage hashes and cryptographic keys for technical verification.
        </p>

        <div className="space-y-4 text-xs font-mono">
          {/* Swarm Reference */}
          <div className="bg-[#090D16] p-3 rounded-lg border border-[#23304B]">
            <div className="flex justify-between items-center text-gray-400 mb-1">
              <span>Swarm Reference (Hash)</span>
              <button
                onClick={() => copyToClipboard(roomData.swarmReference, 'ref')}
                className="hover:text-emerald-400 transition"
              >
                {copiedField === 'ref' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-gray-200 break-all text-[11px]">{roomData.swarmReference}</p>
          </div>

          {/* Postage Batch ID */}
          <div className="bg-[#090D16] p-3 rounded-lg border border-[#23304B]">
            <div className="flex justify-between items-center text-gray-400 mb-1">
              <span>Postage Stamp Batch ID</span>
              <button
                onClick={() => copyToClipboard(roomData.batchId, 'batch')}
                className="hover:text-emerald-400 transition"
              >
                {copiedField === 'batch' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-gray-200 break-all text-[11px]">{roomData.batchId}</p>
          </div>

          {/* Ephemeral Key */}
          <div className="bg-[#090D16] p-3 rounded-lg border border-[#23304B]">
            <div className="flex justify-between items-center text-gray-400 mb-1">
              <span>Ephemeral AES-256 Key (Blind Handoff)</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="hover:text-gray-200 transition"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => copyToClipboard(roomData.ephemeralKey, 'key')}
                  className="hover:text-emerald-400 transition"
                >
                  {copiedField === 'key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <p className="text-gray-200 break-all text-[11px]">
              {showKey ? roomData.ephemeralKey : '•'.repeat(48)}
            </p>
          </div>

          {/* Chunks & TTL */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#090D16] p-3 rounded-lg border border-[#23304B]">
              <span className="text-gray-400 block mb-1">Shredded Merkle Chunks</span>
              <span className="text-gray-200 text-sm font-semibold">{roomData.chunkCount} (4KB each)</span>
            </div>
            <div className="bg-[#090D16] p-3 rounded-lg border border-[#23304B]">
              <span className="text-gray-400 block mb-1">Total Payload Size</span>
              <span className="text-gray-200 text-sm font-semibold">{roomData.byteSize} Bytes</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#23304B] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#172033] hover:bg-[#1E293B] border border-[#23304B] text-gray-200 px-4 py-2 rounded-lg text-xs font-medium transition"
          >
            Close Audit View
          </button>
        </div>
      </div>
    </div>
  );
}
