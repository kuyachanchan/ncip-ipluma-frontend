import React, { useState, useEffect } from 'react';
import * as Form from '@radix-ui/react-form';
import * as Dialog from '@radix-ui/react-dialog';
import { 
  FileText, 
  Upload, 
  Search, 
  Download, 
  PenTool, 
  Share2, 
  Forward, 
  Trash2, 
  X, 
  Plus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface PDFDocument {
  id: string;
  fileName: string;
  comment: string;
  uploadedAt: string;
  fileSize: string;
}

const MyDocument: React.FC = () => {
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<PDFDocument | null>(null);
  
  // Upload form state
  const [toUploadFile, setToUploadFile] = useState<File | null>(null);
  const [toUploadComment, setToUploadComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Load documents from API or storage
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    // Mock data for demonstration
    const mockDocuments: PDFDocument[] = [
      {
        id: '1',
        fileName: 'Contract_Agreement_2024.pdf',
        comment: 'Annual service contract with vendor',
        uploadedAt: new Date('2024-10-15').toISOString(),
        fileSize: '2.4 MB',
      },
      {
        id: '2',
        fileName: 'Financial_Report_Q3.pdf',
        comment: 'Third quarter financial statements and analysis',
        uploadedAt: new Date('2024-10-10').toISOString(),
        fileSize: '5.1 MB',
      },
      {
        id: '3',
        fileName: 'Project_Proposal.pdf',
        comment: 'New infrastructure project proposal for 2025',
        uploadedAt: new Date('2024-10-08').toISOString(),
        fileSize: '3.7 MB',
      },
      {
        id: '4',
        fileName: 'Employee_Handbook.pdf',
        comment: 'Updated policies and procedures manual',
        uploadedAt: new Date('2024-10-05').toISOString(),
        fileSize: '1.8 MB',
      },
      {
        id: '5',
        fileName: 'Marketing_Strategy_2025.pdf',
        comment: 'Comprehensive marketing plan for next year',
        uploadedAt: new Date('2024-10-01').toISOString(),
        fileSize: '4.2 MB',
      },
    ];
    setDocuments(mockDocuments);
  };

  const handleToUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setToUploadFile(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toUploadFile) return;

    setIsUploading(true);

    try {
      // Mock upload - replace with actual API call
      const newDocument: PDFDocument = {
        id: Date.now().toString(),
        fileName: toUploadFile.name,
        comment: toUploadComment,
        uploadedAt: new Date().toISOString(),
        fileSize: `${(toUploadFile.size / 1024 / 1024).toFixed(1)} MB`,
      };

      setDocuments([newDocument, ...documents]);
      setUploadDialogOpen(false);
      resetUploadForm();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDocument) return;

    try {
      setDocuments(documents.filter(doc => doc.id !== selectedDocument.id));
      setDeleteDialogOpen(false);
      setSelectedDocument(null);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document');
    }
  };

  const resetUploadForm = () => {
    setToUploadFile(null);
    setToUploadComment('');
  };

  const openDeleteDialog = (document: PDFDocument) => {
    setSelectedDocument(document);
    setDeleteDialogOpen(true);
  };

  // Filter documents based on search query
  const filteredDocuments = documents.filter(doc =>
    doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.comment.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleDownload = (doc: PDFDocument) => {
    console.log('Download:', doc.fileName);
    alert(`Downloading: ${doc.fileName}`);
  };

  const handleSign = (doc: PDFDocument) => {
    console.log('Sign:', doc.fileName);
    alert(`Opening signature dialog for: ${doc.fileName}`);
  };

  const handleShare = (doc: PDFDocument) => {
    console.log('Share:', doc.fileName);
    alert(`Sharing: ${doc.fileName}`);
  };

  const handleForward = (doc: PDFDocument) => {
    console.log('Forward:', doc.fileName);
    alert(`Forwarding: ${doc.fileName}`);
  };

  return (
    <div className="min-h-screen bg-[#E7F2EF] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#A1C2BD]">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-[#A1C2BD] rounded-lg">
                  <FileText className="w-6 h-6 text-[#19183B]" />
                </div>
                <h1 className="text-3xl font-bold text-[#19183B]">My Documents</h1>
              </div>
              <p className="text-[#708993] ml-14">Upload, manage, and share your PDF documents</p>
            </div>
            <button
              onClick={() => setUploadDialogOpen(true)}
              className="flex items-center gap-2 bg-[#19183B] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#708993] transition-colors shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Upload PDF
            </button>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#A1C2BD]">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#708993]" />
              <input
                type="text"
                placeholder="Search documents by name or comment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-[#19183B]">Show:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] outline-none transition-all bg-white cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-xl shadow-sm border border-[#A1C2BD] overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#19183B]">
                Documents ({filteredDocuments.length})
              </h2>
              <p className="text-sm text-[#708993]">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredDocuments.length)} of {filteredDocuments.length}
              </p>
            </div>

            {paginatedDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#708993]">
                <FileText className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg mb-2">
                  {searchQuery ? 'No documents found' : 'No documents yet'}
                </p>
                <p className="text-sm">
                  {searchQuery
                    ? 'Try adjusting your search query'
                    : 'Click "Upload PDF" to add your first document'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-4 border-2 border-[#A1C2BD] rounded-xl hover:shadow-md transition-all bg-[#E7F2EF]/30 group"
                  >
                    {/* PDF Icon */}
                    <div className="flex-shrink-0 p-3 bg-[#19183B] rounded-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>

                    {/* Document Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#19183B] truncate mb-1">
                        {doc.fileName}
                      </h3>
                      <p className="text-sm text-[#708993] truncate mb-1">
                        {doc.comment}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-[#708993]">
                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{doc.fileSize}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-2.5 bg-[#708993] text-white rounded-lg hover:bg-[#19183B] transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleSign(doc)}
                        className="p-2.5 bg-[#708993] text-white rounded-lg hover:bg-[#19183B] transition-colors"
                        title="Sign"
                      >
                        <PenTool className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleShare(doc)}
                        className="p-2.5 bg-[#708993] text-white rounded-lg hover:bg-[#19183B] transition-colors"
                        title="Share"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleForward(doc)}
                        className="p-2.5 bg-[#708993] text-white rounded-lg hover:bg-[#19183B] transition-colors"
                        title="Forward"
                      >
                        <Forward className="w-4 h-4" />
                      </button>
                      
                      {/* Spacer */}
                      <div className="w-2" />
                      
                      <button
                        onClick={() => openDeleteDialog(doc)}
                        className="p-2.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-[#A1C2BD] p-6 bg-[#E7F2EF]/30">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#708993]">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-[#A1C2BD] text-[#19183B] rounded-lg font-semibold hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-[#A1C2BD] text-[#19183B] rounded-lg font-semibold hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog.Root open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-[#A1C2BD]">
            <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B] mb-4">
              <div className="p-2 bg-[#A1C2BD] rounded-lg">
                <Upload className="w-6 h-6 text-[#19183B]" />
              </div>
              Upload PDF Document
            </Dialog.Title>

            <Form.Root onSubmit={handleUploadSubmit} className="space-y-5">
              <Form.Field name="pdfFile">
                <div className="flex items-baseline justify-between mb-2">
                  <Form.Label className="text-sm font-semibold text-[#19183B]">
                    PDF File
                  </Form.Label>
                  <Form.Message match="valueMissing" className="text-xs text-red-600">
                    Please upload a PDF file
                  </Form.Message>
                </div>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleToUploadFileChange}
                  required
                  className="w-full px-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] outline-none transition-all cursor-pointer"
                />
                {toUploadFile && (
                  <div className="mt-3 p-3 bg-[#E7F2EF] rounded-lg border border-[#A1C2BD] flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#19183B]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#19183B] truncate">
                        {toUploadFile.name}
                      </p>
                      <p className="text-xs text-[#708993]">
                        {(toUploadFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                )}
              </Form.Field>

              <Form.Field name="comment">
                <div className="flex items-baseline justify-between mb-2">
                  <Form.Label className="text-sm font-semibold text-[#19183B]">
                    Comment
                  </Form.Label>
                  <Form.Message match="valueMissing" className="text-xs text-red-600">
                    Please add a comment
                  </Form.Message>
                </div>
                <textarea
                  value={toUploadComment}
                  onChange={(e) => setToUploadComment(e.target.value)}
                  required
                  rows={4}
                  placeholder="Add a description or notes about this document..."
                  className="w-full px-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all resize-none"
                />
              </Form.Field>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setUploadDialogOpen(false);
                    resetUploadForm();
                  }}
                  className="flex-1 px-6 py-3 border-2 border-[#A1C2BD] text-[#19183B] rounded-xl font-semibold hover:bg-[#E7F2EF] transition-colors"
                >
                  Cancel
                </button>
                <Form.Submit asChild>
                  <button
                    type="submit"
                    disabled={isUploading || !toUploadFile || !toUploadComment}
                    className="flex-1 px-6 py-3 bg-[#19183B] text-white rounded-xl font-semibold hover:bg-[#708993] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Upload
                      </>
                    )}
                  </button>
                </Form.Submit>
              </div>
            </Form.Root>

            <Dialog.Close className="absolute top-4 right-4 p-2 hover:bg-[#E7F2EF] rounded-lg transition-colors">
              <X className="w-5 h-5 text-[#708993]" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-red-200">
            <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-red-600 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              Delete Document
            </Dialog.Title>

            <p className="text-[#708993] mb-6">
              Are you sure you want to delete "{selectedDocument?.fileName}"? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setSelectedDocument(null);
                }}
                className="flex-1 px-6 py-3 border-2 border-[#A1C2BD] text-[#19183B] rounded-xl font-semibold hover:bg-[#E7F2EF] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Delete
              </button>
            </div>

            <Dialog.Close className="absolute top-4 right-4 p-2 hover:bg-red-50 rounded-lg transition-colors">
              <X className="w-5 h-5 text-[#708993]" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default MyDocument;