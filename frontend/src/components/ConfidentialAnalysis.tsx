'use client';

import React, { useState } from 'react';
import { Search, ShieldAlert, Cpu, Sparkles, AlertCircle, CheckCircle, Database } from 'lucide-react';

interface ConfidentialAnalysisProps {
  roomData: {
    swarmReference: string;
    ephemeralKey: string;
    industry: string;
  };
  isExpired: boolean;
}

export function ConfidentialAnalysis({ roomData, isExpired }: ConfidentialAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'rag' | 'audit' | 'lora'>('rag');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Suggested prompts based on active industry
  const getSuggestedPrompts = () => {
    if (roomData.industry === 'finance') {
      return [
        'Which trade had anomalous slippage?',
        'What is the fund max drawdown limit?'
      ];
    } else if (roomData.industry === 'healthcare') {
      return [
        'What is the tumor volume reduction percentage?',
        'Are there any drug interaction warnings?'
      ];
    } else {
      return [
        'What is the maximum liability indemnification cap?',
        'What is the regulatory breakup fee?'
      ];
    }
  };

  const handleRunTask = async (taskType: 'rag' | 'audit' | 'lora', customQuery?: string) => {
    if (isExpired) return;
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    const q = customQuery !== undefined ? customQuery : query;

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          swarmReference: roomData.swarmReference,
          ephemeralKey: roomData.ephemeralKey,
          taskType,
          query: q
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Inference failed');
      }

      setAnalysisResult(data);
    } catch (err: any) {
      setError(err.message || 'Execution error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#111726] border border-[#23304B] rounded-xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#23304B] gap-3">
        <div>
          <h3 className="text-base font-medium text-white flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            <span>Confidential In-Memory Analysis</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Executed strictly within RAM buffers. Zero copies written to disk or centralized logs.
          </p>
        </div>

        {/* Task Tabs */}
        <div className="flex items-center space-x-1 bg-[#090D16] p-1 rounded-lg border border-[#23304B]">
          <button
            onClick={() => { setActiveTab('rag'); setAnalysisResult(null); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === 'rag'
                ? 'bg-[#172033] text-blue-400 border border-blue-500/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Ask Questions (RAG)
          </button>
          <button
            onClick={() => { setActiveTab('audit'); setAnalysisResult(null); handleRunTask('audit'); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === 'audit'
                ? 'bg-[#172033] text-blue-400 border border-blue-500/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Compliance Audit
          </button>
          <button
            onClick={() => { setActiveTab('lora'); setAnalysisResult(null); handleRunTask('lora'); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === 'lora'
                ? 'bg-[#172033] text-blue-400 border border-blue-500/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Model Training (LoRA)
          </button>
        </div>
      </div>

      {isExpired ? (
        <div className="mt-6 p-6 bg-[#181116] border border-red-900/60 rounded-xl text-center">
          <ShieldAlert className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-red-200">Data Room Physically Ceased to Exist</h4>
          <p className="text-xs text-red-400/80 mt-1 max-w-md mx-auto">
            The postage batch expired on the decentralized network. Storage nodes have purged all 4KB chunks. No AI inference can run on this session.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {activeTab === 'rag' && (
            <div>
              {/* Question Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRunTask('rag'); }}
                    placeholder="Ask a question about the confidential dataset..."
                    className="w-full bg-[#090D16] border border-[#23304B] rounded-lg pl-9 pr-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500/60 transition"
                  />
                </div>
                <button
                  onClick={() => handleRunTask('rag')}
                  disabled={isLoading || !query}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : 'Run Query'}
                </button>
              </div>

              {/* Prompt Suggestions */}
              <div className="flex items-center space-x-2 mt-2.5 flex-wrap gap-y-1">
                <span className="text-[11px] text-gray-500">Quick queries:</span>
                {getSuggestedPrompts().map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setQuery(p); handleRunTask('rag', p); }}
                    className="text-[11px] bg-[#090D16] hover:bg-[#172033] border border-[#23304B] text-gray-400 hover:text-gray-200 px-2 py-0.5 rounded transition"
                  >
                    "{p}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Display */}
          {analysisResult && (
            <div className="bg-[#090D16] border border-[#23304B] rounded-lg p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#23304B]">
                <div className="flex items-center space-x-2 text-xs text-emerald-400 font-medium">
                  <CheckCircle className="w-4 h-4" />
                  <span>Execution Complete ({analysisResult.executionTimeMs}ms)</span>
                </div>
                <div className="flex items-center space-x-1.5 text-[11px] bg-emerald-950/50 border border-emerald-800/40 text-emerald-300 px-2.5 py-0.5 rounded-full font-mono">
                  <span>RAM Scrubbed (0x00)</span>
                </div>
              </div>

              {/* Task Result Content */}
              {activeTab === 'rag' && analysisResult.result && (
                <div className="space-y-3">
                  <div>
                    <h5 className="text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-1">
                      Synthesized In-Memory Answer
                    </h5>
                    <p className="text-sm text-gray-200 leading-relaxed bg-[#111726] p-3 rounded-lg border border-[#23304B]/60">
                      {analysisResult.result.answer}
                    </p>
                  </div>
                  {analysisResult.result.evidenceSnippet && (
                    <div>
                      <h5 className="text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-1">
                        Verified Evidence Excerpt
                      </h5>
                      <p className="text-xs text-gray-400 font-mono bg-[#111726] p-2.5 rounded-lg border border-[#23304B]/60">
                        "{analysisResult.result.evidenceSnippet}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'audit' && analysisResult.result && (
                <div className="space-y-3">
                  <div>
                    <h5 className="text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-1">
                      Audit Assessment
                    </h5>
                    <p className="text-xs text-gray-300 bg-[#111726] p-3 rounded-lg border border-[#23304B]/60">
                      {analysisResult.result.summary}
                    </p>
                  </div>
                  <div>
                    <h5 className="text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-1">
                      Compliance & Risk Flags ({analysisResult.result.riskFlags?.length})
                    </h5>
                    <div className="space-y-1.5">
                      {analysisResult.result.riskFlags?.map((flag: string, idx: number) => (
                        <div key={idx} className="text-xs text-amber-300 bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-md">
                          • {flag}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'lora' && analysisResult.result && (
                <div className="space-y-3 text-xs">
                  <div>
                    <h5 className="text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-1">
                      Ephemeral Fine-Tuning Parameter Receipt
                    </h5>
                    <div className="bg-[#111726] p-3 rounded-lg border border-[#23304B]/60 space-y-2 font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Target Model:</span>
                        <span className="text-gray-200">{analysisResult.result.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">LoRA Rank:</span>
                        <span className="text-gray-200">r={analysisResult.result.rank}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Loss Reduction:</span>
                        <span className="text-emerald-400">{analysisResult.result.lossDelta}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Weight Delta Hash:</span>
                        <span className="text-blue-400">{analysisResult.result.weightDeltaHash?.slice(0, 20)}...</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 italic">
                    Training complete. Parameter deltas exported. All underlying training data was scrubbed from RAM with zero residual footprint.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
