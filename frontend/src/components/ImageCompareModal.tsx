import React, { useState } from 'react';
import { X, ShieldCheck, Download, Layers, ArrowLeftRight } from 'lucide-react';
import { ResolutionComparison } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  originalUrl?: string;
  annotatedUrl?: string;
  afterRepairUrl?: string | null;
  resolutionComparison?: ResolutionComparison | null;
  incidentNumber: string;
  sha256?: string;
}

export const ImageCompareModal: React.FC<Props> = ({
  isOpen,
  onClose,
  originalUrl,
  annotatedUrl,
  afterRepairUrl,
  resolutionComparison,
  incidentNumber,
  sha256
}) => {
  const [viewMode, setViewMode] = useState<'annotated' | 'original' | 'split' | 'repair'>('annotated');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#172B3A]/70 backdrop-blur-sm">
      <div className="bg-white border border-[#DDE4EC] rounded-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-[#DDE4EC] bg-[#F6F8FA]">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-[#167C80] flex-shrink-0" />
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-[#263746]">
                Evidence Inspection — {incidentNumber}
              </h3>
              <p className="text-[11px] text-[#5A6B7C] font-mono truncate max-w-[260px] sm:max-w-md">
                SHA-256: {sha256 || 'Calculated at intake'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="flex flex-wrap bg-white p-1 rounded-lg border border-[#DDE4EC] text-xs gap-1">
              <button
                onClick={() => setViewMode('annotated')}
                className={`px-2.5 py-1 rounded transition ${viewMode === 'annotated' ? 'bg-[#167C80] text-white font-medium' : 'text-[#5A6B7C] hover:text-[#263746]'}`}
              >
                GeoProof
              </button>
              <button
                onClick={() => setViewMode('original')}
                className={`px-2.5 py-1 rounded transition ${viewMode === 'original' ? 'bg-[#167C80] text-white font-medium' : 'text-[#5A6B7C] hover:text-[#263746]'}`}
              >
                Original
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 rounded transition ${viewMode === 'split' ? 'bg-[#167C80] text-white font-medium' : 'text-[#5A6B7C] hover:text-[#263746]'}`}
              >
                Split Intake
              </button>
              {afterRepairUrl && (
                <button
                  onClick={() => setViewMode('repair')}
                  className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${viewMode === 'repair' ? 'bg-[#39866A] text-white font-medium' : 'text-[#39866A] hover:bg-emerald-50'}`}
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>Before / After</span>
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-lg text-[#5A6B7C] hover:text-[#263746] hover:bg-slate-200/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-auto bg-[#F6F8FA]">
          {viewMode === 'repair' && afterRepairUrl ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg border border-[#DDE4EC] flex flex-col items-center">
                  <span className="text-xs font-semibold text-[#DC4C4C] mb-2 uppercase tracking-wide">
                    Before: Initial Defect Photo
                  </span>
                  <img
                    src={annotatedUrl || originalUrl}
                    alt="Initial defect"
                    className="max-h-[420px] w-auto object-contain rounded"
                  />
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-200 flex flex-col items-center">
                  <span className="text-xs font-semibold text-[#39866A] mb-2 uppercase tracking-wide flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> After: Repair Evidence Photo
                  </span>
                  <img
                    src={afterRepairUrl}
                    alt="After repair"
                    className="max-h-[420px] w-auto object-contain rounded"
                  />
                </div>
              </div>
              {resolutionComparison && (
                <div className="bg-white p-4 rounded-lg border border-[#DDE4EC] text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[#263746]">Automated Before-and-After Surface Assessment</span>
                    <span className="px-2 py-0.5 rounded bg-teal-50 text-[#167C80] border border-teal-200 font-semibold">
                      Change Score: {resolutionComparison.visual_change_score}/100
                    </span>
                  </div>
                  <p className="text-[#263746]">{resolutionComparison.summary}</p>
                  <p className="text-[#5A6B7C]">{resolutionComparison.scene_consistency_note}</p>
                </div>
              )}
            </div>
          ) : viewMode === 'split' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <div className="bg-white p-3 rounded-lg border border-[#DDE4EC] flex flex-col items-center">
                <span className="text-xs font-semibold text-[#5A6B7C] mb-2 uppercase tracking-wide">
                  Original Source Photograph
                </span>
                <img src={originalUrl || annotatedUrl} alt="Original" className="max-h-[460px] w-auto object-contain rounded" />
              </div>
              <div className="bg-white p-3 rounded-lg border border-[#DDE4EC] flex flex-col items-center">
                <span className="text-xs font-semibold text-[#167C80] mb-2 uppercase tracking-wide flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> GeoProof Watermarked Derivative
                </span>
                <img src={annotatedUrl || originalUrl} alt="Annotated" className="max-h-[460px] w-auto object-contain rounded" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              <div className="rounded-lg overflow-hidden border border-[#DDE4EC] bg-white p-2 flex items-center justify-center shadow-sm">
                <img
                  src={viewMode === 'annotated' ? (annotatedUrl || originalUrl) : (originalUrl || annotatedUrl)}
                  alt="Evidence"
                  className="max-h-[520px] w-auto object-contain rounded"
                />
              </div>
              <p className="mt-3 text-xs text-[#5A6B7C] text-center max-w-xl">
                {viewMode === 'annotated'
                  ? 'Watermarked GeoProof derivative displaying recorded coordinates, location source provenance, accuracy radius, and timestamp. Watermarks and hashes document integrity from upload onward; they do not prove where an older gallery image was originally taken.'
                  : 'Original unmodified photograph preserved separately with its intake SHA-256 checksum.'}
              </p>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-[#DDE4EC] bg-white flex items-center justify-between text-xs text-[#5A6B7C]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#39866A]"></span>
            <span>Intake Checksum Recorded</span>
          </div>
          <a
            href={annotatedUrl || originalUrl}
            download={`${incidentNumber}_evidence.jpg`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#167C80] hover:bg-[#116265] text-white font-medium transition"
          >
            <Download className="w-3.5 h-3.5" /> Download Asset
          </a>
        </div>
      </div>
    </div>
  );
};
