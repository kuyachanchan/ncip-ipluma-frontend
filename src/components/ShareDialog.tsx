/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { User, Mail, X, FileText, AlertCircle, Check } from 'lucide-react';
import api from '@/api/axiosInstance';
import toast from 'react-hot-toast';
import { useAuth } from '@/auth/useAuth';

interface UserType {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface PDFDocument {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: string;
  status: string;
  uploadedAt: string;
}

interface ShareDialogProps {
  document: PDFDocument;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isSignedDocument?: boolean;
}

const ShareDialog: React.FC<ShareDialogProps> = ({
  document,
  isOpen,
  onClose,
  onSuccess,
  isSignedDocument = false
}) => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [shareMessage, setShareMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { user: currentUser } = useAuth();

  // For signed document sharing (additional options)
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowForwarding, setAllowForwarding] = useState(true);
  const [expiresAt, setExpiresAt] = useState<string>('');

  // Load users on dialog open
  useEffect(() => {
    if (isOpen) {
      loadUsers();
    } else {
      // Reset state when dialog closes
      setSearchTerm('');
      setSelectedUser(null);
      setShareMessage('');
      setAllowDownload(true);
      setAllowForwarding(true);
      setExpiresAt('');
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      setIsSearching(true);
      // You'll need to create this endpoint in your backend
      const response = await api.get('v1/users/search', {
        params: { query: searchTerm, excludeCurrent: true, currentUserId: currentUser?.id}
      });
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = () => {
    loadUsers();
  };

  const handleShare = async () => {
    if (!selectedUser || !currentUser?.id) {
      toast.error('Please select a user to share with');
      return;
    }

    if (selectedUser.id.toString() === currentUser.id.toString()) {
      toast.error('Cannot share document with yourself');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignedDocument) {
        // Share signed document
        const requestData = {
          ownerUserId: parseInt(currentUser.id),
          shareWithUserId: selectedUser.id,
          shareMessage: shareMessage || undefined,
          allowDownload,
          allowForwarding,
          expiresAt: expiresAt || undefined
        };

        const response = await api.post(
          `v1/documents/${document.id}/share-signed`,
          requestData
        );

        if (response.data.success) {
          toast.success('Signed document shared successfully!');
          onSuccess?.();
          onClose();
        }
      } else {
        // Share regular document
        const requestData = {
          ownerUserId: parseInt(currentUser.id),
          shareWithUserId: selectedUser.id
        };

        const response = await api.post(
          `v1/documents/${document.id}/share`,
          requestData
        );

        if (response.status === 200) {
          toast.success('Document shared successfully!');
          onSuccess?.();
          onClose();
        }
      }
    } catch (error: any) {
      console.error('Error sharing document:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to share document';
      toast.error(`Share failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border-2 border-[#A1C2BD] z-[100]">
          <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B] mb-4">
            <div className="p-2 bg-[#A1C2BD] rounded-lg">
              <FileText className="w-6 h-6 text-[#19183B]" />
            </div>
            {isSignedDocument ? 'Share Signed Document' : 'Share Document'}
          </Dialog.Title>

          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Sharing: <span className="font-bold">{document.fileName}</span>
                </p>
                {isSignedDocument && (
                  <p className="text-xs text-blue-600 mt-1">
                    This is a signed document. Recipients will see it as a verified document.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#19183B] mb-2">
              Search Users
            </label>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#708993]" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] outline-none transition-all"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-4 py-2.5 bg-[#19183B] text-white rounded-xl font-semibold hover:bg-[#708993] transition-colors disabled:opacity-50"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* User List */}
            <div className="max-h-48 overflow-y-auto border border-[#A1C2BD] rounded-lg">
              {isSearching ? (
                <div className="p-4 text-center text-[#708993]">
                  Searching users...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-[#708993]">
                  No users found. Try a different search.
                </div>
              ) : (
                <div className="divide-y divide-[#E7F2EF]">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`p-3 cursor-pointer hover:bg-[#E7F2EF] transition-colors ${
                        selectedUser?.id === user.id ? 'bg-[#A1C2BD]/30' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#19183B] rounded-full flex items-center justify-center text-white font-semibold">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-[#19183B]">
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}`
                                : user.username}
                            </p>
                            <p className="text-sm text-[#708993] flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                        {selectedUser?.id === user.id && (
                          <Check className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Share Message */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#19183B] mb-2">
              Message (Optional)
            </label>
            <textarea
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              placeholder="Add a message for the recipient..."
              className="w-full px-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] outline-none transition-all resize-none h-24"
            />
          </div>

          {/* Signed Document Options */}
          {isSignedDocument && (
            <div className="mb-6 space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-[#19183B]">Sharing Options</h3>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowDownload}
                    onChange={(e) => setAllowDownload(e.target.checked)}
                    className="w-5 h-5 rounded border-[#A1C2BD] text-[#19183B] focus:ring-[#708993]"
                  />
                  <span className="text-[#19183B]">Allow download</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowForwarding}
                    onChange={(e) => setAllowForwarding(e.target.checked)}
                    className="w-5 h-5 rounded border-[#A1C2BD] text-[#19183B] focus:ring-[#708993]"
                  />
                  <span className="text-[#19183B]">Allow forwarding</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-[#19183B] mb-1">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] outline-none transition-all"
                  />
                  <p className="text-xs text-[#708993] mt-1">
                    The document will be automatically unshared after this date
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Selected User Display */}
          {selectedUser && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-green-800">
                      Sharing with {selectedUser.username}
                    </p>
                    <p className="text-sm text-green-600">{selectedUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-green-600" />
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-[#A1C2BD] text-[#19183B] rounded-xl font-semibold hover:bg-[#E7F2EF] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={isLoading || !selectedUser}
              className="flex-1 px-6 py-3 bg-[#19183B] text-white rounded-xl font-semibold hover:bg-[#708993] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Share Document
                </>
              )}
            </button>
          </div>

          <Dialog.Close className="absolute top-4 right-4 p-2 hover:bg-[#E7F2EF] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[#708993]" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ShareDialog;