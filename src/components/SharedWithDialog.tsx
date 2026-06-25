// SharedWithDialog.tsx
import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Users, X, Eye, PenTool, User, ListOrdered, UsersIcon, CheckCircle } from 'lucide-react';
import type { PDFDocument, UserType } from '@/types/types';
import { useAuth } from '@/auth/useAuth';

interface SharedUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: PDFDocument | null;
  currentUser?: UserType | null;
}

const SharedWithDialog: React.FC<SharedUsersModalProps> = ({
  open,
  onOpenChange,
  document,
  currentUser,
}) => {

  const { user } = useAuth()

  const viewOnlyUsers = document?.sharedToUsers?.filter(user => user.permission === 'view') || [];
  const viewAndSignUsers = document?.sharedToUsers?.filter(user => user.permission === 'view_and_sign') || [];

  const getStepDisplay = (userId: string) => {
    const userStep = document?.signerSteps?.find(step => step.userId === userId);
    return userStep;
  };



  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border-2 border-[#A1C2BD] z-50">
          {/* Header */}
          <div className="p-6 border-b border-[#A1C2BD] bg-white rounded-t-2xl shrink-0">
            <div className="flex items-center justify-between">
              <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B]">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                Shared With
              </Dialog.Title>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-[#E7F2EF] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#708993]" />
              </button>
            </div>

            <div className="mt-4">
              <p className="text-[#708993] text-sm">
                Document "<span className="font-semibold text-[#19183B]">{document?.fileName}</span>" is shared with the following users:
              </p>

              {/* Show if signing order is enabled */}
              {document?.signerSteps && document.signerSteps.length > 0 && document.availableForSigning && (
                <div className="mt-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded">
                  <div className="flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-purple-600" />
                    <div>
                      <p className="text-xs text-purple-700 font-semibold">
                        {document.signerSteps.some(s => s.parallel)
                          ? 'Parallel Signing Order Enabled'
                          : 'Signing Order Enabled'}
                      </p>
                      <p className="text-xs text-purple-600">
                        {document.signerSteps.filter(s => s.hasSigned).length} of {document.signerSteps.length} signers completed
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {document?.sharedToUsers && document.sharedToUsers.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-4">
                  {/* View Only Users */}
                  {viewOnlyUsers.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-green-100 rounded-lg">
                          <Eye className="w-4 h-4 text-green-600" />
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900">View Only</h4>
                        <span className="text-xs text-gray-500">
                          ({viewOnlyUsers.length} users)
                        </span>
                      </div>
                      <div className="space-y-2">
                        {viewOnlyUsers.map((sharedUser) => (
                          <div
                            key={sharedUser.id}
                            className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                          >
                            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full shrink-0">
                              <User className="w-5 h-5 text-green-600" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-[#19183B] truncate">
                                  {sharedUser.id === currentUser?.id ? 'You' : sharedUser.username}
                                </p>
                              </div>
                              <p className="text-xs text-[#708993] truncate">
                                {sharedUser.email}
                              </p>
                            </div>

                            <div className="shrink-0">
                              <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                View Only
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View & Sign Users */}
                  {viewAndSignUsers.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                          <PenTool className="w-4 h-4 text-purple-600" />
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900">View & Sign</h4>
                        <span className="text-xs text-gray-500">
                          ({viewAndSignUsers.length} users)
                        </span>
                      </div>
                      <div className="space-y-2">
                        {viewAndSignUsers
                          .map((sharedUser) => {
                            const userStep = getStepDisplay(sharedUser.id);
                            return { sharedUser, userStep };
                          })
                          .filter(item => item.userStep)
                          .sort((a, b) => {
                            const stepA = a.userStep?.step || Infinity;
                            const stepB = b.userStep?.step || Infinity;
                            return stepA - stepB;
                          })
                          .map(({ sharedUser, userStep }) => {
                            if (!userStep) return null;
                            return (
                              <div
                                key={sharedUser.id}
                                className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                              >
                                {/* Step number indicator */}
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                                  userStep.hasSigned
                                    ? 'bg-green-100 border-2 border-green-300'
                                    : userStep.parallel
                                    ? 'bg-blue-100 border-2 border-blue-300'
                                    : 'bg-purple-100 border-2 border-purple-300'
                                }`}>
                                  {userStep.hasSigned ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  ) : userStep.parallel ? (
                                    <UsersIcon className="w-4 h-4 text-blue-600" />
                                  ) : !document.availableForSigning ? (
                                    <User className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <span className="text-sm font-bold text-purple-700">{userStep.step}</span>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-[#19183B] truncate">
                                      {sharedUser.id == user?.id ? 'You' : sharedUser.username}
                                    </p>
                                    {userStep.hasSigned && (
                                      <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                        Signed
                                      </span>
                                    )}
                                    {userStep.decline && (
                                      <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                                        Declined
                                      </span>
                                    )}
                                    {userStep.parallel && !userStep.hasSigned && (
                                      <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                        Parallel
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#708993] truncate">
                                    {sharedUser.email}
                                  </p>
                                </div>

                                <div className="shrink-0 flex items-center gap-2">
                                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                                    userStep.hasSigned
                                      ? 'bg-green-100 text-green-700'
                                      : userStep.parallel
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-purple-100 text-purple-700'
                                  }`}>
                                    {userStep.hasSigned ? 'Signed ✓' :
                                      userStep.parallel ? `Step ${userStep.step} (Parallel)` : `Step ${userStep.step}`}
                                  </span>
                                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                                    View & Sign
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-[#708993]">
                <Users className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">This document hasn't been shared with anyone yet</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 p-4 border-t border-[#A1C2BD] bg-white rounded-b-2xl">
            <div className="flex justify-between items-center">
              <p className="text-sm text-[#708993]">
                {document?.sharedToUsers?.length || 0} user(s) have access to this document
                {document?.signerSteps && document.signerSteps.length > 0 && document.availableForSigning &&
                  ` • ${document.signerSteps.filter(s => s.hasSigned).length}/${document.signerSteps.length} completed signing`}
              </p>
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm bg-[#19183B] text-white rounded-lg font-medium hover:bg-[#708993] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SharedWithDialog;