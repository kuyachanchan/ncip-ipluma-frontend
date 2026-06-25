// components/UploadPanel.tsx
import React from 'react';
import { Upload, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

interface UploadPanelProps {
  onPdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  file: File | null;
}

export const UploadPanel: React.FC<UploadPanelProps> = ({
  onPdfUpload,
  file,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <Upload className="w-5 h-5 text-slate-600" />
        <h3 className="font-semibold text-slate-800">Upload Document</h3>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            PDF Document
          </label>
          <Input
            type="file"
            accept="application/pdf"
            onChange={onPdfUpload}
            className="cursor-pointer"
          />
          {file && (
            <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="truncate">{file.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};