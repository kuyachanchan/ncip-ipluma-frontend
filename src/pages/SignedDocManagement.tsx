/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import * as Form from '@radix-ui/react-form';
import * as Dialog from '@radix-ui/react-dialog';
import { 
  FileText, 
  Upload, 
  Search, 
  Download, 
  Share2, 
  Forward, 
  Trash2, 
  X,
  ChevronLeft,
  ChevronRight,
  Signature,
  Eye,
  ZoomOut,
  ZoomIn,
  User
} from 'lucide-react';

// Add ShareDialog import at the top
import ShareDialog from '@/components/ShareDialog';



interface PDFDocument {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: string;
  status: string;
  uploadedAt: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  offset: number;
}

interface UserAccount {
  id: string;
  username: string;
  email: string;
  role: Array<{
    id: number;
    name: string;
  }>;
  createdAt: string;
  updatedAt: string;
}


interface DocumentForward {
  id: string;
  document: PDFDocument;
  forwardedBy: UserAccount;
  forwardedTo: UserAccount;
  forwardedAt: string;
  message: string;
  status: 'PENDING' | 'VIEWED' | 'COMPLETED'; // Adjust based on your ForwardStatus enum
}

interface ForwardRequest {
  fromUserId: string;
  toUserId: string;
  message: string;
}

import api from '@/api/axiosInstance';
import toast from 'react-hot-toast';
import { useAuth } from '@/auth/useAuth';
//import { GlobalWorkerOptions } from 'pdfjs-dist';
import { Document, Page, pdfjs } from 'react-pdf';
//import type { Role } from '@/types/auth';

pdfjs.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

const SignedDocManagement: React.FC = () => {
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<PDFDocument | null>(null);
  
  // Upload form state
  const [toUploadFile, setToUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isPdfLoading, setIsPdfLoading] = useState(false);

  // PDF Viewer state
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Removed unused documentForwards state
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [forwardDocument, setForwardDocument] = useState<PDFDocument | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [forwardMessage, setForwardMessage] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [usersPagination, setUsersPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });


  // Add these state variables with your other state declarations:
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedDocumentForSharing, setSelectedDocumentForSharing] = useState<PDFDocument | null>(null);
  const [isSignedDocumentSharing, setIsSignedDocumentSharing] = useState(true); // Default to true since this is SignedDocManagement


  // Pagination
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    offset: 0,
  });

  const { user } = useAuth();

  // Load documents from API or storage
  useEffect(() => {
    loadDocuments();
  }, []);



    // Load users from API
  const loadUsers = async (page: number = usersPagination.currentPage, limit: number = usersPagination.itemsPerPage) => {
    setIsLoading(true);
    try {
      const params = {
        page,
        limit,
        ...(searchTerm && { search: searchTerm })
      };

      const response = await api.get("v1/users", { params });
      const data = response.data;

      console.log("Users API Response:", data); // Debug log

      // Filter out the current user - make sure to compare IDs correctly
      const filteredUsers = data.data.filter((userItem: UserAccount) => 
        userItem.id.toString() !== user?.id?.toString()
      );
      
      setUsers(filteredUsers);

      setUsersPagination(prev => ({
        ...prev,
        currentPage: data.total.currentPage,
        totalPages: data.total.totalPages,
        totalItems: data.total.totalItems - (filteredUsers.length < data.data.length ? 1 : 0), // Adjust based on actual filtering
        itemsPerPage: data.total.itemsPerPage,
      }));

    } catch (error) {
      toast.error("Error fetching users");
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const loadDocuments = async () => {
    try {
      const params = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        offset: pagination.offset,
        user_id: user?.id,
          user_roles: user?.roles,
      };
      const response = await api.get("v1/documents/signed", {params})
      const data = response.data
      setDocuments(data.data)
      setPagination(prev => ({
        ...prev,
        totalItems: data.pagination.totalItems,
        totalPages: data.pagination.totalPages,
      }))
    } catch (error) {
      toast.error(`Error fetching: ${error}`)
    }
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

      if (!user?.id) {
        toast.error("No user id found")
        return;
      }

      const formData = new FormData()
      formData.append("file", toUploadFile)

      const response = await api.post(`v1/documents/upload/${user.id}`, formData, {
        headers: {
          "Content-Type":"multipart/form-data"
        }
      })
      const data = response.data
      toast.success(`${toUploadFile.name} has been uploaded`)
      setDocuments([data, ...documents]);
      setUploadDialogOpen(false);
      resetUploadForm();
    } catch (error) {
      toast.error(`Upload failed: ${error}`)
    } finally {
      setIsUploading(false);
    }
  };

    const handleDelete = async () => {
        if (!selectedDocument) return;

            try {
            // delete here
            const userId = user?.id ?? ''
            await api.delete(`v1/documents/${selectedDocument.id}`, { params: { user_id: userId } })
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
  };

  const openDeleteDialog = (document: PDFDocument) => {
    setSelectedDocument(document);
    setDeleteDialogOpen(true);
  };

  // Filter documents based on search query
  const filteredDocuments = documents.filter(doc =>
    doc.fileName.toLowerCase().includes(searchQuery.toLowerCase())
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

  const handleView = async (doc: PDFDocument) => {
    setSelectedDocument(doc);
    try {
      setIsPdfLoading(true);
      const response = await api.get("v1/documents/view/" + doc.filePath, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      setPdfUrl(url);
      setPdfViewerOpen(true);
      setPageNumber(1);
      setScale(1.0);
      
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Failed to load PDF document');
    } finally {
      setIsPdfLoading(false);
    }
  };
  const handleDownload = async (doc: PDFDocument) => {
    try {
      const response = await api.get(`v1/documents/download/${doc.id}`, { responseType: 'blob' });

      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName;  // ensure the file name is correct
      link.click();

      window.URL.revokeObjectURL(url);
      
    } catch {
      toast.error(`Download failed: ${doc.fileName}`);
      return;
    }
    toast.success(`Downloaded: ${doc.fileName}`);
  };


  const handleForward = (doc: PDFDocument) => {
    console.log("Opening forward dialog for user:", user?.id); // Debug log
    setForwardDocument(doc);
    setForwardDialogOpen(true);
    setSelectedUserId('');
    setForwardMessage('');
    setSearchTerm('');
    setUsersPagination(prev => ({ ...prev, currentPage: 1 }));
    loadUsers(1, usersPagination.itemsPerPage);
  };
    
  const handleForwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forwardDocument || !selectedUserId || !user?.id) {
      toast.error("Please select a user to forward to");
      return;
    }

    setIsForwarding(true);
    try {
      const forwardRequest: ForwardRequest = {
        fromUserId: user.id,
        toUserId: selectedUserId,
        message: forwardMessage,
      };

      const response = await api.post(`v1/documents/${forwardDocument.id}/forward`, forwardRequest);
      const forwardData: DocumentForward = response.data;

      // Use the response data for better UX
      const recipientName = forwardData.forwardedTo.username;
      
      toast.success(`Document "${forwardDocument.fileName}" forwarded to ${recipientName} successfully`);
      
      // You could also update your local state if you want to track forwarded documents
      console.log('Forward record created:', forwardData);
      
      setForwardDialogOpen(false);
      setForwardDocument(null);
      setSelectedUserId('');
      setForwardMessage('');
    } catch (error) {
      console.error('Forward error:', error);
      toast.error('Failed to forward document');
    } finally {
      setIsForwarding(false);
    }
  };

  const handleUserSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setUsersPagination(prev => ({ ...prev, currentPage: 1 }));
    loadUsers(1, usersPagination.itemsPerPage);
  };

  const handleUsersPageChange = (newPage: number) => {
    setUsersPagination(prev => ({ ...prev, currentPage: newPage }));
    loadUsers(newPage, usersPagination.itemsPerPage);
  };


    const formatFileSize = (fileSize: string) => {

        const bytes = Number(fileSize)
        if (isNaN(bytes) || bytes < 0) return "—"; // fallback for bad input
        if (bytes === 0) return "0 B";

        const units = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));

        return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
  }
  

  // PDF document event handlers
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
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
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  const handleShare = (doc: PDFDocument) => {
    //console.log('Share:', doc.fileName);
    //alert(`Sharing: ${doc.fileName}`);

    setSelectedDocumentForSharing(doc);
    // Check if document is signed (should be true in SignedDocManagement)
    const isSigned = doc.status === 'SIGNED' || doc.status === 'SIGNED_AND_SHARED';
    setIsSignedDocumentSharing(isSigned);
    setShareDialogOpen(true);
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
      {/* Optional dark overlay for better contrast */}
        <div className="absolute inset-0 bg-black/30"></div>
        
      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#A1C2BD]">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-[#A1C2BD] rounded-lg">
                  <Signature className="w-6 h-6 text-[#19183B]" />
                </div>
                <h1 className="text-3xl font-bold text-[#19183B]">Signed Documents</h1>
              </div>
              <p className="text-[#708993] ml-14">Manage signed PDF documents</p>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#A1C2BD]">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#708993]" />
              <input
                type="text"
                placeholder="Search documents by name..."
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
                      <div className="flex items-center gap-4 text-xs text-[#708993]">
                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.fileSize)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleView(doc)}
                        className="p-2.5 bg-[#708993] text-white rounded-lg hover:bg-[#19183B] transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-2.5 bg-[#708993] text-white rounded-lg hover:bg-[#19183B] transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {/*<button
                        onClick={() => handleSign(doc)}
                        className="p-2.5 bg-[#708993] text-white rounded-lg hover:bg-[#19183B] transition-colors"
                        title="Sign"
                      >
                        <PenTool className="w-4 h-4" />
                      </button>*/}
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
                    disabled={isUploading || !toUploadFile }
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

      {/* PDF Viewer Dialog */}
      <Dialog.Root open={pdfViewerOpen} onOpenChange={closePdfViewer}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border-2 border-[#A1C2BD] z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#A1C2BD] bg-[#E7F2EF] rounded-t-2xl">
              <Dialog.Title className="flex items-center gap-3 text-xl font-bold text-[#19183B]">
                <FileText className="w-6 h-6" />
                {selectedDocument?.fileName || 'PDF Document'}
              </Dialog.Title>
              
              <div className="flex items-center gap-3">
                {/* Page Navigation */}
                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-[#A1C2BD]">
                  <button
                    onClick={goToPreviousPage}
                    disabled={pageNumber <= 1}
                    className="p-1 hover:bg-[#E7F2EF] rounded disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium min-w-[80px] text-center">
                    Page {pageNumber} of {numPages}
                  </span>
                  <button
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                    className="p-1 hover:bg-[#E7F2EF] rounded disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-lg border border-[#A1C2BD]">
                  <button
                    onClick={zoomOut}
                    disabled={scale <= 0.5}
                    className="p-1 hover:bg-[#E7F2EF] rounded disabled:opacity-50"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium min-w-[50px] text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={zoomIn}
                    disabled={scale >= 3}
                    className="p-1 hover:bg-[#E7F2EF] rounded disabled:opacity-50"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={resetZoom}
                    className="px-2 py-1 text-xs bg-[#A1C2BD] text-white rounded hover:bg-[#708993] transition-colors ml-1"
                  >
                    Reset
                  </button>
                </div>

                <Dialog.Close 
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                  onClick={closePdfViewer}
                >
                  <X className="w-5 h-5 text-red-600" />
                </Dialog.Close>
              </div>
            </div>

            {/* PDF Content */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              {isPdfLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-[#A1C2BD] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-[#708993]">Loading PDF...</p>
                  </div>
                </div>
              ) : pdfUrl ? (
                <div className="flex justify-center items-start min-h-full">
                  <div className="bg-white shadow-lg rounded-lg p-4 inline-block">
                    <Document
                      file={pdfUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={(error) => {
                        console.error('Error loading PDF:', error);
                        toast.error('Failed to load PDF document');
                      }}
                      loading={
                        <div className="flex items-center justify-center py-20">
                          <div className="text-center">
                            <div className="w-8 h-8 border-4 border-[#A1C2BD] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-[#708993]">Loading page...</p>
                          </div>
                        </div>
                      }
                    >
                      <Page 
                        pageNumber={pageNumber} 
                        scale={scale}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="shadow-sm"
                      />
                    </Document>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-[#708993]">
                  <p>No PDF document to display</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#A1C2BD] p-4 bg-[#E7F2EF] rounded-b-2xl">
              <div className="flex justify-between items-center">
                <p className="text-sm text-[#708993]">
                  Use the controls above to navigate and zoom the document
                </p>
                {selectedDocument && (
                  <button
                    onClick={() => handleDownload(selectedDocument)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#19183B] text-white rounded-lg hover:bg-[#708993] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Forward Dialog */}
      <Dialog.Root open={forwardDialogOpen} onOpenChange={setForwardDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border-2 border-[#A1C2BD] z-50">
            <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B] p-6 border-b border-[#A1C2BD]">
              <div className="p-2 bg-[#A1C2BD] rounded-lg">
                <Forward className="w-6 h-6 text-[#19183B]" />
              </div>
              Forward Document
            </Dialog.Title>

            <div className="flex-1 overflow-hidden p-6">
              {forwardDocument && (
                <div className="mb-6 p-4 bg-[#E7F2EF] rounded-lg border border-[#A1C2BD]">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#19183B]" />
                    <div>
                      <p className="font-semibold text-[#19183B]">{forwardDocument.fileName}</p>
                      <p className="text-sm text-[#708993]">
                        {formatFileSize(forwardDocument.fileSize)} • {new Date(forwardDocument.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* User Search Section - Separate from the main form */}
              <div className="space-y-3 mb-4">
                <label className="text-sm font-semibold text-[#19183B]">Select User to Forward To</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#708993]" />
                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleUserSearch(e);
                        }
                      }}
                      className="w-full pl-10 pr-4 py-2 border-2 border-[#A1C2BD] rounded-lg focus:ring-2 focus:ring-[#708993] outline-none transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUserSearch}
                    className="px-4 py-2 bg-[#19183B] text-white rounded-lg hover:bg-[#708993] transition-colors"
                  >
                    Search
                  </button>
                </div>
              </div>

              {/* Users List */}
              <div className="border-2 border-[#A1C2BD] rounded-lg overflow-hidden max-h-60 overflow-y-auto mb-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#A1C2BD] border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-[#708993]">Loading users...</span>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-[#708993]">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No users found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#A1C2BD]">
                    {users.map((userItem) => {
                      // Determine if user has admin role
                      const isAdmin = userItem.role.some(role => role.name === 'ROLE_ADMIN');
                      const roleDisplay = isAdmin ? 'Admin' : 'User';
                      
                      return (
                        <label
                          key={userItem.id}
                          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-[#E7F2EF] transition-colors ${
                            selectedUserId === userItem.id ? 'bg-[#A1C2BD] bg-opacity-30' : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="selectedUser"
                            value={userItem.id}
                            checked={selectedUserId === userItem.id}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="text-[#19183B] focus:ring-[#708993]"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-[#19183B]">{userItem.username}</p>
                            <p className="text-sm text-[#708993]">{userItem.email}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            isAdmin 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {roleDisplay}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Users Pagination */}
              {usersPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 mb-4">
                  <p className="text-sm text-[#708993]">
                    Page {usersPagination.currentPage} of {usersPagination.totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUsersPageChange(usersPagination.currentPage - 1)}
                      disabled={usersPagination.currentPage === 1}
                      className="flex items-center gap-1 px-3 py-1 border-2 border-[#A1C2BD] text-[#19183B] rounded-lg text-sm hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50"
                    >
                      <ChevronLeft className="w-3 h-3" />
                      Prev
                    </button>
                    <button
                      onClick={() => handleUsersPageChange(usersPagination.currentPage + 1)}
                      disabled={usersPagination.currentPage === usersPagination.totalPages}
                      className="flex items-center gap-1 px-3 py-1 border-2 border-[#A1C2BD] text-[#19183B] rounded-lg text-sm hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Main Forward Form */}
              <Form.Root onSubmit={handleForwardSubmit} className="space-y-4">
                {/* Message Input */}
                <Form.Field name="message">
                  <Form.Label className="text-sm font-semibold text-[#19183B]">
                    Message (Optional)
                  </Form.Label>
                  <Form.Control asChild>
                    <textarea
                      value={forwardMessage}
                      onChange={(e) => setForwardMessage(e.target.value)}
                      placeholder="Add a message for the recipient..."
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-[#A1C2BD] rounded-lg focus:ring-2 focus:ring-[#708993] outline-none transition-all resize-none"
                    />
                  </Form.Control>
                </Form.Field>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setForwardDialogOpen(false)}
                    className="flex-1 px-6 py-3 border-2 border-[#A1C2BD] text-[#19183B] rounded-xl font-semibold hover:bg-[#E7F2EF] transition-colors"
                  >
                    Cancel
                  </button>
                  <Form.Submit asChild>
                    <button
                      type="submit"
                      disabled={isForwarding || !selectedUserId}
                      className="flex-1 px-6 py-3 bg-[#19183B] text-white rounded-xl font-semibold hover:bg-[#708993] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isForwarding ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Forwarding...
                        </>
                      ) : (
                        <>
                          <Forward className="w-5 h-5" />
                          Forward Document
                        </>
                      )}
                    </button>
                  </Form.Submit>
                </div>
              </Form.Root>
            </div>

            <Dialog.Close className="absolute top-4 right-4 p-2 hover:bg-[#E7F2EF] rounded-lg transition-colors">
              <X className="w-5 h-5 text-[#708993]" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>




      {/* Share Dialog */}
      {selectedDocumentForSharing && (
        <ShareDialog
          document={selectedDocumentForSharing}
          isOpen={shareDialogOpen}
          onClose={() => {
            setShareDialogOpen(false);
            setSelectedDocumentForSharing(null);
          }}
          onSuccess={() => {
            // Refresh documents after successful sharing
            loadDocuments();
          }}
          isSignedDocument={isSignedDocumentSharing}
        />
      )}
    </>
  );
};

export default SignedDocManagement;