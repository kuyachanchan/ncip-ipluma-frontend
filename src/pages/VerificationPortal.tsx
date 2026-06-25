import { useEffect, useState } from 'react';
import { BookmarkCheck, FileText, Eye, Users, Clock, CheckCircle, XCircle, User, Mail, GitBranch } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '@/api/axiosInstance';

interface ViewEntry {
  name: string;
  email: string;
}

interface ViewSignEntry {
  name: string;
  email: string;
  stepNumber: number;
  parallel: boolean;
  signedAt: string | null;
}

interface DocumentProps {
  fileName: string;
  fileSize: number;
  status: string;
    dotsId: string;
    ownerName: string,
    signedAt:string,
  view: ViewEntry[];
  viewSign: ViewSignEntry[];
}

function VerificationPortal() {
  const [searchParams] = useSearchParams();
  const docId = searchParams.get('docId');
  const userId = searchParams.get('userId');
  const sig = searchParams.get('sig');

  const [documentDetails, setDocumentDetails] = useState<DocumentProps | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocumentDetails();
  }, []);

  const loadDocumentDetails = async () => {
    try {
      setLoading(true);
      const params = { docId, userId, sig };
      const response = await api.get('v1/qr/verify', { params });
      setDocumentDetails(response.data);
    } catch (error: any) {
      //toast.error(`Error fetching document details: ${error?.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'SIGNED_AND_SHARED':
        return { label: 'Signed & Shared', color: 'text-green-700 bg-green-100', icon: CheckCircle };
      case 'SIGNED':
        return { label: 'Signed', color: 'text-blue-700 bg-blue-100', icon: CheckCircle };
      case 'UPLOADED':
        return { label: 'Uploaded', color: 'text-yellow-700 bg-yellow-100', icon: Clock };
      default:
        return { label: status, color: 'text-gray-600 bg-gray-100', icon: Clock };
    }
  };

  const getSignatureStatus = (signedAt: string | null) => {
    if (signedAt) {
      return { label: 'Signed', color: 'text-green-600', icon: CheckCircle, timestamp: signedAt };
    }
    return { label: 'Pending', color: 'text-orange-500', icon: Clock, timestamp: null };
  };

  // Group signers by step number
  const groupedByStep = documentDetails?.viewSign?.reduce((acc, signer) => {
    if (!acc[signer.stepNumber]) acc[signer.stepNumber] = [];
    acc[signer.stepNumber].push(signer);
    return acc;
  }, {} as Record<number, ViewSignEntry[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E7F2EF] flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#19183B] mx-auto mb-4"></div>
          <p className="text-[#708993]">Verifying document...</p>
        </div>
      </div>
    );
  }

  if (!documentDetails) {
    return (
      <div className="min-h-screen bg-[#E7F2EF] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md p-8 text-center max-w-md">
          <XCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#19183B]">Unable to verify document</h2>
          <p className="text-[#708993] mt-2">The verification link may be invalid or expired.</p>
        </div>
      </div>
    );
    }
    
    // Helper function - add this near your other formatters
    const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    };

  const statusConfig = getStatusConfig(documentDetails.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="relative min-h-screen bg-[#E7F2EF] p-4 md:p-8">
      {/* Background blur */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-md"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)` }}
      />
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative max-w-[90rem] mx-auto">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm p-6 mb-6 border border-[#A1C2BD]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#A1C2BD] rounded-lg">
                <BookmarkCheck className="text-[#19183B]" size={24} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#19183B]">Verification Portal</h1>
                <p className="text-[#708993] text-sm">iPluma Signing Platform</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.color} w-fit`}>
              <StatusIcon size={16} />
              <span className="text-sm font-medium">{statusConfig.label}</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-[#A1C2BD] overflow-hidden p-6 md:p-10">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Document Summary */}
            <div className="border-b border-[#E2E8F0] pb-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-1.5 bg-[#E7F2EF] rounded-lg">
                  <FileText className="text-[#19183B]" size={20} />
                </div>
                <h2 className="text-xl font-semibold text-[#19183B]">Document Summary</h2>
              </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pl-1">
                <div>
                    <p className="text-xs uppercase tracking-wide text-[#708993] font-medium">File Name</p>
                    <p className="font-medium text-[#19183B] break-all">{documentDetails.fileName}</p>
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wide text-[#708993] font-medium">File Size</p>
                    <p className="font-medium text-[#19183B]">{formatFileSize(documentDetails.fileSize)}</p>
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wide text-[#708993] font-medium">Document ID</p>
                    <p className="font-mono text-sm bg-[#F7F9F8] px-2 py-1 rounded inline-block">{documentDetails.dotsId}</p>
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wide text-[#708993] font-medium">Originator</p>
                    <p className="font-medium text-[#19183B]">{documentDetails.ownerName}</p>
                </div>
                
                    {documentDetails.signedAt && (
                    <div>
                        <p className="text-xs uppercase tracking-wide text-[#708993] font-medium">Originator's Last Signed At</p>
                        <p className="text-sm text-[#19183B]">
                        {formatDateTime(documentDetails.signedAt)}
                        </p>
                    </div>      
                    )}
                </div>
            </div>

            {/* View Trail */}
            {documentDetails.view && documentDetails.view.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-1.5 bg-[#E7F2EF] rounded-lg">
                    <Eye size={20} className="text-[#19183B]" />
                  </div>
                  <h2 className="text-xl font-semibold text-[#19183B]">View-Only</h2>
                  <span className="text-xs text-[#708993]">{documentDetails.view.length} viewer(s)</span>
                </div>
                <div className="space-y-3">
                  {documentDetails.view.map((viewer, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-l-2 border-[#A1C2BD] pl-4 py-2 hover:bg-[#F7F9F8] transition-colors">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-[#708993]" />
                        <span className="text-sm font-medium text-[#19183B]">{viewer.name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[#708993] mt-1 sm:mt-0">
                        <Mail size={12} />
                        <span>{viewer.email}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signature Workflow */}
            {documentDetails.viewSign && documentDetails.viewSign.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-1.5 bg-[#E7F2EF] rounded-lg">
                    <Users size={20} className="text-[#19183B]" />
                  </div>
                  <h2 className="text-xl font-semibold text-[#19183B]">Signature Workflow</h2>
                  <span className="text-xs text-[#708993]">{documentDetails.viewSign.length} recipient(s)</span>
                </div>

                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-[#E2E8F0]"></div>

                  <div className="space-y-6">
                    {Object.entries(groupedByStep || {})
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([step, signers]) => (
                        <div key={step} className="relative">
                          {/* Step indicator */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="relative z-10 w-10 h-10 bg-[#19183B] text-white rounded-full flex items-center justify-center font-semibold text-sm shadow-md">
                              {step}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-[#19183B]">Step {step}</span>
                              {signers.some(s => s.parallel) && (
                                <span className="inline-flex items-center gap-1 text-xs bg-[#E7F2EF] text-[#19183B] px-2 py-0.5 rounded-full">
                                  <GitBranch size={12} />
                                  Parallel
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Signers in this step */}
                          <div className="ml-14 space-y-3">
                            {signers.map((signer, idx) => {
                              const sigStatus = getSignatureStatus(signer.signedAt);
                              const SigIcon = sigStatus.icon;
                              return (
                                <div key={idx} className="bg-[#F7F9F8] rounded-lg p-4 border border-[#E2E8F0] hover:shadow-sm transition-shadow">
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <User size={14} className="text-[#708993]" />
                                        <span className="font-semibold text-[#19183B]">{signer.name}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-xs text-[#708993] ml-5">
                                        <Mail size={12} />
                                        <span>{signer.email}</span>
                                      </div>
                                    </div>
                                    <div className={`flex items-center gap-1.5 text-sm font-medium ${sigStatus.color} whitespace-nowrap`}>
                                      <SigIcon size={14} />
                                      <span>{sigStatus.label}</span>
                                      {sigStatus.timestamp && (
                                        <span className="text-xs text-[#708993] font-normal ml-1">
                                          {formatDateTime(sigStatus.timestamp)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {(!documentDetails.view?.length && !documentDetails.viewSign?.length) && (
              <div className="text-center py-12 text-[#708993] bg-[#F7F9F8] rounded-lg">
                <Clock size={32} className="mx-auto mb-2 opacity-50" />
                <p>No activity or signature records found.</p>
              </div>
            )}

            {/* Verification seal */}
            <div className="border-t border-[#E2E8F0] pt-6 mt-6 text-center">
              <div className="inline-flex items-center gap-2 text-xs text-[#708993]">
                <CheckCircle size={14} className="text-green-600" />
                <span>Verified via iPluma Signing Platform</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerificationPortal;