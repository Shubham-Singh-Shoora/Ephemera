'use client';

import React, { useState } from 'react';
import { Lock, Clock, FileText, Upload, CheckCircle2, TrendingUp, Activity, Scale } from 'lucide-react';

interface DataRoomUploaderProps {
  onRoomCreated: (roomData: any) => void;
}

const PRESET_DATASETS = {
  finance: {
    name: 'Apex Quant Capital - Trade Execution Logs',
    industry: 'finance',
    filename: 'apex_trades_2026_q1.json',
    sample: JSON.stringify({
      fund: "Apex Quantitative Capital Ltd",
      reportingPeriod: "2026-Q1",
      strategy: "High-frequency cross-venue statistical arbitrage",
      confidentialTrades: [
        {
          tradeId: "APEX-TRD-882194",
          asset: "BTC-PERP / CME-BTC",
          action: "LONG_SPREAD",
          notionalUSD: 45000000,
          venue: "Dark Pool D",
          auditFlag: "CLEARED"
        },
        {
          tradeId: "APEX-TRD-882195",
          asset: "NVDA / SOX-BASKET",
          action: "SHORT_VOLATILITY",
          notionalUSD: 28000000,
          venue: "Venue B",
          auditFlag: "ANOMALY_HIGH_SLIPPAGE"
        }
      ],
      analystNotes: "Trade 882195 experienced unexpected slippage (0.14% vs modeled 0.03%) on Venue B. Model weights require in-memory adjustment before market open."
    }, null, 2)
  },
  healthcare: {
    name: 'AIIMS Oncology - Clinical Trial TX-409',
    industry: 'healthcare',
    filename: 'patient_cohort_tx409.json',
    sample: JSON.stringify({
      hospital: "AIIMS New Delhi - Oncology & Genomic Research Center",
      classification: "CONFIDENTIAL CLINICAL TRIAL TX-409",
      patient: {
        uhid: "AIIMS-2026-904128",
        diagnosis: "Non-Small Cell Lung Carcinoma (NSCLC) - Stage IIIB",
        genomicMarkers: "EGFR Exon 19 deletion | PD-L1 High (72%)",
        trialDrug: "TX-409 (Bispecific Antibody-Drug Conjugate)",
        dosage: "3.2 mg/kg IV q3w",
        tumorVolumeReduction: "34.8% reduction observed at cycle 4",
        physicianNotes: "Marked response to TX-409. Cross-reference concomitant beta-blocker therapy before approving dose escalation."
      }
    }, null, 2)
  },
  legal: {
    name: 'NexusCore Merger & Acquisition Agreement',
    industry: 'legal',
    filename: 'project_titan_merger.md',
    sample: `# CONFIDENTIAL AGREEMENT AND PLAN OF MERGER
**Project Titan - STRICTLY PRIVATE & CONFIDENTIAL**
Parties: CyberScale Dynamics Inc. ("Acquirer") and NexusCore AI Ltd. ("Target")

## 1. PURCHASE CONSIDERATION
1.1 Aggregate purchase price is $420,000,000 USD payable 65% cash and 35% common stock.
1.2 Contingent earnout milestone of up to $80,000,000 USD upon certified GAAP ARR > $65M.

## 2. INTELLECTUAL PROPERTY & INDEMNIFICATION
2.1 Target warrants neural architecture ("Nexus-V5") was trained exclusively on authorized corpora.
2.2 Target's maximum indemnification liability for IP warranties is strictly capped at $42,000,000 USD (10% of transaction value).

## 3. REGULATORY CLEARANCE
3.1 Reverse termination breakup fee of $25,000,000 USD payable if blocked on antitrust grounds.`
  }
};

export function DataRoomUploader({ onRoomCreated }: DataRoomUploaderProps) {
  const [selectedPreset, setSelectedPreset] = useState<'finance' | 'healthcare' | 'legal'>('finance');
  const [content, setContent] = useState(PRESET_DATASETS.finance.sample);
  const [fileName, setFileName] = useState(PRESET_DATASETS.finance.filename);
  const [industry, setIndustry] = useState(PRESET_DATASETS.finance.industry);
  const [ttlMinutes, setTtlMinutes] = useState(60);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPreset = (key: 'finance' | 'healthcare' | 'legal') => {
    setSelectedPreset(key);
    setContent(PRESET_DATASETS[key].sample);
    setFileName(PRESET_DATASETS[key].filename);
    setIndustry(PRESET_DATASETS[key].industry);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setContent(text);
      setIndustry(file.name.endsWith('.json') ? 'finance' : 'general');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          fileName,
          industry,
          ttlMinutes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create data room');

      onRoomCreated(data);
    } catch (err: any) {
      setError(err.message || 'Error creating data room');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-[#111726] border border-[#23304B] rounded-xl p-6 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#23304B] gap-4">
        <div>
          <h2 className="text-lg font-medium text-white flex items-center space-x-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            <span>Create a Self-Destructing Data Room</span>
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Data is encrypted locally and erased worldwide as soon as your timer hits zero.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center space-x-2 bg-[#090D16] p-1 rounded-lg border border-[#23304B]">
          <button
            type="button"
            onClick={() => handleSelectPreset('finance')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              selectedPreset === 'finance'
                ? 'bg-[#172033] text-emerald-400 border border-emerald-500/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Finance</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset('healthcare')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              selectedPreset === 'healthcare'
                ? 'bg-[#172033] text-emerald-400 border border-emerald-500/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Healthcare</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset('legal')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              selectedPreset === 'legal'
                ? 'bg-[#172033] text-emerald-400 border border-emerald-500/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Legal M&A</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Document Editor / Preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-300 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <span>Document Content ({fileName})</span>
            </label>
            <label className="cursor-pointer text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1">
              <Upload className="w-3 h-3" />
              <span>Upload Custom File</span>
              <input
                type="file"
                className="hidden"
                accept=".json,.md,.txt,.csv"
                onChange={handleFileUpload}
              />
            </label>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full bg-[#090D16] border border-[#23304B] rounded-lg p-3 text-xs font-mono text-gray-300 focus:outline-none focus:border-emerald-500/60 transition resize-none"
            placeholder="Paste your confidential records or data payload here..."
            required
          />
        </div>

        {/* Expiration Timer Selector */}
        <div>
          <label className="text-xs font-medium text-gray-300 flex items-center space-x-1.5 mb-2">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Self-Destruct Expiration Timer</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '15 Minutes (Demo)', value: 15 },
              { label: '2 Hours (Standard)', value: 120 },
              { label: '24 Hours (Prolonged)', value: 1440 }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTtlMinutes(option.value)}
                className={`py-2.5 px-3 rounded-lg border text-xs font-medium text-center transition ${
                  ttlMinutes === option.value
                    ? 'bg-[#172033] border-amber-500/50 text-amber-300 shadow-sm'
                    : 'bg-[#090D16] border-[#23304B] text-gray-400 hover:border-gray-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isUploading || !content}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-4 rounded-lg text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Encrypting & Shredding Chunks into Swarm...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Encrypt & Open Zero-Trace Data Room</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
