// components/PageNavigation.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Copy, X, CheckCircle } from "lucide-react";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PDFDocument {
  numPages: number;
  // Add other properties you use from the PDF object
}

interface PageNavigationProps {
  pdf: PDFDocument;
  currentPage: number;
  signaturePosition: Rect | null;
  signatureImg: HTMLImageElement | null;
  signaturePlacements: Map<number, Rect>;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onPageChange: (page: number) => void;
  onCopyToPages: () => void;
  onRemoveSignature: () => void;
  onSubmit: () => void;
}

export const PageNavigation: React.FC<PageNavigationProps> = ({
  pdf,
  currentPage,
  signaturePosition,
  signatureImg,
  signaturePlacements,
  onPreviousPage,
  onNextPage,
  onPageChange,
  onCopyToPages,
  onRemoveSignature,
  onSubmit,
}) => {
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pageNum = parseInt(e.target.value, 10);
    if (pdf && pageNum >= 1 && pageNum <= pdf.numPages) {
      onPageChange(pageNum);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            onClick={onPreviousPage}
            disabled={currentPage === 1}
            size="sm"
            variant="outline"
            className="h-9"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Page</span>
            <Input
              type="number"
              min="1"
              max={pdf.numPages}
              value={currentPage}
              onChange={handlePageInputChange}
              className="w-16 h-9 text-center"
            />
            <span className="text-sm text-slate-600">of {pdf.numPages}</span>
          </div>
          <Button
            onClick={onNextPage}
            disabled={currentPage === pdf.numPages}
            size="sm"
            variant="outline"
            className="h-9"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {signaturePosition && signatureImg && (
          <>
            <Button
              onClick={onCopyToPages}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy to Pages
            </Button>
            <Button
              onClick={onRemoveSignature}
              size="sm"
              variant="outline"
              className="gap-2 text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4" />
              Remove
            </Button>
          </>
        )}

        {signaturePlacements.size > 0 && (
          <Button
            onClick={onSubmit}
            className="bg-green-600 hover:bg-green-700 gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Submit ({signaturePlacements.size} {signaturePlacements.size === 1 ? 'page' : 'pages'})
          </Button>
        )}
      </div>
    </div>
  );
};