// UsersGuide.tsx
import { useState } from "react";
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, X, ChevronLeft, ChevronRight, ZoomOut, ZoomIn, BookOpen, Download } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

pdfjs.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

export function UsersGuide() {
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const pdfUrl = `${import.meta.env.BASE_URL}iPluma-Users-Guide.pdf`;

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setPdfError("Failed to load PDF. You can download it directly using the button below.");
  };

  const goToPreviousPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(3, prev + 0.2));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.2));
  };

  const resetZoom = () => {
    setScale(1.0);
  };

  const closePdfViewer = () => {
    setPdfViewerOpen(false);
    setPageNumber(1);
    setScale(1.0);
    setPdfError(null);
  };

  const handleDownload = () => {
    window.open(pdfUrl, '_blank');
  };

  return (
    <>
      <div className="relative min-h-screen bg-[#E7F2EF] p-8">
        {/* Background image with blur */}
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-md"
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)`,
          }}>
        </div>
        <div className="absolute inset-0 bg-black/30"></div>
        
        <div className="relative max-w-[90rem] mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#A1C2BD]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#A1C2BD] rounded-lg">
                  <BookOpen className="w-6 h-6 text-[#19183B]" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-[#19183B]">User's Guide</h1>
                  <p className="text-[#708993]">Comprehensive guide to using iPluma</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPdfError(null);
                  setPdfViewerOpen(true);
                }}
                className="flex items-center gap-2 bg-[#19183B] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#708993] transition-colors shadow-lg"
              >
                <FileText className="w-5 h-5" />
                Open User's Guide
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="bg-white rounded-xl shadow-sm border border-[#A1C2BD] overflow-hidden p-12">
            <div className="max-w-3xl mx-auto text-center">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-[#A1C2BD] rounded-full">
                  <BookOpen className="w-12 h-12 text-[#19183B]" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-[#19183B] mb-4">iPluma User's Guide</h2>
              <p className="text-[#708993] mb-8">
                This comprehensive guide covers everything you need to know about using iPluma's document management system.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <div className="p-6 bg-[#E7F2EF] rounded-xl border border-[#A1C2BD]">
                  <div className="w-12 h-12 bg-[#19183B] rounded-lg flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-[#19183B] mb-2">Getting Started</h3>
                  <p className="text-sm text-[#708993]">Learn how to log in, set up your account, and navigate the dashboard.</p>
                </div>
                
                <div className="p-6 bg-[#E7F2EF] rounded-xl border border-[#A1C2BD]">
                  <div className="w-12 h-12 bg-[#19183B] rounded-lg flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-[#19183B] mb-2">Document Management</h3>
                  <p className="text-sm text-[#708993]">Upload, organize, share, and sign documents with digital signatures.</p>
                </div>
                
                <div className="p-6 bg-[#E7F2EF] rounded-xl border border-[#A1C2BD]">
                  <div className="w-12 h-12 bg-[#19183B] rounded-lg flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-[#19183B] mb-2">Advanced Features</h3>
                  <p className="text-sm text-[#708993]">Parallel signing, verification, and collaboration tools.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Viewer Dialog */}
      <Dialog.Root open={pdfViewerOpen} onOpenChange={(open) => {
        if (!open) closePdfViewer();
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed inset-4 bg-white rounded-2xl shadow-2xl flex flex-col border-2 border-[#A1C2BD] z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-[#A1C2BD] bg-[#E7F2EF] rounded-t-2xl">
              <Dialog.Title className="flex items-center gap-3 text-xl font-bold text-[#19183B] truncate max-w-[50%]">
                <FileText className="w-6 h-6 flex-shrink-0" />
                <span className="truncate">iPluma User's Guide</span>
              </Dialog.Title>
              
              <div className="flex items-center gap-4">
                {/* Download button */}
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-[#19183B] text-white rounded-lg hover:bg-[#708993] transition-colors"
                  title="Download PDF"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm">Download</span>
                </button>

                {/* Page Navigation (only show if PDF loaded) */}
                {!pdfError && numPages > 0 && (
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-[#A1C2BD]">
                    <button
                      onClick={goToPreviousPage}
                      disabled={pageNumber <= 1}
                      className="p-2 hover:bg-[#E7F2EF] rounded-lg disabled:opacity-50 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium min-w-[100px] text-center px-2">
                      Page {pageNumber} of {numPages}
                    </span>
                    <button
                      onClick={goToNextPage}
                      disabled={pageNumber >= numPages}
                      className="p-2 hover:bg-[#E7F2EF] rounded-lg disabled:opacity-50 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Zoom Controls (only show if PDF loaded) */}
                {!pdfError && numPages > 0 && (
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-[#A1C2BD]">
                    <button
                      onClick={zoomOut}
                      disabled={scale <= 0.5}
                      className="p-2 hover:bg-[#E7F2EF] rounded-lg disabled:opacity-50 transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium min-w-[60px] text-center">
                      {Math.round(scale * 100)}%
                    </span>
                    <button
                      onClick={zoomIn}
                      disabled={scale >= 3}
                      className="p-2 hover:bg-[#E7F2EF] rounded-lg disabled:opacity-50 transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-5 h-5" />
                    </button>
                    <button
                      onClick={resetZoom}
                      className="px-3 py-1.5 text-sm bg-[#A1C2BD] text-white rounded-lg hover:bg-[#708993] transition-colors ml-1"
                    >
                      Reset
                    </button>
                  </div>
                )}

                <button
                  onClick={closePdfViewer}
                  className="p-2.5 hover:bg-red-100 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-6 h-6 text-red-600" />
                </button>
              </div>
            </div>

            {/* PDF Content */}
            <div className="flex-1 overflow-auto bg-gray-100 p-6">
              {pdfError ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <FileText className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <p className="text-lg text-red-600 mb-2">Unable to load PDF</p>
                    <p className="text-sm text-[#708993] mb-4">{pdfError}</p>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 mx-auto px-4 py-2 bg-[#19183B] text-white rounded-lg hover:bg-[#708993] transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center items-start min-h-full w-full">
                  <div className="bg-white shadow-xl rounded-xl p-6 max-w-full">
                    <Document
                      file={pdfUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      loading={
                        <div className="flex items-center justify-center" style={{ minHeight: 400, minWidth: 300 }}>
                          <div className="text-center">
                            <div className="w-12 h-12 border-4 border-[#A1C2BD] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-lg text-[#708993]">Loading User's Guide...</p>
                          </div>
                        </div>
                      }
                    >
                      <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="shadow-lg max-w-full"
                        width={Math.min(1200, window.innerWidth * 0.8)}
                      />
                    </Document>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#A1C2BD] p-5 bg-[#E7F2EF] rounded-b-2xl">
              <div className="flex justify-between items-center">
                <div className="text-sm text-[#708993] max-w-[70%]">
                  <p>Use the navigation controls above to browse the user's guide.</p>
                </div>
                <div className="text-xs text-[#708993]">
                  {numPages > 0 && `${numPages} pages • Version 1`}
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

export default UsersGuide;