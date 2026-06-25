// components/StatusPanel.tsx
import React from 'react';
import { Layers } from "lucide-react";


interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface StatusPanelProps {
  file: File | null;
  certificate: File | undefined;
  signatureFile: File | null;
  signaturePlacements: Map<number, Rect>;
  multiPageMode: boolean;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({
  file,
  certificate,
  signatureFile,
  signaturePlacements,
  multiPageMode,
}) => {
  const getSignedPages = (): string => {
    const pages = Array.from(signaturePlacements.keys()).sort((a, b) => a - b);
    if (pages.length === 0) return "None";
    if (pages.length === 1) return `Page ${pages[0]}`;
    return `Pages: ${pages.join(", ")}`;
  };

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-800 mb-4">Signing Status</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${signaturePlacements.size > 0 ? 'bg-green-500' : 'bg-slate-300'}`} />
            <span className="text-sm text-slate-600">{getSignedPages()}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${file ? 'bg-green-500' : 'bg-slate-300'}`} />
            <span className="text-sm text-slate-600">PDF Loaded</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${certificate ? 'bg-green-500' : 'bg-slate-300'}`} />
            <span className="text-sm text-slate-600">Certificate Selected</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${signatureFile ? 'bg-green-500' : 'bg-slate-300'}`} />
            <span className="text-sm text-slate-600">Signature Image</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${signaturePlacements.size > 0 ? 'bg-green-500' : 'bg-slate-300'}`} />
            <span className="text-sm text-slate-600">Signature Placed</span>
          </div>
        </div>
      </div>

      {multiPageMode && signaturePlacements.size > 0 && (
        <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-purple-900">Multi-Page Signing</h3>
          </div>
          <p className="text-sm text-purple-800 mb-3">
            Signatures on: {Array.from(signaturePlacements.keys()).sort((a, b) => a - b).join(", ")}
          </p>
          <p className="text-xs text-purple-700">
            Navigate between pages to view all signatures.
          </p>
        </div>
      )}
    </div>
  );
};