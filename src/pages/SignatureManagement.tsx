/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import * as Form from '@radix-ui/react-form';
import * as Select from '@radix-ui/react-select';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { FileImage, CheckCircle, Upload, ChevronDown, Check, Pencil, Trash2, X, Plus, Flag } from 'lucide-react';
import { useAuthImage } from '../hooks/useAuthImage';

import { useAuth } from '@/auth/useAuth';

import api from '@/api/axiosInstance';

interface Signature {
  id: string;
  fileName: string;
  signatureType: 'INITIAL' | 'FULL';
  previewUrl: string;
  createdAt: string;
  fileSize?: number;
  default: boolean;
}

interface SignatureCardProps {
  signature: Signature;
  onEdit: (signature: Signature) => void;
  onDelete: (signature: Signature) => void;
  onSetDefault: (signature: Signature) => void;
}

const SignatureCard: React.FC<SignatureCardProps> = ({ signature, onEdit, onDelete, onSetDefault }) => {
  const { imageSrc, loading, error } = useAuthImage({
    url: signature.previewUrl
  });

  return (
    <div
      key={signature.id}
      className="border-2 border-[#A1C2BD] rounded-xl p-4 hover:shadow-lg transition-all bg-white group"
    >

      {/* Header Section */}
      <div className="flex justify-between items-start mb-4">
        {signature.default && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-600 text-xs font-semibold rounded-full">
            <Flag className="w-3 h-3 fill-amber-600" />
            Default
          </span>
        )}
      </div>

      {/* Image Section */}
      <div className="aspect-[3/1] bg-[#E7F2EF] rounded-lg mb-4 flex items-center justify-center overflow-hidden">
        {loading && <span className="text-sm text-gray-400 animate-pulse">Loading...</span>}
        {error && <span className="text-sm text-red-500">Failed to load</span>}
        {!loading && !error && imageSrc && (
          <img
            src={imageSrc}
            alt={signature.fileName}
            className="max-w-full max-h-full object-contain"
          />
        )}
      </div>

      {/* Info Section */}
      <div className="mb-3">
        <p className="font-semibold text-[#19183B] truncate">{signature.fileName}</p>
        <p className="text-xs text-[#708993]">
          Added {new Date(signature.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!signature.default && (
          <button
            onClick={() => onSetDefault(signature)}
            className="flex items-center justify-center gap-2 bg-amber-100 text-amber-600 px-4 py-2 rounded-lg hover:bg-amber-600 hover:text-white transition-colors"
            title="Set as default"
          >
            <Flag className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => onEdit(signature)}
          className={`flex items-center justify-center gap-2 text-white px-4 py-2 rounded-lg hover:bg-[#19183B] transition-colors ${
            signature.default ? 'flex-1 bg-[#708993]' : 'bg-[#708993]'
          }`}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(signature)}
          className="flex items-center justify-center bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};


interface SignatureCardPreviewProps {
  previewUrl: string;
}

const SignatureCardPreview: React.FC<SignatureCardPreviewProps> = ({ previewUrl }) => {
  const isLocal = previewUrl.startsWith("blob:") || previewUrl.startsWith("data:");
  const { imageSrc, loading, error } = useAuthImage({
    url: previewUrl
  })

  const finalSrc = isLocal ? previewUrl : imageSrc;

  if (isLocal) {
    return (
      <img
        src={finalSrc ?? undefined}
        alt="Preview"
        className="max-h-32 object-contain"
      />
    );
  }

  return (
    <>
        {/* Image Section */}
        {loading && <span className="text-sm text-gray-400 animate-pulse">Loading...</span>}
        {error && <span className="text-sm text-red-500">Failed to load</span>}
        {!loading && !error && finalSrc && (
          <img
            src={finalSrc}
            alt="Preview"
            className="max-h-32 object-contain"
          />
        )}
    </>
  )
}

const SignatureManagement: React.FC = () => {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [activeTab, setActiveTab] = useState<'INITIAL' | 'FULL'>('FULL');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [setDefaultDialogOpen, setSetDefaultDialogOpen] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState<Signature | null>(null);
  
  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<'INITIAL' | 'FULL' | ''>('');
  const [isUploading, setIsUploading] = useState(false);

  // Edit form state
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [editType, setEditType] = useState<'INITIAL' | 'FULL' | ''>('');

  const { user } = useAuth();


  // Load signatures from API or storage
  useEffect(() => {
    if (user?.id && user?.roles) {
      loadSignatures(user.id);
    }
  }, []);

  const loadSignatures = async (userId:string | null) => {
    try {
      const params = {
        user_id: userId,
        user_roles: ''
      }

      const response = await api.get("v1/signatures", { params })
      setSignatures(response.data);
    } catch (error) {
      console.error("Error loading signatures:", error); 
    }
  };

  const handleUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setEditFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadType) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append('signature', uploadFile);
    formData.append('signatureType', uploadType.toUpperCase());
    if (user?.id) {
      console.log(user.id)
      formData.append('user_id', String(user.id));
    }

    try {
      const response = await api.post('v1/signatures/new', formData, {
        headers: {
          'Content-Type':'multipart/form-data'
        }
      });

      const newSignature = response.data

      setSignatures([...signatures, newSignature]);
      setUploadDialogOpen(false);
      resetUploadForm();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload signature');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSignature) return;

    setIsUploading(true);

    try {
      const formData = new FormData();

      // Append file if user uploaded a new one
      if (editFile) {
        formData.append("signature", editFile);
      }

      // Append signature type if changed
      if (editType) {
        formData.append("signatureType", editType);
      }

      // Always include user id if needed
      if (user?.id) {
        formData.append("user_id", user.id);
      }

      const response = await api.put(
        `/v1/signatures/${selectedSignature.id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const data = response.data;

      // Update the state locally
      const updatedSignature: Signature = {
        ...selectedSignature,
        fileName: data.fileName ? data.fileName : selectedSignature.fileName,
        signatureType: data.signatureType || selectedSignature.signatureType,
        previewUrl: data.previewUrl || selectedSignature.previewUrl,
      };

      setSignatures((prev) =>
        prev.map((sig) =>
          sig.id === selectedSignature.id ? updatedSignature : sig
        )
      );

      setEditDialogOpen(false);
      resetEditForm();
    } catch (error) {
      console.error("Update error:", error);
      alert("Failed to update signature");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSignature) return;

    try {
      await api.delete(`v1/signatures/${selectedSignature.id}`)

      setSignatures(signatures.filter(sig => sig.id !== selectedSignature.id));
      setDeleteDialogOpen(false);
      setSelectedSignature(null);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete signature');
    }
  };

  const handleSetDefault = async () => {
    if (!selectedSignature) return;

    try {
      const response = await api.patch(`/v1/signatures/${selectedSignature.id}/set-default?user_id=${user?.id}`);

      if (response.status === 200) {

        // Update local state for signatures of the same type only
      setSignatures(prev =>
        prev.map(sig => 
          sig.signatureType === selectedSignature.signatureType
            ? { ...sig, default: sig.id === selectedSignature.id }
            : sig
        )
      );

        setSetDefaultDialogOpen(false);
        setSelectedSignature(null);
      } else {
        throw new Error(`Set default failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Set default error:', error);
      alert('Failed to set default signature. Please try again.');
    }
  };



  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadPreview(null);
    setUploadType('');
  };

  const resetEditForm = () => {
    setEditFile(null);
    setEditPreview(null);
    setEditType('');
    setSelectedSignature(null);
  };

  const openEditDialog = (signature: Signature) => {
    setSelectedSignature(signature);
    setEditType(signature.signatureType);
    setEditPreview(signature.previewUrl);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (signature: Signature) => {
    setSelectedSignature(signature);
    setDeleteDialogOpen(true);
  };

  const openSetDefaultDialog = (signature: Signature) => {
    setSelectedSignature(signature);
    setSetDefaultDialogOpen(true);
  };

  const filteredSignatures = signatures.filter(sig => sig.signatureType === activeTab);

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
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 border border-[#A1C2BD]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-[#A1C2BD] rounded-lg shrink-0">
                <FileImage className="w-5 h-5 sm:w-6 sm:h-6 text-[#19183B]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-3xl font-bold text-[#19183B] truncate">Signatures</h1>
                <p className="text-xs sm:text-sm text-[#708993]">Upload, manage, and organize your digital signatures</p>
              </div>
            </div>
            <button
              onClick={() => setUploadDialogOpen(true)}
              className="flex items-center gap-2 bg-[#19183B] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-sm sm:text-base font-semibold hover:bg-[#708993] transition-colors shadow-lg shrink-0 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              Add Signature
            </button>
          </div>
        </div>

        {/* Tabs Gallery */}
        <div className="bg-white rounded-xl shadow-sm border border-[#A1C2BD] overflow-hidden">
          <Tabs.Root value={activeTab} onValueChange={(value) => setActiveTab(value as 'INITIAL' | 'FULL')}>
            <Tabs.List className="flex border-b border-[#A1C2BD] bg-[#E7F2EF]/50">
              <Tabs.Trigger
                value="FULL"
                className="flex-1 px-3 sm:px-6 py-3 sm:py-4 text-sm sm:text-base text-[#708993] font-semibold hover:bg-[#A1C2BD]/20 transition-colors data-[state=active]:bg-white data-[state=active]:text-[#19183B] data-[state=active]:border-b-2 data-[state=active]:border-[#19183B]"
              >
                <span className="hidden sm:inline">Full Signatures</span>
                <span className="sm:hidden">Full</span>
                <span className="ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-[#A1C2BD] text-white rounded-full">
                  {signatures.filter(s => s.signatureType === 'FULL').length}
                </span>
              </Tabs.Trigger>
              <Tabs.Trigger
                value="INITIAL"
                className="flex-1 px-3 sm:px-6 py-3 sm:py-4 text-sm sm:text-base text-[#708993] font-semibold hover:bg-[#A1C2BD]/20 transition-colors data-[state=active]:bg-white data-[state=active]:text-[#19183B] data-[state=active]:border-b-2 data-[state=active]:border-[#19183B]"
              >
                <span className="hidden sm:inline">Initial Signatures</span>
                <span className="sm:hidden">Initial</span>
                <span className="ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-[#A1C2BD] text-white rounded-full">
                  {signatures.filter(s => s.signatureType === 'INITIAL').length}
                </span>
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="FULL" className="p-4 sm:p-6">
              {filteredSignatures.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-[#708993]">
                  <FileImage className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-50" />
                  <p className="text-base sm:text-lg mb-2">No full signatures yet</p>
                  <p className="text-xs sm:text-sm text-center px-4">Click "Add Signature" to upload your first full signature</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredSignatures.map((signature) => (
                    <SignatureCard
                      key={signature.id}
                      signature={signature}
                      onEdit={openEditDialog}
                      onDelete={openDeleteDialog}
                      onSetDefault={openSetDefaultDialog}
                    />
                  ))}
                </div>
              )}
            </Tabs.Content>

            <Tabs.Content value="INITIAL" className="p-4 sm:p-6">
              {filteredSignatures.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-[#708993]">
                  <FileImage className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-50" />
                  <p className="text-base sm:text-lg mb-2">No initial signatures yet</p>
                  <p className="text-xs sm:text-sm text-center px-4">Click "Add Signature" to upload your first initial signature</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
                  {filteredSignatures.map((signature) => (
                    <SignatureCard
                      key={signature.id}
                      signature={signature}
                      onEdit={openEditDialog}
                      onDelete={openDeleteDialog}
                      onSetDefault={openSetDefaultDialog}
                    />
                  ))}
                </div>
              )}
            </Tabs.Content>
          </Tabs.Root>
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
              Upload Signature
            </Dialog.Title>

            <Form.Root onSubmit={handleUploadSubmit} className="space-y-5">
              <Form.Field name="signatureType">
                <div className="flex items-baseline justify-between mb-2">
                  <Form.Label className="text-sm font-semibold text-[#19183B]">
                    Signature Type
                  </Form.Label>
                  <Form.Message match="valueMissing" className="text-xs text-red-600">
                    Please select a type
                  </Form.Message>
                </div>
                <Select.Root value={uploadType} onValueChange={(value) => setUploadType(value as 'INITIAL' | 'FULL')} required>
                  <Select.Trigger className="w-full px-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all flex items-center justify-between bg-white">
                    <Select.Value placeholder="Select signature type" />
                    <Select.Icon>
                      <ChevronDown className="w-5 h-5 text-[#708993]" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="bg-white rounded-xl shadow-xl border-2 border-[#A1C2BD] overflow-hidden">
                      <Select.Viewport>
                        <Select.Item value="full" className="px-4 py-3 hover:bg-[#E7F2EF] cursor-pointer outline-none flex items-center justify-between">
                          <Select.ItemText>Full Signature</Select.ItemText>
                          <Select.ItemIndicator>
                            <Check className="w-4 h-4 text-[#19183B]" />
                          </Select.ItemIndicator>
                        </Select.Item>
                        <Select.Item value="initial" className="px-4 py-3 hover:bg-[#E7F2EF] cursor-pointer outline-none flex items-center justify-between">
                          <Select.ItemText>Initial Signature</Select.ItemText>
                          <Select.ItemIndicator>
                            <Check className="w-4 h-4 text-[#19183B]" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </Form.Field>

              <Form.Field name="signatureFile">
                <div className="flex items-baseline justify-between mb-2">
                  <Form.Label className="text-sm font-semibold text-[#19183B]">
                    Signature Image (.png)
                  </Form.Label>
                  <Form.Message match="valueMissing" className="text-xs text-red-600">
                    Please upload a file
                  </Form.Message>
                </div>
                <input
                  type="file"
                  accept=".png,image/png"
                  onChange={handleUploadFileChange}
                  required
                  className="w-full px-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] outline-none transition-all cursor-pointer"
                />
                {uploadPreview && (
                  <div className="mt-4 p-4 bg-[#E7F2EF] rounded-xl border border-[#A1C2BD]">
                    <p className="text-xs text-[#708993] mb-2">Preview:</p>
                    <div className="bg-white rounded-lg p-4 flex items-center justify-center">
                      <img src={uploadPreview} alt="Preview" className="max-h-32 object-contain" />
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
                    disabled={isUploading || !uploadFile || !uploadType}
                    className="flex-1 px-6 py-3 bg-[#19183B] text-white rounded-xl font-semibold hover:bg-[#708993] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
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

      {/* Edit Dialog */}
      <Dialog.Root open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-[#A1C2BD]">
            <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B] mb-4">
              <div className="p-2 bg-[#708993] rounded-lg">
                <Pencil className="w-6 h-6 text-white" />
              </div>
              Edit Signature
            </Dialog.Title>

            <Form.Root onSubmit={handleEditSubmit} className="space-y-5">
              <Form.Field name="signatureType">
                <Form.Label className="text-sm font-semibold text-[#19183B] mb-2 block">
                  Signature Type
                </Form.Label>
                <Select.Root value={editType} onValueChange={(value) => setEditType(value as 'INITIAL' | 'FULL')}>
                  <Select.Trigger className="w-full px-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all flex items-center justify-between bg-white">
                    <Select.Value placeholder="Select signature type" />
                    <Select.Icon>
                      <ChevronDown className="w-5 h-5 text-[#708993]" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="bg-white rounded-xl shadow-xl border-2 border-[#A1C2BD] overflow-hidden">
                      <Select.Viewport>
                        <Select.Item value="FULL" className="px-4 py-3 hover:bg-[#E7F2EF] cursor-pointer outline-none flex items-center justify-between">
                          <Select.ItemText>Full Signature</Select.ItemText>
                          <Select.ItemIndicator>
                            <Check className="w-4 h-4 text-[#19183B]" />
                          </Select.ItemIndicator>
                        </Select.Item>
                        <Select.Item value="INITIAL" className="px-4 py-3 hover:bg-[#E7F2EF] cursor-pointer outline-none flex items-center justify-between">
                          <Select.ItemText>Initial Signature</Select.ItemText>
                          <Select.ItemIndicator>
                            <Check className="w-4 h-4 text-[#19183B]" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </Form.Field>

              <Form.Field name="signatureFile">
                <Form.Label className="text-sm font-semibold text-[#19183B] mb-2 block">
                  Replace Image (optional)
                </Form.Label>
                <input
                  type="file"
                  accept=".png,image/png"
                  onChange={handleEditFileChange}
                  className="w-full px-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] outline-none transition-all cursor-pointer"
                />

                
                  <div className="mt-4 p-4 bg-[#E7F2EF] rounded-xl border border-[#A1C2BD]">
                    <p className="text-xs text-[#708993] mb-2">Preview:</p>
                  <div className="bg-white rounded-lg p-4 flex items-center justify-center">
                    {editPreview && (
                     selectedSignature ? (
                        <SignatureCardPreview
                          previewUrl={editPreview}
                        />
                      ) : (
                        <p className="text-sm text-gray-500 italic">No signature selected</p>
                      )
                    )}
                  </div>
                </div>
                
              </Form.Field>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditDialogOpen(false);
                    resetEditForm();
                  }}
                  className="flex-1 px-6 py-3 border-2 border-[#A1C2BD] text-[#19183B] rounded-xl font-semibold hover:bg-[#E7F2EF] transition-colors"
                >
                  Cancel
                </button>
                <Form.Submit asChild>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="flex-1 px-6 py-3 bg-[#708993] text-white rounded-xl font-semibold hover:bg-[#19183B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Update
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
              Delete Signature
            </Dialog.Title>

            <p className="text-[#708993] mb-6">
              Are you sure you want to delete "{selectedSignature?.fileName}"? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setSelectedSignature(null);
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
              Set Default Signature
            </Dialog.Title>

            <p className="text-[#708993] mb-6">
              Are you sure you want to set "{selectedSignature?.fileName}" as your default signature? This will be used as the primary signature for signing documents.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSetDefaultDialogOpen(false);
                  setSelectedSignature(null);
                }}
                className="flex-1 px-6 py-3 border-2 border-[#A1C2BD] text-[#19183B] rounded-xl font-semibold hover:bg-[#E7F2EF] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSetDefault}
                className="flex-1 px-6 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
              >
                <Flag className="w-5 h-5" />
                Set as Default
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

export default SignatureManagement;