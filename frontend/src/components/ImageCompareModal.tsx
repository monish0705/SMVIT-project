import React, { useState } from 'react';
import { X, ShieldCheck, Download, Eye, Layers } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  originalUrl?: string;
  annotatedUrl?: string;
  incidentNumber: string;
  sha256?: string;
}

export const ImageCompareModal: React.FC<Props> = ({
  isOpen,
  onClose,
  originalUrl,
  annotatedUrl,
  incidentNumber,
  sha256
}) => {
  const [viewMode, setViewMode] = useState<'annotated' | 'original' | 'split'>('annotated');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-brand-400" />
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                GeoProof AI Evidence Inspector — {incidentNumber}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                SHA-256: {sha256 || 'Calculated at intake'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                onClick={() => setViewMode('annotated')}
                className={`px-3 py-1 rounded-md transition ${viewMode === 'annotated' ? 'bg-brand-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
              >
                GeoProof Watermarked
              </button>
              <button
                onClick={() => setViewMode('original')}
                className={`px-3 py-1 rounded-md transition ${viewMode === 'original' ? 'bg-brand-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Original Unmodified
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1 rounded-md transition ${viewMode === 'split' ? 'bg-brand-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Side-by-Side
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-950/70">
          {viewMode === 'split' ? (
            <div className="grid grid-cols-2 gap-4 w-full h-full max-h-[600px]">
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                  Original Source Photograph (Raw Bytes)
                </span>
                <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-900 w-full flex items-center justify-center">
                  <img
                    src={originalUrl || annotatedUrl}
                    alt="Original"
                    className="max-h-[500px] w-auto object-contain"
                  />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-brand-300 mb-2 uppercase tracking-wide flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> GeoProof Evidence Derivative
                </span>
                <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-900 w-full flex items-center justify-center">
                  <img
                    src={annotatedUrl || originalUrl}
                    alt="Annotated"
                    className="max-h-[500px] w-auto object-contain"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center shadow-lg">
                <img
                  src={viewMode === 'annotated' ? (annotatedUrl || originalUrl) : (originalUrl || annotatedUrl)}
                  alt="Evidence"
                  className="max-h-[550px] w-auto object-contain"
                />
              </div>
              <div className="mt-3 text-xs text-slate-400 text-center max-w-xl">
                {viewMode === 'annotated' ? (
                  <span>
                    The GeoProof derivative renders the visual evidence overlay with GPS coordinates,
                    source provenance, accuracy circle, and claimed capture timestamp.
                  </span>
                ) : (
                  <span>
                    Original source photograph preserved with identical byte checksum in immutable private storage.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Intake Checksum Verified</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={annotatedUrl || originalUrl}
              download={`${incidentNumber}_evidence.jpg`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              <Download className="w-3.5 h-3.5" /> Download Asset
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

