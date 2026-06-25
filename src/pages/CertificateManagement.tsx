/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import * as Form from '@radix-ui/react-form';
import * as Dialog from '@radix-ui/react-dialog';
import { Key, Upload, Trash2, X, Search, ChevronLeft, ChevronRight, Plus, FileKey, CheckCircle, Flag, OctagonX, OctagonAlert, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '@/api/axiosInstance';
import { useAuth } from '@/auth/useAuth';

interface Certificate {
  id: number;
  userId: number;
  fileName: string;
  issuer: string;
  subject: string;
  uploadedAt: string;
  expiresAt: string;
  default: boolean;
  status?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  offset: number;
}

const CertificateManagement: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [filteredCertificates, setFilteredCertificates] = useState<Certificate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [setDefaultDialogOpen, setSetDefaultDialogOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);

  const { user } = useAuth();

  // Pagination
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    offset: 0,
  });

  useEffect(() => {
    loadCertificates();
  }, [pagination.currentPage, pagination.itemsPerPage]);

  useEffect(() => {
    filterCertificates();
  }, [searchQuery, certificates]);

  const loadCertificates = async () => {
    try {
      const params = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        offset: pagination.offset,
        user_id: user?.id,
        user_roles: '',
      };

      const response = await api.get('v1/certificates', { params });
      const data = response.data;
      //console.log('Fetched certificates response:', data);

      setCertificates(data.data);
      setPagination(prev => ({
        ...prev,
        totalItems: data.pagination.totalItems,
        totalPages: data.pagination.totalPages,
      }));
    } catch {
      toast.error('Error fetching certificates');
    }
  };

  const filterCertificates = () => {
    if (!searchQuery.trim()) {
      setFilteredCertificates(certificates);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = certificates.filter(cert =>
      cert.fileName.toLowerCase().includes(query) ||
      cert.issuer.toLowerCase().includes(query) ||
      cert.subject.toLowerCase().includes(query)
    );
    setFilteredCertificates(filtered);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.name.endsWith('.p12') || file.name.endsWith('.pfx'))) {
      setUploadFile(file);
    } else if (file) {
      alert('Please select a valid .p12 or .pfx certificate file');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !certificatePassword) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('password', certificatePassword);
    if (user?.id) {
      formData.append('user_id', user.id);
    }
    try {
      const response = await api.post('v1/certificates/upload', formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      })

      if (response.status === 400) {
        toast.error('Certificate already exists. Please upload a different certificate.');
        return;
      }

      setUploadDialogOpen(false);
      resetUploadForm();
      toast.success('Certificate uploaded successfully');

      // Reload to update pagination
      setTimeout(() => loadCertificates(), 100);

    } catch {
      toast.error('Failed to upload certificate');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCertificate) return;

    try {
      const params = {
        user_id: user?.id ? user.id : undefined
      }

      const response = await api.delete(`v1/certificates/${selectedCertificate.id}`, {
        params
      })

      if (response.status !== 200) {
        throw new Error(`Delete failed with status: ${response.status}`);
      }

      setDeleteDialogOpen(false);
      setSelectedCertificate(null);
      setTimeout(() => loadCertificates(), 100);
      toast.success('Certificate deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete certificate. Please try again.');
    }
  };

  const handleSetDefault = async () => {
    if (!selectedCertificate) return;

    setIsSettingDefault(true);
    try {
      const response = await api.patch(
        `v1/certificates/${selectedCertificate.id}/set-default?user_id=${user?.id}`
      );

      if (response.status === 200) {
        setSetDefaultDialogOpen(false);
        setSelectedCertificate(null);
        setTimeout(() => loadCertificates(), 100);
        toast.success('Default certificate set successfully');
      } else {
        throw new Error(`Set default failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Set default error:', error);
      toast.error('Failed to set default certificate. Please try again.');
    } finally {
      setIsSettingDefault(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setCertificatePassword('');
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({
        ...prev,
        currentPage: newPage,
        offset: (newPage - 1) * prev.itemsPerPage,
      }));
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setPagination(prev => ({
      ...prev,
      itemsPerPage: newItemsPerPage,
      currentPage: 1,
      offset: 0,
    }));
  };

  const openDeleteDialog = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setDeleteDialogOpen(true);
  };

  const openSetDefaultDialog = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setSetDefaultDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <>
      <div className="relative min-h-screen overflow-hidden">
        {/* Background image with blur */}
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-md"
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)`,
          }}>
        </div>
        {/* Optional dark overlay for better contrast */}
        <div className="absolute inset-0 bg-black/30"></div>

        <div className="relative p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 border border-[#A1C2BD]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-[#A1C2BD] rounded-lg shrink-0">
                  <FileKey className="w-5 h-5 sm:w-6 sm:h-6 text-[#19183B]" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-3xl font-bold text-[#19183B] truncate">Certificate Management</h1>
                  <p className="text-xs sm:text-sm text-[#708993]">Upload and manage your digital certificates (.p12/.pfx)</p>
                </div>
              </div>
              <button
                onClick={() => setUploadDialogOpen(true)}
                className="flex items-center gap-2 bg-[#19183B] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-sm sm:text-base font-semibold hover:bg-[#708993] transition-colors shadow-lg shrink-0 whitespace-nowrap"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                Upload Certificate
              </button>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 border border-[#A1C2BD]">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-[#708993]" />
                <input
                  type="text"
                  placeholder="Search certificates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-sm font-medium text-[#708993] whitespace-nowrap">Show:</label>
                <select
                  value={pagination.itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] outline-none transition-all bg-white text-[#19183B] font-semibold"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

          {/* Certificate List */}
          <div className="bg-white rounded-xl shadow-sm border border-[#A1C2BD] overflow-hidden">

            {/* Desktop Table Header - hidden on mobile */}
            <div className="hidden sm:block bg-[#E7F2EF] border-b-2 border-[#A1C2BD] px-6 py-4">
              <div className="grid grid-cols-12 gap-4 font-semibold text-[#19183B]">
                <div className="col-span-4">Certificate Name</div>
                <div className="col-span-4">Issuer</div>
                <div className="col-span-2">Expires At</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-[#A1C2BD]">
              {filteredCertificates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-[#708993]">
                  <FileKey className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-50" />
                  <p className="text-base sm:text-lg mb-2 text-center px-4">
                    {searchQuery ? 'No certificates found' : 'No certificates uploaded yet'}
                  </p>
                  <p className="text-xs sm:text-sm text-center px-4">
                    {searchQuery ? 'Try adjusting your search' : 'Click "Upload Certificate" to add your first certificate'}
                  </p>
                </div>
              ) : (
                filteredCertificates.map((certificate) => (
                  <div
                    key={certificate.id}
                    className="px-4 sm:px-6 py-4 hover:bg-[#E7F2EF]/50 transition-colors"
                  >
                    {/* Desktop row */}
                    <div className="hidden sm:grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[#A1C2BD]/20 rounded-lg shrink-0">
                            <KeyRound className="w-5 h-5 text-[#19183B]"/>
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-col items-start gap-1">
                              {certificate.default && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-600 text-xs font-semibold rounded-full">
                                  <Flag className="w-3 h-3 fill-amber-600" />
                                  Default
                                </span>
                              )}
                              <p className="font-semibold text-[#19183B] truncate">{certificate.fileName}</p>
                            </div>
                            <p className="text-xs text-[#708993]">
                              Uploaded {formatDate(certificate.uploadedAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-4">
                        <p className="text-sm text-[#708993] truncate" title={certificate.issuer}>
                          {certificate.issuer}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-[#708993]">{formatDate(certificate.expiresAt)}</p>
                      </div>
                      <div className="col-span-1">
                        {(() => {
                          if (certificate.status == 'Valid') {
                            return (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-600 text-xs font-semibold rounded-full">
                                <CheckCircle className="w-3 h-3" />
                                Valid
                              </span>
                            )
                          }
                          else if (certificate.status == 'Revoked') {
                            return (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
                                <OctagonX className="w-3 h-3"/>
                                Revoked
                              </span>
                            )
                          }

                          else if (certificate.status == 'Invalid') {
                            return (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
                                <OctagonAlert className="w-3 h-3"/>
                                Invalid
                              </span>
                            )
                          }
                        })()}


                      </div>
                      <div className="col-span-1 flex justify-end gap-2">
                        {!certificate.default && (
                          <button
                            onClick={() => openSetDefaultDialog(certificate)}
                            className="p-2 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-colors"
                            title="Set as default"
                          >
                            <Flag className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openDeleteDialog(certificate)}
                          disabled={certificate.default}
                          className={`p-2 rounded-lg transition-all duration-200 ease-in-out ${certificate.default
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white hover:shadow-md active:scale-95"
                            }`}
                          title={certificate.default ? "Cannot delete default certificate" : "Delete certificate"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="flex sm:hidden gap-3">
                      <div className="p-2 bg-[#A1C2BD]/20 rounded-lg shrink-0 h-fit">
                        <Key className="w-4 h-4 text-[#19183B]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            {certificate.default && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-600 text-xs font-semibold rounded-full mb-1">
                                <Flag className="w-3 h-3 fill-amber-600" />
                                Default
                              </span>
                            )}
                            <p className="font-semibold text-[#19183B] text-sm truncate">{certificate.fileName}</p>
                          </div>
                          {isExpired(certificate.expiresAt) ? (
                            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
                              Expired
                            </span>
                          ) : (
                            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-600 text-xs font-semibold rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              Valid
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#708993] truncate mb-0.5" title={certificate.issuer}>
                          {certificate.issuer}
                        </p>
                        <p className="text-xs text-[#708993] mb-2">
                          Expires {formatDate(certificate.expiresAt)}
                        </p>
                        <div className="flex items-center gap-2">
                          {!certificate.default && (
                            <button
                              onClick={() => openSetDefaultDialog(certificate)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-colors text-xs font-medium"
                              title="Set as default"
                            >
                              <Flag className="w-3 h-3" />
                              Set Default
                            </button>
                          )}
                          <button
                            onClick={() => openDeleteDialog(certificate)}
                            disabled={certificate.default}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${certificate.default
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white"
                              }`}
                            title={certificate.default ? "Cannot delete default certificate" : "Delete certificate"}
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {filteredCertificates.length > 0 && (
              <div className="bg-[#E7F2EF]/50 border-t-2 border-[#A1C2BD] px-4 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs sm:text-sm text-[#708993] order-2 sm:order-1">
                    Showing <span className="font-semibold text-[#19183B]">{pagination.offset + 1}</span> to{' '}
                    <span className="font-semibold text-[#19183B]">
                      {Math.min(pagination.offset + pagination.itemsPerPage, pagination.totalItems)}
                    </span>{' '}
                    of <span className="font-semibold text-[#19183B]">{pagination.totalItems}</span> certificates
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                      className="p-1.5 sm:p-2 border-2 border-[#A1C2BD] rounded-lg hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#708993] text-[#708993]"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.currentPage >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-sm font-semibold transition-colors ${pagination.currentPage === pageNum
                              ? 'bg-[#19183B] text-white'
                              : 'text-[#708993] hover:bg-[#A1C2BD] hover:text-white'
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.totalPages}
                      className="p-1.5 sm:p-2 border-2 border-[#A1C2BD] rounded-lg hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#708993] text-[#708993]"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
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
              Upload Certificate
            </Dialog.Title>

            <Form.Root onSubmit={handleUploadSubmit} className="space-y-5">
              <Form.Field name="certificateFile">
                <div className="flex items-baseline justify-between mb-2">
                  <Form.Label className="text-sm font-semibold text-[#19183B]">
                    Certificate File (.p12/.pfx)
                  </Form.Label>
                  <Form.Message match="valueMissing" className="text-xs text-red-600">
                    Please upload a certificate
                  </Form.Message>
                </div>
                <input
                  type="file"
                  accept=".p12,.pfx"
                  onChange={handleFileChange}
                  required
                  className="w-full px-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] outline-none transition-all cursor-pointer"
                />
                {uploadFile && (
                  <div className="mt-3 p-3 bg-[#E7F2EF] rounded-lg border border-[#A1C2BD] flex items-center gap-2">
                    <FileKey className="w-4 h-4 text-[#19183B]" />
                    <p className="text-sm text-[#708993] truncate">{uploadFile.name}</p>
                  </div>
                )}
              </Form.Field>

              <Form.Field name="password">
                <div className="flex items-baseline justify-between mb-2">
                  <Form.Label className="text-sm font-semibold text-[#19183B]">
                    Certificate Password
                  </Form.Label>
                  <Form.Message match="valueMissing" className="text-xs text-red-600">
                    Password is required
                  </Form.Message>
                </div>
                <input
                  type="password"
                  value={certificatePassword}
                  onChange={(e) => setCertificatePassword(e.target.value)}
                  required
                  placeholder="Enter certificate password"
                  className="w-full px-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] outline-none transition-all"
                />
              </Form.Field>

              <div className="bg-[#A1C2BD]/10 border border-[#A1C2BD] rounded-xl p-4">
                <p className="text-xs text-[#708993]">
                  <strong className="text-[#19183B]">Note:</strong> Your certificate will be securely stored and encrypted.
                  The password is only used for validation and will not be saved.
                </p>
              </div>

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
                    disabled={isUploading || !uploadFile || !certificatePassword}
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
              Delete Certificate
            </Dialog.Title>

            <p className="text-[#708993] mb-6">
              Are you sure you want to delete "{selectedCertificate?.fileName}"? This action cannot be undone and may affect your ability to sign documents.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setSelectedCertificate(null);
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

      {/* Set Default Confirmation Dialog */}
      <Dialog.Root open={setDefaultDialogOpen} onOpenChange={setSetDefaultDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-amber-200">
            <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-amber-600 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Flag className="w-6 h-6 text-amber-600 fill-amber-600" />
              </div>
              Set Default Certificate
            </Dialog.Title>

            <p className="text-[#708993] mb-6">
              Are you sure you want to set "{selectedCertificate?.fileName}" as your default certificate? This will be used as the primary certificate for signing documents.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSetDefaultDialogOpen(false);
                  setSelectedCertificate(null);
                }}
                className="flex-1 px-6 py-3 border-2 border-[#A1C2BD] text-[#19183B] rounded-xl font-semibold hover:bg-[#E7F2EF] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSetDefault}
                disabled={isSettingDefault}
                className="flex-1 px-6 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSettingDefault ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Setting...
                  </>
                ) : (
                  <>
                    <Flag className="w-5 h-5" />
                    Set as Default
                  </>
                )}
              </button>
            </div>

            <Dialog.Close className="absolute top-4 right-4 p-2 hover:bg-amber-50 rounded-lg transition-colors">
              <X className="w-5 h-5 text-[#708993]" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};

export default CertificateManagement;