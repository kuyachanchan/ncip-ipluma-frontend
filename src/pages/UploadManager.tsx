/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import * as Form from '@radix-ui/react-form';
import * as Dialog from '@radix-ui/react-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import UserPdfVerifierv2 from '@/user/UserPdfVerifierv2';
import {
  FileText,
  Upload,
  Search,
  Download,
  PenTool,
  Share2,
  Info,
  Trash2,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  ZoomOut,
  ZoomIn,
  Eye,
  User,
  Users,
  Check,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  ListOrdered,
  GripVertical,
  HardDrive,
  Clock,
  CheckCircle,
  AlertCircle,
  Users as UsersIcon,
  UserCheck,
  UserX,
  Files,
  CircleCheck,
  RefreshCcw
} from 'lucide-react';

import { Document, Page, pdfjs } from 'react-pdf';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import UpdateFlowDialog from '@/components/UpdateFlowDialog';
import type { BookmarkItem, InitialSignerStep } from '@/types/types';

pdfjs.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

interface PDFDocument {
  comment: string;
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: string;
  status: string;
  uploadedAt: string;
  ownerDetails?: {
    id: string;
    username: string;
    email: string;
  };
  sharedToUsers?: Array<{
    id: string;
    username: string;
    email: string;
    permission?: 'view' | 'view_and_sign';
    step?: number;
    hasSigned?: boolean;
  }>;
  availableForSigning?: boolean;
  availableForViewing?: boolean;
  permission?: 'view' | 'view_and_sign';
  downloadable?: boolean;
  signerSteps?: SignerStep[];
  currentSignerIndex?: number;
  bookmarks?: BookmarkItem[];
  initialSignerSteps?: InitialSignerStep[];
  [key: string]: unknown;
}

interface UserType {
  id: string;
  username: string;
  email: string;
  roles?: string[] | Array<{ id: number; name: string }>;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  offset: number;
}

interface SignerStep {
  dsId?: DocumentSharedId;
  step: number;
  userId: string;
  user?: UserType;
  hasSigned?: boolean;
  signedAt?: string;
  parallel?: boolean;
  parallelGroup?: number;
  permission?: string;
  decline?: boolean;
  proceedNext?: boolean;
  downloadable?: boolean;
  /** Carried through from bookmark assignment */
  signaturePreference?: 'full' | 'initial';
}

// Sortable item component for drag and drop with parallel signing support
interface SortableItemProps {
  id: string;
  step: SignerStep;
  index: number;
  moveSignerUp: (index: number) => void;
  moveSignerDown: (index: number) => void;
  totalItems: number;
  onToggleParallel: (userId: string) => void;
  getParallelGroup: (stepNumber: number) => SignerStep[];
  isPreConfigured?: boolean;
}

interface DocumentSharedId {
  documentId: number;
  userId: number;
}

interface SkipRequest {
  documentSharedId: DocumentSharedId;
  signerId?: number;
  ownerId?: number;
}
const SortableItem: React.FC<SortableItemProps> = ({
  id,
  step,
  index,
  moveSignerUp,
  moveSignerDown,
  totalItems,
  onToggleParallel,
  getParallelGroup,
  isPreConfigured = false // ← Default to false
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const parallelGroup = getParallelGroup(step.step);
  const isFirstInParallel = parallelGroup[0]?.userId === step.userId;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-white rounded-lg border transition-all ${isDragging
        ? 'border-purple-400 shadow-lg z-50'
        : step.parallel
          ? 'border-blue-300 bg-blue-50'
          : isPreConfigured
            ? 'border-blue-200 bg-blue-50/50'
            : 'border-gray-200 hover:border-purple-300'
        }`}
    >
      <div
        {...(isPreConfigured ? {} : attributes)}
        {...(isPreConfigured ? {} : listeners)}
        className={`shrink-0 ${isPreConfigured ? 'text-gray-300 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing text-gray-400 hover:text-purple-600'}`}
      >
        {isPreConfigured ? (
          <Lock className="w-4 h-4 text-gray-400" />
        ) : (
          <GripVertical className="w-5 h-5" />
        )}
      </div>

      <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${step.hasSigned ? 'bg-green-100' :
        step.parallel ? 'bg-blue-100' : isPreConfigured ? 'bg-blue-100' : 'bg-purple-100'
        }`}>
        <span className={`text-sm font-bold ${step.hasSigned ? 'text-green-700' :
          step.parallel ? 'text-blue-700' : isPreConfigured ? 'text-blue-700' : 'text-purple-700'
          }`}>
          {step.step}
          {step.parallel && isFirstInParallel && (
            <span className="text-xs ml-0.5">*</span>
          )}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">
            {step.user?.username || 'Unknown User'}
          </p>
          {step.hasSigned && (
            <span className="text-xs text-green-600 font-normal">
              ✓ Signed
            </span>
          )}
          {step.parallel && (
            <span className="text-xs text-blue-600 font-normal flex items-center gap-1">
              <UsersIcon className="w-3 h-3" />
              Parallel
            </span>
          )}
          {isPreConfigured && (
            <span className="text-xs text-blue-600 font-normal flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Pre-configured
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">
          {step.user?.email || ''}
        </p>
        {step.signedAt && (
          <p className="text-xs text-gray-400">
            Signed on {new Date(step.signedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Parallel Signing Toggle */}
        <button
          onClick={() => !isPreConfigured && onToggleParallel(step.userId)}
          disabled={isPreConfigured}
          className={`p-1.5 rounded transition-colors ${isPreConfigured
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : step.parallel
              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-blue-600'
            }`}
          title={isPreConfigured ? "Pre-configured signers cannot be modified" : (step.parallel ? "Remove from parallel signing" : "Add to parallel signing")}
        >
          {step.parallel ? (
            <UserX className="w-4 h-4" />
          ) : (
            <UserCheck className="w-4 h-4" />
          )}
        </button>

        {/* Move buttons */}
        <div className="flex items-center gap-1 border-l border-gray-300 pl-2">
          <button
            onClick={() => !isPreConfigured && moveSignerUp(index)}
            disabled={isPreConfigured || index === 0}
            className={`p-1 rounded transition-colors ${isPreConfigured
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            title={isPreConfigured ? "Pre-configured signers cannot be moved" : "Move up"}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => !isPreConfigured && moveSignerDown(index)}
            disabled={isPreConfigured || index === totalItems - 1}
            className={`p-1 rounded transition-colors ${isPreConfigured
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            title={isPreConfigured ? "Pre-configured signers cannot be moved" : "Move down"}
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Component to show signing order in sign dialog with parallel support
interface SigningOrderProps {
  document: PDFDocument;
  currentUser: UserType | null;
}

const SigningOrderIndicator: React.FC<SigningOrderProps> = ({ document, currentUser }) => {
  if (!document.signerSteps || document.signerSteps.length === 0) {
    return null;
  }

  // Group signers by step number for parallel signing display
  const stepsMap = new Map<number, SignerStep[]>();
  document.signerSteps.forEach(step => {
    if (!stepsMap.has(step.step)) {
      stepsMap.set(step.step, []);
    }
    stepsMap.get(step.step)!.push(step);
  });

  // Get sorted steps
  const sortedSteps = Array.from(stepsMap.entries()).sort(([a], [b]) => a - b);

  // Find current user's step(s)
  const currentUserSteps = document.signerSteps.filter(step => step.user?.id === currentUser?.id);

  // Find the current active step (first step with any unsigned signers)
  const currentActiveStep = sortedSteps.find(([_stepNumber, signers]) =>
    signers.some(signer => !signer.hasSigned)
  );

  // Check if it's current user's turn to sign
  const isCurrentUserTurn = currentUserSteps.some(userStep =>
    currentActiveStep &&
    userStep.step === currentActiveStep[0] &&
    !userStep.hasSigned
  );

  // Calculate progress
  const totalSigners = document.signerSteps.length;
  const completedSigners = document.signerSteps.filter(s => s.hasSigned).length;

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-5 h-5 text-purple-600" />
          <h3 className="text-base font-semibold text-gray-900">Signing Order</h3>
          {sortedSteps.some(([_, signers]) => signers.length > 1) && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
              Parallel Signing Enabled
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          {completedSigners} of {totalSigners} completed
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{Math.round((completedSigners / totalSigners) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(completedSigners / totalSigners) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {sortedSteps.map(([stepNumber, signers]) => {
          const isActive = currentActiveStep && stepNumber === currentActiveStep[0];
          const allSigned = signers.every(signer => signer.hasSigned);
          const someSigned = signers.some(signer => signer.hasSigned);
          const isCurrentUserInStep = signers.some(signer =>
            signer.user?.id === currentUser?.id
          );

          return (
            <div
              key={stepNumber}
              className={`rounded-lg border transition-all ${isActive
                ? 'border-purple-300 bg-purple-50 shadow-sm'
                : allSigned
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-white'
                } ${isCurrentUserInStep ? 'ring-2 ring-offset-1 ring-blue-300' : ''}`}
            >
              {/* Step Header */}
              <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full ${allSigned
                  ? 'bg-green-100 border-2 border-green-300'
                  : isActive
                    ? 'bg-purple-100 border-2 border-purple-300'
                    : 'bg-gray-100 border-2 border-gray-300'
                  }`}>
                  {allSigned ? (
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  ) : (
                    <span className={`text-xs font-bold ${isActive ? 'text-purple-700' : 'text-gray-600'
                      }`}>
                      {stepNumber}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${isCurrentUserInStep ? 'text-blue-700' :
                      isActive ? 'text-purple-700' :
                        allSigned ? 'text-green-700' : 'text-gray-700'
                      }`}>
                      Step {stepNumber}
                      {signers.length > 1 && ` (${signers.length} signers in parallel)`}
                    </p>
                    {isActive && !allSigned && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        {someSigned ? 'Partially Signed' : 'Active Now'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {allSigned ? '✓ All signers completed' :
                      isActive ? (someSigned ? '⏳ Some signers pending' : '⏳ Waiting for signatures') :
                        '⏳ Waiting for previous steps'}
                  </p>
                </div>
              </div>

              {/* Signers in this step */}
              <div className="p-2">
                {signers.map((signer, idx) => {
                  const isCurrentUser = signer.user?.id === currentUser?.id;
                  const isLastInList = idx === signers.length - 1;

                  return (
                    <div
                      key={signer.userId}
                      className={`flex items-center gap-3 p-2 ${!isLastInList ? 'border-b border-gray-100' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${signer.hasSigned
                        ? 'bg-green-500'
                        : isActive
                          ? 'bg-yellow-500'
                          : 'bg-gray-300'
                        }`} />

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm ${isCurrentUser ? 'font-semibold text-blue-700' : 'text-gray-700'
                            }`}>
                            {signer.user?.username || 'Unknown User'}
                            {isCurrentUser && ' (You)'}
                          </p>
                          {signer.hasSigned && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              Signed
                            </span>
                          )}
                          {!signer.hasSigned && isActive && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                              Pending
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {signer.user?.email || ''}
                        </p>
                      </div>

                      {isCurrentUser && !signer.hasSigned && isActive && (
                        <div className="shrink-0">
                          <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${isCurrentUserTurn
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                            : 'bg-gray-100 text-gray-700'
                            }`}>
                            {isCurrentUserTurn ? 'Your Turn Now' : 'Waiting in Step'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Status */}
      {currentUserSteps.length > 0 && (
        <div className={`mt-4 p-3 rounded-lg border ${isCurrentUserTurn
          ? 'border-blue-300 bg-blue-50'
          : 'border-gray-300 bg-gray-50'
          }`}>
          <div className="flex items-start gap-2">
            {isCurrentUserTurn ? (
              <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            ) : (
              <Clock className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-sm font-medium ${isCurrentUserTurn ? 'text-blue-800' : 'text-gray-700'
                }`}>
                {isCurrentUserTurn
                  ? "It's your turn to sign the document!"
                  : "Waiting for your turn to sign."}
              </p>

              {isCurrentUserTurn && (
                <p className="text-xs text-blue-700 mt-1">
                  You are in Step {currentUserSteps[0].step}.
                  {currentActiveStep && stepsMap.get(currentActiveStep[0])?.length! > 1 &&
                    " You can sign in parallel with other signers in this step."}
                </p>
              )}

              {!isCurrentUserTurn && currentActiveStep && (
                <p className="text-xs text-gray-600 mt-1">
                  Currently at Step {currentActiveStep[0]}. {currentActiveStep[1].length > 1
                    ? `${currentActiveStep[1].filter(s => !s.hasSigned).length} of ${currentActiveStep[1].length} signers remaining in this step.`
                    : `${currentActiveStep[1][0]?.user?.username || 'Someone'} needs to sign first.`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import api from '@/api/axiosInstance';
import toast from 'react-hot-toast';
import { useAuth } from '@/auth/useAuth';
import UserPdfSigner from '@/user/UserPdfSigner';
import axios from 'axios';

const UploadManager: React.FC = () => {

  const [verifyDocument, setVerifyDocument] = useState<PDFDocument | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);

  const [signingOrderDialogOpen, setSigningOrderDialogOpen] = useState(false);
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<PDFDocument | null>(null);

  // Upload form state
  const [toUploadFile, setToUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // PDF Viewer state
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isPdfLoading, setIsPdfLoading] = useState<boolean>(false);

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedDocumentForShare, setSelectedDocumentForShare] = useState<PDFDocument | null>(null);
  const [selectedUsersForShare, setSelectedUsersForShare] = useState<string[]>([]);
  const [shareMessage, setShareMessage] = useState('');
  const [isShareDownloadable, setIsShareDownloadable] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSearchQuery, setShareSearchQuery] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'view_and_sign'>('view');
  const [availableUsers, setAvailableUsers] = useState<UserType[]>([]);
  const [filteredShareUsers, setFilteredShareUsers] = useState<UserType[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [signerSteps, setSignerSteps] = useState<SignerStep[]>([]);
  const [parallelGroups, setParallelGroups] = useState<Map<number, Set<string>>>(new Map());

  // Separate selected users for view and sign
  const [selectedViewUsers, setSelectedViewUsers] = useState<string[]>([]);
  const [selectedSignUsers, setSelectedSignUsers] = useState<string[]>([]);

  // Sign dialog state
  const [signDocument, setSignDocument] = useState<PDFDocument | null>(null);
  const [signDialogOpen, setSignDialogOpen] = useState(false);

  // Shared users modal state
  const [sharedUsersDialogOpen, setSharedUsersDialogOpen] = useState(false);
  const [selectedDocumentForSharedUsers, setSelectedDocumentForSharedUsers] = useState<PDFDocument | null>(null);

  // Unshare modal state
  const [unshareDialogOpen, setUnshareDialogOpen] = useState(false);
  const [selectedDocumentForUnshare, setSelectedDocumentForUnshare] = useState<PDFDocument | null>(null);
  const [selectedUsersForUnshare, setSelectedUsersForUnshare] = useState<string[]>([]);
  const [isUnsharing, setIsUnsharing] = useState(false);

  // Selection state
  const [selectedItems, setSelectedItems] = useState<string[]>([]);


  // Pagination
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    offset: 0,
  });


  const [updateFlowDialogOpen, setUpdateFlowDialogOpen] = useState(false);
  const [selectedDocumentForUpdateFlow, setSelectedDocumentForUpdateFlow] = useState<PDFDocument | null>(null)

  const [sharedWithDialogOpen, setSharedWithDialogOpen] = useState(false);

  const { user } = useAuth();

  // Drag and drop openUpdateFlowDialog
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Debounced search query for users
  const [debouncedShareSearchQuery, setDebouncedShareSearchQuery] = useState('');

  const navigate = useNavigate();


  // Debounce effect for user search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedShareSearchQuery(shareSearchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [shareSearchQuery]);

  // Load users when debounced search query changes
  useEffect(() => {
    if (debouncedShareSearchQuery.trim().length >= 2) {
      handleShareSearch(debouncedShareSearchQuery);
    } else {
      // When search query is empty, show selected users if any
      const selectedUserIds = [...selectedViewUsers, ...selectedSignUsers];
      if (selectedUserIds.length > 0) {
        // Get selected users from availableUsers
        const selectedUsersFromAvailable = availableUsers.filter(user =>
          selectedUserIds.includes(user.id)
        );
        setFilteredShareUsers(selectedUsersFromAvailable);
      } else {
        setFilteredShareUsers([]);
      }
    }
  }, [debouncedShareSearchQuery]);

  // Load documents from API or storage
  useEffect(() => {
    loadDocuments();
  }, [pagination.currentPage, pagination.itemsPerPage]);

  // Debounced search effect for documents
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      loadDocuments();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadDocuments = async () => {
    try {
      if (!user?.id) {
        toast.error('Please log in first');
        return;
      }

      const params = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        offset: pagination.offset,
        user_id: user?.id,
        user_roles: user?.roles,
        search: searchQuery.trim() || undefined,
        include_signer_steps: true,
      };

      const response = await api.get("v1/documents/uploaded", { params });
      const data = response.data;

      // Transform the data based on new DTO structure
      const documentsWithSteps = data.data.map((doc: any) => ({
        ...doc,
        id: doc.id?.toString() || '',
        fileName: doc.fileName || '',
        filePath: doc.filePath || '',
        fileType: doc.fileType || '',
        fileSize: doc.fileSize?.toString() || '0',
        status: doc.status || 'UPLOADED',
        uploadedAt: doc.uploadedAt || new Date().toISOString(),
        ownerDetails: doc.ownerDetails ? {
          id: doc.ownerDetails.id?.toString() || '',
          username: doc.ownerDetails.username || '',
          email: doc.ownerDetails.email || ''
        } : undefined,
        // Map signerSteps from DTO
        signerSteps: (doc.signerSteps || []).map((step: any) => ({
          dsId: step.dsId ? {          // ← parse as object, not toString()
            documentId: Number(step.dsId.documentId ?? step.dsId),
            userId: Number(step.dsId.userId ?? step.userId ?? step.user?.id),
          } : undefined,
          step: step.step || 1,
          userId: step.userId?.toString() || step.user?.id?.toString() || '',
          user: step.user ? {
            id: step.user.id?.toString() || '',
            username: step.user.username || '',
            email: step.user.email || ''
          } : undefined,
          hasSigned: step.hasSigned || false,
          parallel: step.parallel || false,
          permission: step.permission || 'view_and_sign',
          decline: step.decline || false,
          proceedNext: step.proceedNext || false,
          downloadable: step.downloadable || false
        })),
        // Map sharedToUsers from signerSteps
        sharedToUsers: (doc.signerSteps || []).map((step: any) => ({
          dsId: step.dsId ? {
            documentId: Number(step.dsId.documentId ?? step.dsId),
            userId: Number(step.dsId.userId ?? step.userId ?? step.user?.id),
          } : undefined,
          id: step.userId?.toString() || step.user?.id?.toString() || '',
          username: step.user?.username || '',
          email: step.user?.email || '',
          permission: step.permission || 'view_and_sign',
          step: step.step || 1,
          hasSigned: step.hasSigned || false,
          decline: step.decline || false,
          proceedNext: step.proceedNext || false,
          downloadable: step.downloadable || false
        })),
        availableForSigning: doc.availableForSigning || false,
        availableForViewing: doc.availableForViewing || true,
        downloadable: doc.downloadable || false,
      }));

      setDocuments(documentsWithSteps);
      setPagination(prev => ({
        ...prev,
        totalItems: data.pagination?.totalItems || data.totalItems || 0,
        totalPages: data.pagination?.totalPages || data.totalPages || 1,
      }));
    } catch (error) {
      toast.error(`Error fetching: ${error}`);
    }
  };

  // Filter users based on search query for share dialog
  useEffect(() => {
    if (shareSearchQuery.trim() === '') {
      // Show selected users when no search query
      const selectedUserIds = [...selectedViewUsers, ...selectedSignUsers];
      if (selectedUserIds.length > 0) {
        const selectedUsersFromAvailable = availableUsers.filter(user =>
          selectedUserIds.includes(user.id)
        );
        setFilteredShareUsers(selectedUsersFromAvailable);
      } else {
        setFilteredShareUsers([]);
      }
      return;
    }

    const query = shareSearchQuery.toLowerCase();
    const filtered = availableUsers.filter(user => {
      const usernameMatch = user.username.toLowerCase().includes(query);
      const emailMatch = user.email.toLowerCase().includes(query);

      let roleMatch = false;
      if (user.roles && Array.isArray(user.roles)) {
        roleMatch = user.roles.some(role => {
          if (typeof role === 'string') {
            return role.toLowerCase().includes(query);
          } else if (role && typeof role === 'object' && 'name' in role) {
            return role.name.toLowerCase().includes(query);
          }
          return false;
        });
      }

      return usernameMatch || emailMatch || roleMatch;
    });

    // Also include selected users even if they don't match the search
    const selectedUserIds = [...selectedViewUsers, ...selectedSignUsers];
    const selectedUsers = availableUsers.filter(user =>
      selectedUserIds.includes(user.id) && !filtered.some(f => f.id === user.id)
    );

    setFilteredShareUsers([...filtered, ...selectedUsers]);
  }, [shareSearchQuery, availableUsers, selectedViewUsers, selectedSignUsers]);





  // Update signer steps when users are selected/deselected
  useEffect(() => {
    // Combine selected users from both sections
    const allSelectedUsers = [...selectedViewUsers, ...selectedSignUsers];
    setSelectedUsersForShare(allSelectedUsers);

    // Only update signerSteps if we're in view_and_sign mode
    if (sharePermission === 'view_and_sign') {
      const existingStepsMap = new Map(signerSteps.map(step => [step.userId, step]));

      const newSteps: SignerStep[] = [];

      // IMPORTANT: Use selectedSignUsers to build steps
      selectedSignUsers.forEach((userId, index) => {
        const existingStep = existingStepsMap.get(userId);
        const userData = availableUsers.find(u => u.id === userId);

        if (existingStep) {
          newSteps.push({
            ...existingStep,
            user: userData || existingStep.user
          });
        } else {
          newSteps.push({
            step: index + 1,
            userId,
            user: userData,
            hasSigned: false,
            parallel: false,
            permission: 'view_and_sign'
          });
        }
      });

      // Apply parallel groups
      parallelGroups.forEach((userIds) => {
        const allSelected = Array.from(userIds).every(userId =>
          selectedSignUsers.includes(userId)
        );

        if (allSelected && userIds.size > 1) {
          newSteps.forEach(step => {
            if (userIds.has(step.userId)) {
              step.parallel = true;
            }
          });
        }
      });

      // Renumber steps
      const finalSteps = renumberStepsWithParallel(newSteps);

      // Create new parallel groups
      const newParallelGroups = new Map<number, Set<string>>();
      finalSteps.forEach(step => {
        if (step.parallel) {
          if (!newParallelGroups.has(step.step)) {
            newParallelGroups.set(step.step, new Set());
          }
          newParallelGroups.get(step.step)!.add(step.userId);
        }
      });

      // Only update if changed
      if (JSON.stringify(finalSteps) !== JSON.stringify(signerSteps)) {
        setSignerSteps(finalSteps);
        setParallelGroups(newParallelGroups);
      }
    } else {
      // Clear signerSteps if not in view_and_sign mode
      if (signerSteps.length > 0) {
        setSignerSteps([]);
        setParallelGroups(new Map());
      }
    }
  }, [selectedViewUsers, selectedSignUsers, sharePermission, availableUsers]);



  // Search for users with debouncing
  const handleShareSearch = async (query: string) => {
    if (query.trim().length < 2) {
      // Show selected users when search query is too short
      const selectedUserIds = [...selectedViewUsers, ...selectedSignUsers];
      if (selectedUserIds.length > 0) {
        const selectedUsersFromAvailable = availableUsers.filter(user =>
          selectedUserIds.includes(user.id)
        );
        setFilteredShareUsers(selectedUsersFromAvailable);
      } else {
        setFilteredShareUsers([]);
      }
      return;
    }

    setIsLoadingUsers(true);
    try {
      const response = await api.get("v1/users/search", {
        params: {
          query: query.trim(),
          excludeCurrent: true,
          currentUserId: user?.id,
          documentId: selectedDocumentForShare?.id,
          limit: 20
        }
      });

      let allUsers: UserType[] = [];

      if (Array.isArray(response.data)) {
        allUsers = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        allUsers = response.data.data;
      } else if (response.data.users && Array.isArray(response.data.users)) {
        allUsers = response.data.users;
      } else {
        console.error('Unexpected API response structure:', response.data);
        toast.error('Unexpected response format from server');
        return;
      }

      const transformedUsers = allUsers.map(user => ({
        id: user.id?.toString() || '',
        username: user.username || '',
        email: user.email || '',
        roles: user.roles?.map((role: any) => role.name || role) || []
      }));

      setAvailableUsers(prev => {
        // Merge with existing users, avoiding duplicates
        const merged = [...prev];
        transformedUsers.forEach(newUser => {
          if (!merged.some(u => u.id === newUser.id)) {
            merged.push(newUser);
          }
        });
        return merged;
      });

      // Include selected users even if they don't match the search
      const selectedUserIds = [...selectedViewUsers, ...selectedSignUsers];
      const selectedUsers = availableUsers.filter(user =>
        selectedUserIds.includes(user.id) && !transformedUsers.some(f => f.id === user.id)
      );

      setFilteredShareUsers([...transformedUsers, ...selectedUsers]);
    } catch (error) {
      toast.error('Failed to search users');
      console.error('Error searching users:', error);
    } finally {
      setIsLoadingUsers(false);
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
        toast.error("No user id found");
        return;
      }

      const formData = new FormData();
      formData.append("file", toUploadFile);

      const response = await api.post(`v1/documents/upload/${user.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      const data = response.data;

      // Transform the uploaded document to match our interface
      const uploadedDoc: PDFDocument = {
        id: data.id?.toString() || '',
        fileName: data.fileName || toUploadFile.name,
        filePath: data.filePath || '',
        fileType: data.fileType || 'application/pdf',
        fileSize: data.fileSize?.toString() || toUploadFile.size.toString(),
        status: data.status || 'UPLOADED',
        uploadedAt: data.uploadedAt || new Date().toISOString(),
        ownerDetails: data.ownerDetails ? {
          id: data.ownerDetails.id?.toString() || user.id.toString(),
          username: data.ownerDetails.username || user.username || '',
          email: data.ownerDetails.email || user.email || ''
        } : undefined,
        signerSteps: [],
        sharedToUsers: [],
        availableForSigning: data.availableForSigning || false,
        availableForViewing: data.availableForViewing || true,
        comment: ''
      };

      toast.success(`${toUploadFile.name} has been uploaded`);
      setDocuments([uploadedDoc, ...documents]);
      setUploadDialogOpen(false);
      resetUploadForm();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;

        if (status === 409 && data?.error === "DUPLICATE_FILE") {
          toast.error("This file already exists");
        } else {
          toast.error(data?.message || "Upload failed");
        }
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDocument) return;

    try {
      // permanent delete
      await api.delete(`v1/documents/${selectedDocument.id}`, {
        params: { userId: user?.id }
      });
      setDocuments(documents.filter(doc => doc.id !== selectedDocument.id));
      setDeleteDialogOpen(false);
      setSelectedDocument(null);
      toast.success(`${selectedDocument.fileName} has been deleted`);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const resetUploadForm = () => {
    setToUploadFile(null);
  };

  const openDeleteDialog = (document: PDFDocument) => {
    setSelectedDocument(document);
    setDeleteDialogOpen(true);
  };

  /*const openShareDialog = async (doc: PDFDocument) => {
    setSelectedDocumentForShare(doc);
    setSelectedUsersForShare([]);
    setSelectedViewUsers([]);
    setSelectedSignUsers([]);
    setShareMessage('');
    setSharePermission('view');
    setIsShareDownloadable(true);
    setShareSearchQuery('');
    setDebouncedShareSearchQuery('');
    setSignerSteps([]);
    setParallelGroups(new Map());

    // Don't load all users immediately
    setAvailableUsers([]);
    setFilteredShareUsers([]);

    setShareDialogOpen(true);
  };*/


  /*const openShareDialog = async (doc: PDFDocument) => {
    setSelectedDocumentForShare(doc);
    setSelectedUsersForShare([]);
    setSelectedViewUsers([]);
    setSelectedSignUsers([]);
    setShareMessage('');
    setSharePermission('view');
    setIsShareDownloadable(true);
    setShareSearchQuery('');
    setDebouncedShareSearchQuery('');
    setSignerSteps([]);
    setParallelGroups(new Map());
  
    // 🔥 NEW: Check for initial signers and set them automatically
    // Safely get initialSignerSteps, ensuring it's an array
    let initialSigners: InitialSignerStep[] = [];
    
    if (doc.initialSignerSteps && Array.isArray(doc.initialSignerSteps)) {
      initialSigners = doc.initialSignerSteps;
    } else if (doc.preConfiguredSigners && Array.isArray(doc.preConfiguredSigners)) {
      initialSigners = doc.preConfiguredSigners;
    }
    
    if (initialSigners.length > 0) {
      //console.log('Found initial signers:', initialSigners);
      
      try {
        // Transform initial signers into user objects and signer steps
        const transformedUsers: UserType[] = [];
        const preconfiguredSteps: SignerStep[] = [];
  
        initialSigners.forEach((signer: InitialSignerStep) => {
          // Get user data from the signer object
          const userData = {
            id: signer.userId?.toString() || signer.user?.id?.toString() || '',
            username: signer.user?.username || 'Unknown User',
            email: signer.user?.email || '',
            //roles: signer.user?.roles?.map((role: any) => role.name || role) || []
          };
  
          // Add to transformed users if not already present
          if (userData.id && !transformedUsers.some(u => u.id === userData.id)) {
            transformedUsers.push(userData);
          }
  
          // Create signer step
          if (userData.id) {
            preconfiguredSteps.push({
              step: signer.step || 1,
              userId: userData.id,
              user: userData,
              hasSigned: signer.hasSigned || false,
              signedAt: signer.signedAt,
              parallel: signer.parallel || false,
              permission: signer.permission || 'view_and_sign',
              decline: signer.decline || false,
              proceedNext: signer.proceedNext || false
            });
          }
        });
  
        //console.log('Transformed users:', transformedUsers);
        //console.log('Preconfigured steps:', preconfiguredSteps);
  
        // Set available users
        if (transformedUsers.length > 0) {
          setAvailableUsers(transformedUsers);
          setFilteredShareUsers(transformedUsers);
        }
  
        // Set signer steps
        if (preconfiguredSteps.length > 0) {
          setSignerSteps(preconfiguredSteps);
          
          // Set selected sign users (all users from preconfigured steps)
          const signUserIds = preconfiguredSteps
            .map(step => step.userId)
            .filter((id): id is string => !!id);
          
          setSelectedSignUsers(signUserIds);
          
          // Switch to view_and_sign tab
          setSharePermission('view_and_sign');
          
          // Build parallel groups
          const newParallelGroups = new Map<number, Set<string>>();
          preconfiguredSteps.forEach(step => {
            if (step.parallel) {
              if (!newParallelGroups.has(step.step)) {
                newParallelGroups.set(step.step, new Set());
              }
              newParallelGroups.get(step.step)!.add(step.userId);
            }
          });
          setParallelGroups(newParallelGroups);
          
          toast.success(`Initial signers loaded (${signUserIds.length} signers)`);
        }
        
      } catch (error) {
        console.error('Error loading initial signers:', error);
        toast.error('Failed to load initial signers');
      }
    } else {
      console.log('No initial signers found in document');
      // No initial signers, reset state
      setAvailableUsers([]);
      setFilteredShareUsers([]);
    }
  
    setShareDialogOpen(true);
    };*/



  const openShareDialog = async (doc: PDFDocument) => {
    setSelectedDocumentForShare(doc);
    setSelectedUsersForShare([]);
    setSelectedViewUsers([]);
    setSelectedSignUsers([]);
    setShareMessage('');
    setSharePermission('view');
    setIsShareDownloadable(true);
    setShareSearchQuery('');
    setDebouncedShareSearchQuery('');
    setSignerSteps([]);
    setParallelGroups(new Map());

    // 🔥 NEW: Check for initial signers and set them automatically
    // Safely get initialSignerSteps, ensuring it's an array
    let initialSigners: InitialSignerStep[] = [];

    if (doc.initialSignerSteps && Array.isArray(doc.initialSignerSteps)) {
      initialSigners = doc.initialSignerSteps;
    } else if (doc.preConfiguredSigners && Array.isArray(doc.preConfiguredSigners)) {
      initialSigners = doc.preConfiguredSigners;
    }

    // Store the fact that we have pre-configured signers to lock the UI
    //const hasPreConfiguredSigners = initialSigners.length > 0;

    if (initialSigners.length > 0) {
      console.log('Found initial signers:', initialSigners);

      try {
        // Transform initial signers into user objects and signer steps
        const transformedUsers: UserType[] = [];
        const preconfiguredSteps: SignerStep[] = [];

        initialSigners.forEach((signer: InitialSignerStep) => {
          // Get user data from the signer object
          const userData = {
            id: signer.userId?.toString() || signer.user?.id?.toString() || '',
            username: signer.user?.username || 'Unknown User',
            email: signer.user?.email || '',
          };

          // Add to transformed users if not already present
          if (userData.id && !transformedUsers.some(u => u.id === userData.id)) {
            transformedUsers.push(userData);
          }

          // Create signer step
          if (userData.id) {
            preconfiguredSteps.push({
              step: signer.step || 1,
              userId: userData.id,
              user: userData,
              hasSigned: signer.hasSigned || false,
              signedAt: signer.signedAt,
              parallel: signer.parallel || false,
              permission: signer.permission || 'view_and_sign',
              decline: signer.decline || false,
              proceedNext: signer.proceedNext || false,
              signaturePreference: signer.signaturePreference
            });
          }
        });

        console.log('Transformed users:', transformedUsers);
        console.log('Preconfigured steps:', preconfiguredSteps);

        // Set available users
        if (transformedUsers.length > 0) {
          setAvailableUsers(transformedUsers);
          setFilteredShareUsers(transformedUsers);
        }

        // Set signer steps
        if (preconfiguredSteps.length > 0) {
          setSignerSteps(preconfiguredSteps);

          // Set selected sign users (all users from preconfigured steps)
          const signUserIds = preconfiguredSteps
            .map(step => step.userId)
            .filter((id): id is string => !!id);

          setSelectedSignUsers(signUserIds);

          // Switch to view_and_sign tab
          setSharePermission('view_and_sign');

          // Build parallel groups
          const newParallelGroups = new Map<number, Set<string>>();
          preconfiguredSteps.forEach(step => {
            if (step.parallel) {
              if (!newParallelGroups.has(step.step)) {
                newParallelGroups.set(step.step, new Set());
              }
              newParallelGroups.get(step.step)!.add(step.userId);
            }
          });
          setParallelGroups(newParallelGroups);

          toast.success(`Initial signers loaded (${signUserIds.length} signers)`);
        }

      } catch (error) {
        console.error('Error loading initial signers:', error);
        toast.error('Failed to load initial signers');
      }
    } else {
      console.log('No initial signers found in document');
      // No initial signers, reset state
      setAvailableUsers([]);
      setFilteredShareUsers([]);
    }

    setShareDialogOpen(true);
  };


  const openSignDialog = (doc: PDFDocument) => {
    /*if (doc.signerSteps && doc.signerSteps.length > 0) {
      const userSteps = doc.signerSteps.filter(step => step.user?.id === user?.id);
      const activeStep = doc.signerSteps.find(step => !step.hasSigned)?.step;

      if (userSteps.length > 0) {
        const userStepNumber = userSteps[0].step;
        const isUserSigned = userSteps.every(step => step.hasSigned);

        if (!isUserSigned && activeStep !== userStepNumber) {
          const stepsBeforeUser = doc.signerSteps
            .filter(step => step.step < userStepNumber && !step.hasSigned);

          if (stepsBeforeUser.length > 0) {
            const stepGroups = new Map<number, SignerStep[]>();
            doc.signerSteps.forEach(step => {
              if (!stepGroups.has(step.step)) stepGroups.set(step.step, []);
              stepGroups.get(step.step)!.push(step);
            });

            const firstPendingStep = stepsBeforeUser[0].step;
            const pendingSigners = stepGroups.get(firstPendingStep) || [];
            const pendingNames = pendingSigners
              .filter(s => !s.hasSigned)
              .map(s => s.user?.username)
              .filter(Boolean)
              .join(', ');

            toast.error(
              `It's not your turn yet. ${pendingNames || 'Other signers'} need to sign Step ${firstPendingStep} first.`
            );
            return;
          }
        }
      }*/

    navigate('/sign', { state: { document: doc, origin: "/my-documents" } });
  };


  const openSharedUsersDialog = (doc: PDFDocument) => {
    setSelectedDocumentForSharedUsers(doc);
    setSharedUsersDialogOpen(true);
  };

  const openUnshareDialog = (doc: PDFDocument) => {
    setSelectedDocumentForUnshare(doc);
    setSelectedUsersForUnshare([]);
    setUnshareDialogOpen(true);
  };

  const openUpdateFlowDialog = (doc: PDFDocument) => {
    setSelectedDocumentForUpdateFlow(doc);
    setUpdateFlowDialogOpen(true);
  }


  const handleShare = async () => {
    if (!selectedDocumentForShare || selectedUsersForShare.length === 0) return;

    // Prepare view users
    const viewUsers = selectedViewUsers.map(userId => ({
      userId,
      permission: 'view' as const
    }));

    // Prepare sign users with steps - make sure we use signerSteps
    const signUsers = signerSteps.map(step => ({
      userId: step.userId,
      step: step.step,
      parallel: step.parallel || false,
      permission: 'view_and_sign' as const,
      signaturePreference: step.signaturePreference || ''
    }));

    // Combine all users
    const allUsers = [...viewUsers, ...signUsers];

    // Debug log to check what's being sent
    console.log('Sharing users:', {
      viewUsers,
      signUsers,
      signerSteps,
      selectedSignUsers,
      allUsers
    });

    setIsSharing(true);
    try {
      const response = await api.post('v2/documents/share', {
        documentId: selectedDocumentForShare.id,
        users: allUsers, // Changed from user_ids to users array with permission
        message: shareMessage,
        downloadable: isShareDownloadable
      });

      toast.success(`Document shared with ${selectedUsersForShare.length} user(s)`);

      // Update local state with the response data
      const sharedDoc = response.data;

      // Get existing shared users from the current document
      const existingSharedUsers = selectedDocumentForShare.sharedToUsers || [];

      // Transform the response to match our interface
      const updatedDoc: PDFDocument = {
        ...selectedDocumentForShare,
        status: 'SHARED',
        signerSteps: (sharedDoc.signerSteps || []).map((step: any) => ({
          step: step.step || 1,
          userId: step.userId?.toString() || step.user?.id?.toString() || '',
          user: step.user ? {
            id: step.user.id?.toString() || '',
            username: step.user.username || '',
            email: step.user.email || ''
          } : undefined,
          hasSigned: step.hasSigned || false,
          parallel: step.parallel || false,
          permission: step.permission || 'view_and_sign'
        })),
        // Combine existing shared users with newly shared users
        sharedToUsers: [
          // Keep existing users (filter out duplicates)
          ...existingSharedUsers.filter(existingUser =>
            !allUsers.some(newUser => newUser.userId === existingUser.id)
          ),
          // Add newly shared users
          ...allUsers.map(user => {
            const userData = availableUsers.find(u => u.id === user.userId);
            return {
              id: user.userId,
              username: userData?.username || '',
              email: userData?.email || '',
              permission: user.permission,
              step: user.permission === 'view_and_sign' ? (user as any).step : undefined,
              hasSigned: false
            };
          })
        ],
        availableForSigning: sharedDoc.availableForSigning || false,
        availableForViewing: sharedDoc.availableForViewing || true
      };

      setDocuments(prev =>
        prev.map(doc =>
          doc.id === selectedDocumentForShare.id ? updatedDoc : doc
        )
      );

      setShareDialogOpen(false);
      setSelectedUsersForShare([]);
      setSelectedViewUsers([]);
      setSelectedSignUsers([]);
      setShareMessage('');
      setSharePermission('view');
      setIsShareDownloadable(true);
      setShareSearchQuery('');
      setDebouncedShareSearchQuery('');
      setSignerSteps([]);
      setParallelGroups(new Map());

    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share document.');
    } finally {
      setIsSharing(false);
    }
  };

  const canUserSignDocument = (doc: PDFDocument): boolean => {

    // 4. If current user is the owner and there are no shared users, cannot sign true
    //console.log(doc.status)
    if (!doc.availableForSigning || (doc.status === 'SHARED' || doc.status === 'SIGNED_AND_SHARED')) {
      return false;
    } else {
      return true;
    }
  };


  const getSignButtonTitle = (doc: PDFDocument): string => {

    // Check if user is owner and document is shared
    if (!doc.availableForSigning || (doc.status === 'SHARED' || doc.status === 'SIGNED_AND_SHARED')) {
      return "Owner cannot sign a shared document";
    } else {
      return "Sign document";
    }


  };

  const handleUnshare = async () => {
    if (!selectedDocumentForUnshare || selectedUsersForUnshare.length === 0) return;

    setIsUnsharing(true);
    try {
      await api.post('v2/documents/unshare', {
        documentId: Number(selectedDocumentForUnshare.id),
        userIds: selectedUsersForUnshare.map(Number),
        currentUserId: user?.id
      });

      toast.success(`Access removed for ${selectedUsersForUnshare.length} user(s)`);

      // Update local state
      setDocuments(prev =>
        prev.map(doc => {
          if (doc.id === selectedDocumentForUnshare.id) {
            const updatedSharedToUsers = (doc.sharedToUsers || []).filter(
              sharedUser => !selectedUsersForUnshare.includes(sharedUser.id)
            );

            const updatedSignerSteps = (doc.signerSteps || []).filter(
              step => !selectedUsersForUnshare.includes(step.userId)
            );

            // Check if all users have been unshared
            const hasNoSharedUsers = updatedSharedToUsers.length === 0;

            return {
              ...doc,
              sharedToUsers: updatedSharedToUsers,
              signerSteps: updatedSignerSteps,
              status: hasNoSharedUsers ? 'UPLOADED' : doc.status,
              // If no shared users left, document should not be available for signing
              availableForSigning: hasNoSharedUsers ? false : doc.availableForSigning
            };
          }
          return doc;
        })
      );

      // Optionally refresh from server
      loadDocuments();

      setUnshareDialogOpen(false);
      setSelectedUsersForUnshare([]);
      setSelectedDocumentForUnshare(null);

    } catch (error) {
      console.error('Error unsharing:', error);
      toast.error('Failed to remove access. Please try again.');
    } finally {
      setIsUnsharing(false);
    }
  };

  const toggleUserForUnshareSelection = (userId: string) => {
    setSelectedUsersForUnshare(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsersForUnshare = () => {
    if (!selectedDocumentForUnshare?.sharedToUsers) return;

    if (selectedUsersForUnshare.length === selectedDocumentForUnshare.sharedToUsers.length) {
      setSelectedUsersForUnshare([]);
    } else {
      setSelectedUsersForUnshare(selectedDocumentForUnshare.sharedToUsers.map(user => user.id));
    }
  };

  // Toggle user selection for view only
  const toggleViewUserSelection = (userId: string) => {
    // Don't allow selection if user is already in sign users
    if (selectedSignUsers.includes(userId)) {
      toast.error('This user is already selected for View & Sign access');
      return;
    }

    setSelectedViewUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Toggle user selection for view and sign
  const toggleSignUserSelection = (userId: string) => {
    // Don't allow selection if user is already in view users
    if (selectedViewUsers.includes(userId)) {
      toast.error('This user is already selected for View Only access');
      return;
    }

    setSelectedSignUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Select all users in view section
  const selectAllViewUsers = () => {
    if (selectedViewUsers.length === filteredShareUsers.filter(u => !selectedSignUsers.includes(u.id)).length) {
      setSelectedViewUsers([]);
    } else {
      // Only select users not in sign users
      const availableUsers = filteredShareUsers
        .filter(user => !selectedSignUsers.includes(user.id))
        .map(user => user.id);
      setSelectedViewUsers(availableUsers);
    }
  };

  // Select all users in sign section
  const selectAllSignUsers = () => {
    if (selectedSignUsers.length === filteredShareUsers.filter(u => !selectedViewUsers.includes(u.id)).length) {
      setSelectedSignUsers([]);
    } else {
      // Only select users not in view users
      const availableUsers = filteredShareUsers
        .filter(user => !selectedViewUsers.includes(user.id))
        .map(user => user.id);
      setSelectedSignUsers(availableUsers);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = signerSteps.findIndex((step) => step.userId === active.id);
    const newIndex = signerSteps.findIndex((step) => step.userId === over.id);

    const reorderedSteps = arrayMove(signerSteps, oldIndex, newIndex);
    const finalSteps = renumberStepsWithParallel(reorderedSteps);
    setSignerSteps(finalSteps);
  };

  const renumberStepsWithParallel = (steps: SignerStep[]): SignerStep[] => {
    const newSteps = [...steps];
    let currentStep = 1;
    let i = 0;

    while (i < newSteps.length) {
      const currentSigner = newSteps[i];
      const parallel = currentSigner.parallel;

      if (parallel) {
        const parallelGroup: SignerStep[] = [currentSigner];
        let j = i + 1;

        while (j < newSteps.length && newSteps[j].parallel) {
          parallelGroup.push(newSteps[j]);
          j++;
        }

        parallelGroup.forEach(signer => {
          signer.step = currentStep;
        });

        i = j;
        currentStep++;
      } else {
        currentSigner.step = currentStep;
        i++;
        currentStep++;
      }
    }

    return newSteps;
  };

  const moveSignerUp = (index: number) => {
    if (index === 0) return;

    const newSteps = [...signerSteps];
    const temp = newSteps[index - 1];
    newSteps[index - 1] = newSteps[index];
    newSteps[index] = temp;

    const reorderedSteps = renumberStepsWithParallel(newSteps);
    setSignerSteps(reorderedSteps);
  };

  const moveSignerDown = (index: number) => {
    if (index === signerSteps.length - 1) return;

    const newSteps = [...signerSteps];
    const temp = newSteps[index + 1];
    newSteps[index + 1] = newSteps[index];
    newSteps[index] = temp;

    const reorderedSteps = renumberStepsWithParallel(newSteps);
    setSignerSteps(reorderedSteps);
  };

  const toggleParallelSigning = (userId: string) => {
    const updatedSteps = [...signerSteps];
    const index = updatedSteps.findIndex(step => step.userId === userId);

    if (index !== -1) {
      updatedSteps[index].parallel = !updatedSteps[index].parallel;

      const finalSteps = renumberStepsWithParallel(updatedSteps);

      const newParallelGroups = new Map<number, Set<string>>();
      finalSteps.forEach(step => {
        if (step.parallel) {
          if (!newParallelGroups.has(step.step)) {
            newParallelGroups.set(step.step, new Set());
          }
          newParallelGroups.get(step.step)!.add(step.userId);
        }
      });

      setSignerSteps(finalSteps);
      setParallelGroups(newParallelGroups);
    }
  };

  const getParallelGroup = (stepNumber: number): SignerStep[] => {
    return signerSteps.filter(step =>
      step.step === stepNumber && step.parallel
    );
  };

  const filteredDocuments = documents;

  const totalPages = pagination.totalPages;
  const paginatedDocuments = documents;

  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    setSelectedItems([]);
  }, [searchQuery]);

  const handleSharedWith = (doc: PDFDocument) => {
    setSharedWithDialogOpen(true)
    setSelectedDocumentForSharedUsers(doc);
  }

  const handleView = async (doc: PDFDocument | null) => {
    setSelectedDocument(doc);
    try {
      setIsPdfLoading(true);
      const response = await api.get("v1/documents/view/" + doc?.filePath, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      setPdfUrl(url);
      setPageNumber(1);
      setScale(1.0);
      setPdfViewerOpen(true);
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Failed to load PDF document');
    } finally {
      setIsPdfLoading(false);
    }
  }

  const handleDownload = async (doc: PDFDocument) => {
    try {
      const response = await api.get(`v1/documents/download/${doc.id}`, { responseType: 'blob' });

      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName;
      link.click();

      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded: ${doc.fileName}`);
    } catch {
      toast.error(`Download failed: ${doc.fileName}`);
    }
  };

  const formatFileSize = (fileSize: string) => {
    const bytes = Number(fileSize);
    if (isNaN(bytes) || bytes < 0) return "—";
    if (bytes === 0) return "0 B";

    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
  }


  const getStatusBadge = (doc: PDFDocument, totalSigners: number) => {
    const signerSteps = doc.signerSteps?.filter(step => step.permission === 'view_and_sign') || [];

    // If there are no signers (only view-only users), show "Shared - View Only"
    if (totalSigners === 0 && doc.sharedToUsers && doc.sharedToUsers.length > 0) {
      const viewOnlyCount = doc.sharedToUsers.filter(user => user.permission === 'view').length;
      return (
        <div className="flex flex-col gap-1">
          <span className="px-2 py-1 text-xs text-center font-medium text-blue-600 bg-blue-50 rounded">
            Shared
          </span>
          <span className="text-xs text-blue-500">
            {viewOnlyCount} view-only user{viewOnlyCount !== 1 ? 's' : ''}
          </span>
        </div>
      );
    }

    if (totalSigners > 0) {
      const signedCount = signerSteps.filter(s => s.hasSigned).length;
      const declinedCount = signerSteps.filter(s => s.decline && !s.proceedNext).length;
      const skippedCount = signerSteps.filter(s => s.decline && s.proceedNext).length;
      const pendingCount = totalSigners - signedCount - declinedCount - skippedCount;
      const isFullySigned = signedCount === totalSigners;

      // Build the sub-stat line
      const stats = [
        `${signedCount}/${totalSigners} signed`,
        declinedCount > 0 && `${declinedCount} declined`,
        skippedCount > 0 && `${skippedCount} skipped`,
        pendingCount > 0 && `${pendingCount} pending`,
      ].filter(Boolean).join(' · ');

      if (isFullySigned) {
        return (
          <div className="flex flex-col gap-1">
            <span className="px-2 py-1 text-xs text-center font-medium text-green-600 bg-green-50 rounded">
              Fully Signed
            </span>
            <span className="text-xs text-green-500">{stats}</span>
          </div>
        );
      }

      if (declinedCount > 0 && pendingCount === 0 && skippedCount === 0) {
        // All remaining signers have declined (none skipped yet)
        return (
          <div className="flex flex-col gap-1">
            <span className="px-2 py-1 text-xs text-center font-medium text-red-600 bg-red-50 rounded">
              Declined
            </span>
            <span className="text-xs text-red-500">{stats}</span>
          </div>
        );
      }

      // Find the current active step (first step with any unsigned, non-declined signers)
      const stepsMap = new Map<number, SignerStep[]>();
      signerSteps.forEach(step => {
        if (!stepsMap.has(step.step)) stepsMap.set(step.step, []);
        stepsMap.get(step.step)!.push(step);
      });

      const sortedSteps = Array.from(stepsMap.entries()).sort(([a], [b]) => a - b);
      const currentStep = sortedSteps.find(([_, signers]) =>
        signers.some(s => !s.hasSigned && !s.decline)
      );

      if (currentStep) {
        const [stepNumber, signers] = currentStep;
        const completedInStep = signers.filter(s => s.hasSigned).length;
        const totalInStep = signers.length;

        return (
          <div className="flex flex-col gap-1">
            <span className="px-2 py-1 text-xs text-center font-medium text-amber-600 bg-amber-50 rounded">
              Step {stepNumber} ({completedInStep}/{totalInStep})
            </span>
            <span className="text-xs text-amber-500">{stats}</span>
          </div>
        );
      }

      // Fallback: in progress
      return (
        <div className="flex flex-col gap-1">
          <span className="px-2 py-1 text-xs text-center font-medium text-amber-600 bg-amber-50 rounded">
            Awaiting Signatures
          </span>
          <span className="text-xs text-amber-500">{stats}</span>
        </div>
      );
    }

    // No signers — fall back to raw document status
    switch (doc.status) {
      case 'SIGNED':
        return (
          <div className="flex flex-col gap-1">
            <span className="px-2 py-1 text-xs text-center font-medium text-green-600 bg-green-50 rounded">
              Signed
            </span>
          </div>
        );
      case 'UPLOADED':
        return (
          <div className="flex flex-col gap-1">
            <span className="px-2 py-1 text-xs text-center font-medium text-purple-600 bg-purple-50 rounded">
              Uploaded
            </span>
          </div>
        );
      case 'SHARED':
        return (
          <div className="flex flex-col gap-1">
            <span className="px-2 py-1 text-xs text-center font-medium text-blue-600 bg-blue-50 rounded">
              Shared
            </span>
          </div>
        );
      default:
        return (
          <div className="flex flex-col gap-1">
            <span className="px-2 py-1 text-xs text-center font-medium text-gray-600 bg-gray-50 rounded">
              {doc.status || 'Unknown'}
            </span>
          </div>
        );
    }
  };


  const isDocumentShared = (doc: PDFDocument): boolean => {
    // A document is considered shared if it has sharedToUsers
    return !!(doc.sharedToUsers && doc.sharedToUsers.length > 0);
  };


  const toggleItemSelection = (id: string) => {
    const doc = documents.find(d => d.id === id);
    // Don't allow selection if document is shared
    if (doc && isDocumentShared(doc)) {
      toast.error("Cannot select shared documents for deletion");
      return;
    }

    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  const selectAllOnPage = () => {
    // Get only non-shared documents on current page
    const selectableDocs = paginatedDocuments.filter(doc => !isDocumentShared(doc));
    const selectableIds = selectableDocs.map(doc => doc.id);

    if (selectedItems.length === selectableIds.length && selectableIds.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(selectableIds);
    }
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

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
    setSharedWithDialogOpen(false)
    setSelectedDocumentForSharedUsers(null);
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setSelectedDocument(null);
  }

  // FIXED: handleDeleteMarked function with proper async handling
  const handleDeleteMarked = async () => {
    try {

      // Filter out any shared documents that might have been accidentally selected
      const documentsToDelete = selectedItems.filter(id => {
        const doc = documents.find(d => d.id === id);
        return doc && !isDocumentShared(doc);
      });

      if (documentsToDelete.length === 0) {
        toast.error("No selectable documents to delete");
        return;
      }

      if (documentsToDelete.length !== selectedItems.length) {
        toast.error(`${selectedItems.length - documentsToDelete.length} shared document(s) were excluded from deletion`);
      }

      // Use Promise.all for parallel deletion (faster)
      await Promise.all(selectedItems.map(selectedId =>
        api.delete(`v1/documents/${selectedId}`, {
          params: { userId: user?.id }
        })
      ));

      // Update state once after all deletions are complete
      setDocuments(documents.filter(doc => !selectedItems.includes(doc.id)));
      setDeleteDialogOpen(false);
      setSelectedItems([]);
      toast.success(`${selectedItems.length} document(s) have been deleted`);

    } catch (error) {
      console.error('Error deleting documents:', error);
      toast.error("Failed to delete one or more documents.");

      // Refresh documents to ensure UI is in sync
      loadDocuments();
    }
  };

  // Placeholder function for handleReleaseDocumentLock (if needed)
  const handleReleaseDocumentLock = async (doc: PDFDocument) => {
    // Implement if you have document locking functionality
    console.log('Releasing lock for document:', doc.id);
  };

  const handleVerify = (doc: PDFDocument) => {
    setVerifyDocument(doc);
    setVerifyDialogOpen(true);
  };


  const handleSkipThisSigner = async (dsId: DocumentSharedId) => {
    if (!dsId) {
      toast.error('Unable to skip signer: missing signer identifier.');
      return;
    }
    const payload: SkipRequest = {
      documentSharedId: dsId,
    };

    try {
      await api.patch('v2/skip', payload);
      toast.success('Signer skipped successfully.');
      loadDocuments(); // Refresh documents to reflect changes
      setSharedUsersDialogOpen(false);
      setSelectedDocumentForSharedUsers(null);

    } catch (error) {
      console.error('Error skipping signer:', error);
      toast.error('Failed to skip signer.');
    }

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
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 border border-[#A1C2BD]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-[#A1C2BD] rounded-lg shrink-0">
                  <Files className="w-5 h-5 sm:w-6 sm:h-6 text-[#19183B]" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-3xl font-bold text-[#19183B] truncate">My Documents</h1>
                  <p className="text-xs sm:text-sm text-[#708993]">Upload, manage, sign and share your PDF documents</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/*<button
                  onClick={() => setUploadDialogOpen(true)}
                  className="flex items-center gap-2 bg-[#19183B] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-sm sm:text-base font-semibold hover:bg-[#708993] transition-colors shadow-lg whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  Upload PDF
                </button>*/}
                <button
                  onClick={() => navigate('/uploadv2')}
                  className="flex items-center gap-2 bg-[#19183B] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-sm sm:text-base font-semibold hover:bg-[#708993] transition-colors shadow-lg whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  Upload PDF
                </button>
                <div className="flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                    {filteredDocuments.length} items
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Selection Bar */}
          {selectedItems.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-[#A1C2BD]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900">
                      {selectedItems.length} selected
                    </span>
                  </div>
                  <button
                    onClick={clearSelection}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Deselect all
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {/*<button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Download className="w-4 h-4" />
                </button>*/}
                  <button
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    onClick={handleDeleteMarked}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter Section */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 border border-[#A1C2BD]">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-[#708993]" />
                <input
                  type="text"
                  placeholder="Search by filename or shared user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-sm font-semibold text-[#19183B] whitespace-nowrap">Show:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    const newLimit = Number(e.target.value);
                    setItemsPerPage(newLimit);
                    setPagination(prev => ({
                      ...prev,
                      currentPage: 1,
                      itemsPerPage: newLimit
                    }));
                  }}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-[#A1C2BD] rounded-xl bg-white focus:ring-2 focus:ring-[#708993] outline-none transition-all cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

          {/* Documents Area */}
          <div className="bg-white rounded-xl shadow-sm border border-[#A1C2BD] overflow-hidden">
            <div className="p-4 sm:p-6">
              {paginatedDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-[#708993]">
                  <FileText className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-50" />
                  <p className="text-base sm:text-lg mb-2">
                    {searchQuery ? 'No documents found' : 'No documents yet'}
                  </p>
                  <p className="text-xs sm:text-sm text-center px-4">
                    {searchQuery
                      ? 'Try adjusting your search query'
                      : 'Click "Upload PDF" to add your first document'}
                  </p>
                </div>
              ) : (
                /* Responsive table wrapper with horizontal scroll on mobile */
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-[800px] md:min-w-full">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="w-12 px-3 sm:px-6 py-3 text-left">
                            <Checkbox.Root
                              checked={selectedItems.length === paginatedDocuments.length && paginatedDocuments.length > 0}
                              onCheckedChange={selectAllOnPage}
                              className="w-4 h-4 bg-white border border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                            >
                              <Checkbox.Indicator>
                                <Check className="w-3 h-3 text-white" />
                              </Checkbox.Indicator>
                            </Checkbox.Root>
                          </th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shared with</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedDocuments.map((doc) => {
                          const signerSteps = doc.signerSteps?.filter(step => step.permission === 'view_and_sign') || [];
                          const totalSigners = signerSteps.length;
                          //const completedSigners = signerSteps.filter(s => s.hasSigned).length;
                          //const hasParallelSigning = signerSteps.some(s => s.parallel);

                          //const viewOnlyUsers = doc.sharedToUsers?.filter(user => user.permission === 'view') || [];
                          //const totalViewOnly = viewOnlyUsers.length;
                          const totalSharedUsers = doc.sharedToUsers?.length || 0;

                          return (
                            <tr
                              key={doc.id}
                              className={`hover:bg-gray-50 ${selectedItems.includes(doc.id) ? 'bg-blue-50' : ''}`}
                            >

                              <td className="px-3 sm:px-6 py-4">
                                <Checkbox.Root
                                  checked={selectedItems.includes(doc.id)}
                                  onCheckedChange={() => toggleItemSelection(doc.id)}
                                  className="w-4 h-4 bg-white border border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                >
                                  <Checkbox.Indicator>
                                    <Check className="w-3 h-3 text-white" />
                                  </Checkbox.Indicator>
                                </Checkbox.Root>
                              </td>
                              { /* NAME Column*/}
                              <td className="px-3 sm:px-6 py-4 w-[35%] min-w-[200px] max-w-[400px]">
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded flex items-center justify-center bg-blue-50 flex-shrink-0">
                                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#779370]" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium text-gray-900 text-sm sm:text-base truncate max-w-[150px] sm:max-w-[200px] md:max-w-none">
                                      {doc.fileName}
                                    </div>
                                    <div className="text-xs text-gray-500 hidden sm:block">PDF document {formatFileSize(doc.fileSize)}, uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}</div>

                                    {/* Show sharing summary */}
                                    {/*(totalViewOnly > 0 || totalSigners > 0) && (
                                      <div className="hidden md:flex items-center gap-2 mt-1">
                                        <Users className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                        <div className="flex items-center gap-1 flex-wrap">
                                          <span className="text-xs text-gray-600">
                                            Shared with {totalSharedUsers} user{totalSharedUsers !== 1 ? 's' : ''}
                                            {totalViewOnly > 0 && totalSigners > 0 && (
                                              <span className="text-gray-600 ml-1">
                                                ({totalViewOnly} view only, {totalSigners} signers)
                                              </span>
                                            )}
                                            {totalViewOnly > 0 && totalSigners === 0 && (
                                              <span className="text-green-600 ml-1">
                                                ({totalViewOnly} view only)
                                              </span>
                                            )}
                                            {totalViewOnly === 0 && totalSigners > 0 && (
                                              <span className="text-purple-600 ml-1">
                                                ({totalSigners} signers)
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    )*/}

                                    {/* Show signing progress if there are signers */}
                                    {/*totalSigners > 0 && doc.availableForSigning && (
                                      <div className="hidden md:flex items-center gap-2 mt-1">
                                        <ListOrdered className="w-3 h-3 text-purple-500 flex-shrink-0" />
                                        <div className="flex items-center gap-1 flex-wrap">
                                          <span className="text-xs text-purple-600">
                                            {completedSigners}/{totalSigners} signed
                                          </span>
                                          {hasParallelSigning && (
                                            <span className="text-xs text-blue-600 flex items-center gap-0.5">
                                              <UsersIcon className="w-3 h-3" />
                                              Parallel
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )*/}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 sm:px-6 py-4">
                                <div className="flex items-center gap-2">
                                  {totalSharedUsers > 0 ? (
                                    <button
                                      onClick={() => openSharedUsersDialog(doc)}
                                      className="flex items-center gap-1 sm:gap-2 hover:bg-gray-100 px-1 sm:px-2 py-1 rounded transition-colors"
                                    >
                                      <Users className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                                      <span className="text-xs sm:text-sm text-gray-700 hover:text-blue-600 whitespace-nowrap">
                                        {totalSharedUsers} {totalSharedUsers === 1 ? 'person' : 'people'}
                                        {totalSigners > 0 && (
                                          <span className="hidden sm:inline ml-1 text-xs text-purple-600">
                                            ({totalSigners} signers)
                                          </span>
                                        )}
                                      </span>
                                    </button>
                                  ) : (
                                    <span className="text-xs sm:text-sm text-gray-400">—</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 sm:px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  {getStatusBadge(doc, totalSigners)}
                                </div>
                              </td>
                              <td className="px-3 sm:px-6 py-4">
                                <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                                  <button

                                    onClick={() => handleSharedWith(doc)}
                                    className="p-1.5 sm:p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View"
                                  >
                                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDownload(doc)}
                                    className="p-1.5 sm:p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Download"
                                  >
                                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleVerify(doc)}
                                    className="p-1.5 sm:p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Verify"
                                  >
                                    <CircleCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </button>
                                  <button
                                    onClick={() => openSignDialog(doc)}
                                    disabled={!canUserSignDocument(doc)}
                                    className={`p-1.5 sm:p-2 rounded-lg transition-colors ${canUserSignDocument(doc)
                                      ? 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                                      : 'hidden'
                                      }`}
                                    title={getSignButtonTitle(doc)}
                                  >
                                    <PenTool className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </button>

                                  {(() => {
                                    const s = doc.signerSteps && doc.signerSteps.some(step =>
                                      step.permission === 'view' || step.permission === 'view_and_sign')

                                    if (totalSharedUsers > 0 && s) {
                                      return (
                                        <>
                                          <button
                                            className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-cyan-600 hover:bg-red-50 rounded cursor-pointer outline-none"
                                            onClick={() => openUpdateFlowDialog(doc)}
                                            title="Update Sharing Flow"
                                          >
                                            <RefreshCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                          </button>
                                          <button
                                            className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 rounded cursor-pointer outline-none"
                                            onClick={() => openUnshareDialog(doc)}
                                            title="Unshare Document"
                                          >
                                            <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                          </button>
                                        </>
                                      )
                                    } else {
                                      return (
                                        <button
                                          onClick={() => openShareDialog(doc)}
                                          className="p-1.5 sm:p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                          title="Share with others"
                                        >
                                          <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </button>
                                      )
                                    }
                                  })()}


                                  {(totalSharedUsers === 0 ||
                                    (totalSharedUsers > 0 && doc.signerSteps &&
                                      doc.signerSteps.some(step => step.permission === 'view') &&
                                      !doc.signerSteps.some(step => step.permission === 'view_and_sign'))) && (
                                      <button
                                        className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 rounded cursor-pointer outline-none"
                                        onClick={() => openDeleteDialog(doc)}
                                        title="Delete Document"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                      </button>
                                    )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-[#A1C2BD] p-4 sm:p-6 bg-[#E7F2EF]/30">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs sm:text-sm text-[#708993] order-2 sm:order-1">
                    Page {pagination.currentPage} of {totalPages} • {pagination.totalItems} items
                  </p>
                  <div className="flex items-center gap-2 order-1 sm:order-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
                      disabled={pagination.currentPage === 1}
                      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 border-2 border-[#A1C2BD] text-[#19183B] rounded-lg font-semibold hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                    >
                      <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = pagination.currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPagination(prev => ({ ...prev, currentPage: pageNum }))}
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-medium text-xs sm:text-sm ${pagination.currentPage === pageNum
                              ? 'bg-[#19183B] text-white'
                              : 'border border-[#A1C2BD] text-[#19183B] hover:bg-[#A1C2BD] hover:text-white'
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.min(totalPages, prev.currentPage + 1) }))}
                      disabled={pagination.currentPage === totalPages}
                      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 border-2 border-[#A1C2BD] text-[#19183B] rounded-lg font-semibold hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
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
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-[#A1C2BD] z-50">
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
                    disabled={isUploading || !toUploadFile}
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
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-red-200 z-50">
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
      <Dialog.Root open={pdfViewerOpen} onOpenChange={(open) => {
        if (!open) closePdfViewer();
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed inset-2 sm:inset-4 bg-white rounded-2xl shadow-2xl flex flex-col border-2 border-[#A1C2BD] z-50">

            {/* Header */}
            <div className="flex flex-col gap-2 p-3 sm:p-4 border-b border-[#A1C2BD] bg-[#E7F2EF] rounded-t-2xl shrink-0">
              {/* Row 1: Title + Close */}
              <div className="flex items-center justify-between gap-2">
                <Dialog.Title className="flex items-center gap-2 text-sm sm:text-base font-bold text-[#19183B] min-w-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate">{selectedDocument?.fileName || 'PDF Document'}</span>
                </Dialog.Title>
                <button
                  onClick={closePdfViewer}
                  className="p-1.5 sm:p-2 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                  title="Close"
                >
                  <X className="w-5 h-5 text-red-600" />
                </button>
              </div>

              {/* Row 2: Page nav + Zoom controls + Jump to page */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Page Navigation */}
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#A1C2BD]">
                  <button
                    onClick={goToPreviousPage}
                    disabled={pageNumber <= 1}
                    className="p-1.5 hover:bg-[#E7F2EF] rounded-lg disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs sm:text-sm font-medium whitespace-nowrap px-1">
                    {pageNumber} / {numPages}
                  </span>
                  <button
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                    className="p-1.5 hover:bg-[#E7F2EF] rounded-lg disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Jump to Page */}
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#A1C2BD]">
                  <span className="text-xs text-gray-500 whitespace-nowrap">Go to:</span>
                  <input
                    type="number"
                    min={1}
                    max={numPages || 1}
                    value={pageNumber}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 1 && value <= (numPages || 1)) {
                        setPageNumber(value);
                      }
                    }}
                    className="w-12 sm:w-16 px-1 sm:px-2 py-1 text-xs sm:text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#708993] focus:border-[#708993]"
                  />
                  <span className="text-xs text-gray-500">/ {numPages || '?'}</span>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#A1C2BD]">
                  <button
                    onClick={zoomOut}
                    disabled={scale <= 0.5}
                    className="p-1.5 hover:bg-[#E7F2EF] rounded-lg disabled:opacity-50 transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs sm:text-sm font-medium w-12 text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={zoomIn}
                    disabled={scale >= 3}
                    className="p-1.5 hover:bg-[#E7F2EF] rounded-lg disabled:opacity-50 transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={resetZoom}
                    className="px-2 py-1 text-xs bg-[#A1C2BD] text-white rounded-lg hover:bg-[#708993] transition-colors ml-1"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* PDF Content */}
            <div className="flex-1 overflow-auto bg-gray-100 p-3 sm:p-6">
              {isPdfLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-[#A1C2BD] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm sm:text-lg text-[#708993]">Loading PDF document...</p>
                  </div>
                </div>
              ) : pdfUrl ? (
                <div className="flex justify-center items-start min-h-full w-full">
                  <div className="bg-white shadow-xl rounded-xl p-3 sm:p-6 max-w-full">
                    <Document
                      file={pdfUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={(error) => {
                        console.error('Error loading PDF:', error);
                        toast.error('Failed to load PDF document');
                      }}
                      loading={
                        <div className="flex items-center justify-center py-20 sm:py-32">
                          <div className="text-center">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-[#A1C2BD] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-sm text-[#708993]">Loading PDF content...</p>
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
                        width={Math.min(1200, window.innerWidth - 48)}
                      />
                    </Document>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8">
                    <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-[#A1C2BD] mx-auto mb-4" />
                    <p className="text-sm sm:text-lg text-[#708993]">No PDF document to display</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#A1C2BD] p-3 sm:p-5 bg-[#E7F2EF] rounded-b-2xl shrink-0">
              <p className="text-xs sm:text-sm text-[#708993]">
                Use the navigation and zoom controls above to view the document.
              </p>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>







      {/* Share Dialog */}
      <Dialog.Root open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border-2 border-[#A1C2BD] z-50">
            {/* Header - Fixed */}
            <div className="p-6 border-b border-[#A1C2BD] bg-white rounded-t-2xl shrink-0">
              <div className="flex items-center justify-between">
                <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B]">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Share2 className="w-6 h-6 text-blue-600" />
                  </div>
                  Share Document
                </Dialog.Title>
                <button
                  onClick={() => {
                    setShareDialogOpen(false);
                    setSelectedDocumentForShare(null);
                    setSelectedUsersForShare([]);
                    setSelectedViewUsers([]);
                    setSelectedSignUsers([]);
                    setShareMessage('');
                    setSharePermission('view');
                    setIsShareDownloadable(true);
                    setShareSearchQuery('');
                    setDebouncedShareSearchQuery('');
                    setSignerSteps([]);
                    setParallelGroups(new Map());
                  }}
                  className="p-2 hover:bg-[#E7F2EF] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[#708993]" />
                </button>
              </div>

              <div className="mt-4">
                <p className="text-[#708993] text-sm">
                  Select users to share "<span className="font-semibold text-[#19183B]">{selectedDocumentForShare?.fileName}</span>" with:
                </p>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mt-2">
                  <p className="text-sm text-blue-800">
                    Select users for "View Only" or "View & Sign" access using the tabs below.
                    {isShareDownloadable ? ' Download is enabled for all users.' : ' Download is disabled.'}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    💡 "View & Sign" users can be arranged in a signing order with parallel signing support.
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">
                {/* Message input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message (optional)
                  </label>
                  <textarea
                    value={shareMessage}
                    onChange={(e) => setShareMessage(e.target.value)}
                    placeholder="Add a message to the recipients..."
                    className="w-full px-3 py-2 text-sm border-2 border-[#A1C2BD] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all min-h-[60px]"
                    rows={2}
                  />
                </div>

                {/* Download permission toggle */}
                <div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      {isShareDownloadable ? (
                        <Unlock className="w-4 h-4 text-green-600" />
                      ) : (
                        <Lock className="w-4 h-4 text-gray-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium+
                         text-gray-900">Allow downloading</p>
                        <p className="text-xs text-gray-500">
                          {isShareDownloadable
                            ? 'Recipients can download this document'
                            : 'Download is disabled for recipients'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsShareDownloadable(!isShareDownloadable)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isShareDownloadable ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isShareDownloadable ? 'translate-x-4' : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Tabs for View Only and View & Sign */}
                <div className="border-t pt-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Recipients</h3>

                  {/* Tab Headers */}
                  <div className="flex gap-2 mb-4 border-b border-gray-200">
                    <button
                      onClick={() => setSharePermission('view')}
                      className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors border-b-2 ${sharePermission === 'view'
                        ? 'border-green-500 text-green-700 bg-green-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <Eye className="w-4 h-4" />
                      View Only
                      {selectedViewUsers.length > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                          {selectedViewUsers.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setSharePermission('view_and_sign')}
                      className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors border-b-2 ${sharePermission === 'view_and_sign'
                        ? 'border-purple-500 text-purple-700 bg-purple-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <PenTool className="w-4 h-4" />
                      View & Sign
                      {selectedSignUsers.length > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                          {selectedSignUsers.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Search input */}


                  {/* Tab Content - View Only */}
                  {sharePermission === 'view' && (
                    <div>
                      {/* Search input for View Only */}
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search users by name, email, or role..."
                            value={shareSearchQuery}
                            onChange={(e) => setShareSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                          {shareSearchQuery && (
                            <button
                              onClick={() => setShareSearchQuery('')}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-gray-900">Select Users for View Only Access</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {selectedViewUsers.length} selected
                          </span>
                          <button
                            onClick={selectAllViewUsers}
                            disabled={filteredShareUsers.length === 0}
                            className="text-xs text-green-600 hover:text-green-800 hover:bg-green-50 px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {selectedViewUsers.length === filteredShareUsers.filter(u => !selectedSignUsers.includes(u.id)).length && filteredShareUsers.length > 0
                              ? 'Deselect All'
                              : 'Select All Visible'}
                          </button>
                        </div>
                      </div>

                      <div className="max-h-[400px] min-h-[200px] overflow-y-auto border border-green-200 rounded-lg">
                        {isLoadingUsers ? (
                          <div className="p-4 text-center">
                            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-xs text-gray-500">Loading users...</p>
                          </div>
                        ) : filteredShareUsers.length > 0 ? (
                          <div className="divide-y divide-green-50">
                            {filteredShareUsers.map((availableUser) => {
                              const isInSignUsers = selectedSignUsers.includes(availableUser.id);

                              return (
                                <div
                                  key={availableUser.id}
                                  className={`flex items-center gap-2 p-3 transition-colors ${isInSignUsers
                                    ? 'bg-gray-100 cursor-not-allowed opacity-60'
                                    : 'hover:bg-green-50 cursor-pointer'
                                    }`}
                                >
                                  <Checkbox.Root
                                    id={`view-user-${availableUser.id}`}
                                    checked={selectedViewUsers.includes(availableUser.id)}
                                    disabled={isInSignUsers}
                                    onCheckedChange={() => toggleViewUserSelection(availableUser.id)}
                                    className={`w-4 h-4 bg-white border rounded flex items-center justify-center ${isInSignUsers
                                      ? 'border-gray-300 cursor-not-allowed'
                                      : 'border-green-500 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600'
                                      }`}
                                  >
                                    <Checkbox.Indicator>
                                      <Check className="w-3 h-3 text-white" />
                                    </Checkbox.Indicator>
                                  </Checkbox.Root>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1 bg-green-100 rounded-full">
                                        <User className="w-3 h-3 text-green-600" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-900 truncate">{availableUser.username}</p>
                                        <p className="text-xs text-gray-500 truncate">{availableUser.email}</p>
                                        {availableUser.roles && (
                                          <p className="text-xs text-gray-400 truncate">
                                            {availableUser.roles.join(', ')}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {isInSignUsers ? (
                                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                                      In View & Sign
                                    </span>
                                  ) : (
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                      View Only
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-8 text-center text-gray-500">
                            <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            {shareSearchQuery.trim() ? (
                              <>
                                <p className="text-sm font-medium">No users found</p>
                                <p className="text-xs mt-1">Try a different search term</p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-medium">Start typing to search users</p>
                                <p className="text-xs mt-1">Search by name, email, or role</p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab Content - View & Sign */}
                  {sharePermission === 'view_and_sign' && (
                    <div className="space-y-4">
                      {/* Pre-configured signers lock indicator */}
                      {(() => {
                        const hasPreConfiguredSigners = selectedDocumentForShare?.initialSignerSteps &&
                          Array.isArray(selectedDocumentForShare.initialSignerSteps) &&
                          selectedDocumentForShare.initialSignerSteps.length > 0;

                        return hasPreConfiguredSigners && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-3">
                            <div className="flex items-center gap-2">
                              <Lock className="w-4 h-4 text-blue-600" />
                              <p className="text-sm text-blue-700">
                                <span className="font-semibold">Pre-configured Signers Locked</span>
                                <span className="block text-xs text-blue-600 mt-0.5">
                                  These signers were pre-configured for this document and cannot be modified.
                                </span>
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Search input for View & Sign - Locked when pre-configured */}
                      <div className="mb-4">
                        {(() => {
                          const hasPreConfiguredSigners = selectedDocumentForShare?.initialSignerSteps &&
                            Array.isArray(selectedDocumentForShare.initialSignerSteps) &&
                            selectedDocumentForShare.initialSignerSteps.length > 0;

                          return hasPreConfiguredSigners ? (
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                              <input
                                type="text"
                                value="Search is locked for pre-configured signers"
                                disabled
                                className="w-full pl-9 pr-8 py-2 text-sm bg-gray-100 border border-gray-300 rounded-lg cursor-not-allowed text-gray-500"
                              />
                              <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            </div>
                          ) : (
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search users by name, email, or role..."
                                value={shareSearchQuery}
                                onChange={(e) => setShareSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              />
                              {shareSearchQuery && (
                                <button
                                  onClick={() => setShareSearchQuery('')}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>


                      {/* User Selection */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-900">Select Users for View & Sign Access</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {selectedSignUsers.length} selected
                            </span>
                            {!(() => {
                              const hasPreConfiguredSigners = selectedDocumentForShare?.initialSignerSteps &&
                                Array.isArray(selectedDocumentForShare.initialSignerSteps) &&
                                selectedDocumentForShare.initialSignerSteps.length > 0;
                              return hasPreConfiguredSigners;
                            })() && (
                                <button
                                  onClick={selectAllSignUsers}
                                  disabled={filteredShareUsers.length === 0}
                                  className="text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {selectedSignUsers.length === filteredShareUsers.filter(u => !selectedViewUsers.includes(u.id)).length && filteredShareUsers.length > 0
                                    ? 'Deselect All'
                                    : 'Select All Visible'}
                                </button>
                              )}
                          </div>
                        </div>

                        <div className="max-h-[200px] min-h-[100px] overflow-y-auto border border-purple-200 rounded-lg mb-4">
                          {isLoadingUsers ? (
                            <div className="p-4 text-center">
                              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                              <p className="text-xs text-gray-500">Loading users...</p>
                            </div>
                          ) : filteredShareUsers.length > 0 ? (
                            <div className="divide-y divide-purple-50">
                              {filteredShareUsers.map((availableUser) => {
                                const isInViewUsers = selectedViewUsers.includes(availableUser.id);
                                // Check if this user is pre-configured
                                const isPreConfigured = (() => {
                                  const initialSigners = selectedDocumentForShare?.initialSignerSteps || selectedDocumentForShare?.preConfiguredSigners || [];
                                  return Array.isArray(initialSigners) && initialSigners.some(s =>
                                    s.userId === availableUser.id || s.user?.id?.toString() === availableUser.id
                                  );
                                })();

                                return (
                                  <div
                                    key={availableUser.id}
                                    className={`flex items-center gap-2 p-3 transition-colors ${isInViewUsers || isPreConfigured
                                      ? 'bg-gray-100 cursor-not-allowed opacity-60'
                                      : 'hover:bg-purple-50 cursor-pointer'
                                      }`}
                                  >
                                    <Checkbox.Root
                                      id={`sign-user-${availableUser.id}`}
                                      checked={selectedSignUsers.includes(availableUser.id)}
                                      disabled={isInViewUsers || isPreConfigured}
                                      onCheckedChange={() => toggleSignUserSelection(availableUser.id)}
                                      className={`w-4 h-4 bg-white border rounded flex items-center justify-center ${isInViewUsers || isPreConfigured
                                        ? 'border-gray-300 cursor-not-allowed'
                                        : 'border-purple-500 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600'
                                        }`}
                                    >
                                      <Checkbox.Indicator>
                                        <Check className="w-3 h-3 text-white" />
                                      </Checkbox.Indicator>
                                    </Checkbox.Root>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <div className="p-1 bg-purple-100 rounded-full">
                                          <User className="w-3 h-3 text-purple-600" />
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-900 truncate">{availableUser.username}</p>
                                          <p className="text-xs text-gray-500 truncate">{availableUser.email}</p>
                                          {availableUser.roles && (
                                            <p className="text-xs text-gray-400 truncate">
                                              {availableUser.roles.join(', ')}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {isInViewUsers ? (
                                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                        In View Only
                                      </span>
                                    ) : isPreConfigured ? (
                                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                                        <Lock className="w-3 h-3" />
                                        Pre-configured
                                      </span>
                                    ) : (
                                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                                        View & Sign
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-8 text-center text-gray-500">
                              <PenTool className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              {shareSearchQuery.trim() ? (
                                <>
                                  <p className="text-sm font-medium">No users found</p>
                                  <p className="text-xs mt-1">Try a different search term</p>
                                </>
                              ) : (
                                <>
                                  <p className="text-sm font-medium">Start typing to search users</p>
                                  <p className="text-xs mt-1">Search by name, email, or role</p>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Signing Order */}
                      {selectedSignUsers.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <ListOrdered className="w-4 h-4 text-purple-600" />
                              <h3 className="text-sm font-semibold text-gray-900">Signing Order</h3>
                              <span className="text-xs text-gray-500">(Drag to reorder or use arrows)</span>
                            </div>
                            <div className="text-xs text-blue-600 flex items-center gap-1">
                              <UsersIcon className="w-3 h-3" />
                              {signerSteps.filter(s => s.parallel).length} parallel signers
                            </div>
                          </div>

                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                              <p className="text-xs text-blue-700 flex items-center gap-1">
                                💡 <span className="font-semibold">Parallel Signing:</span> Click the
                                <UserCheck className="w-3 h-3 inline mx-1" />
                                button to allow multiple users to sign at the same step.
                              </p>
                            </div>

                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleDragEnd}
                            >
                              <SortableContext
                                items={signerSteps.map(step => step.userId)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                  {signerSteps.map((step, index) => {
                                    const isPreConfigured = (() => {
                                      const initialSigners = selectedDocumentForShare?.initialSignerSteps || selectedDocumentForShare?.preConfiguredSigners || [];
                                      return Array.isArray(initialSigners) && initialSigners.some(s =>
                                        s.userId === step.userId || s.user?.id?.toString() === step.userId
                                      );
                                    })();

                                    return (
                                      <SortableItem
                                        key={step.userId}
                                        id={step.userId}
                                        step={step}
                                        index={index}
                                        moveSignerUp={isPreConfigured ? () => { } : moveSignerUp}
                                        moveSignerDown={isPreConfigured ? () => { } : moveSignerDown}
                                        totalItems={signerSteps.length}
                                        onToggleParallel={isPreConfigured ? () => { } : toggleParallelSigning}
                                        getParallelGroup={getParallelGroup}
                                        isPreConfigured={isPreConfigured}
                                      />
                                    );
                                  })}
                                </div>
                              </SortableContext>
                            </DndContext>

                            {/* Step Legend */}
                            <div className="mt-3 pt-3 border-t border-purple-200">
                              <div className="flex items-center gap-3 text-xs text-gray-600">
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 bg-purple-100 rounded-full"></div>
                                  <span>Sequential</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 bg-blue-100 rounded-full"></div>
                                  <span>Parallel</span>
                                </div>
                                {(() => {
                                  const hasPreConfigured = selectedDocumentForShare?.initialSignerSteps &&
                                    Array.isArray(selectedDocumentForShare.initialSignerSteps) &&
                                    selectedDocumentForShare.initialSignerSteps.length > 0;
                                  return hasPreConfigured && (
                                    <div className="flex items-center gap-1 ml-2">
                                      <Lock className="w-3 h-3 text-gray-400" />
                                      <span className="text-gray-400">Locked (pre-configured)</span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}




                  {/* Total selected count */}
                  <div className="text-xs text-gray-500 text-right mt-3">
                    Total: {selectedUsersForShare.length} users selected ({selectedViewUsers.length} view only, {selectedSignUsers.length} view & sign)
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="shrink-0 p-4 border-t border-[#A1C2BD] bg-white rounded-b-2xl">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShareDialogOpen(false);
                    setSelectedDocumentForShare(null);
                    setSelectedUsersForShare([]);
                    setSelectedViewUsers([]);
                    setSelectedSignUsers([]);
                    setShareMessage('');
                    setSharePermission('view');
                    setIsShareDownloadable(true);
                    setShareSearchQuery('');
                    setDebouncedShareSearchQuery('');
                    setSignerSteps([]);
                    setParallelGroups(new Map());
                  }}
                  className="px-4 py-2 text-sm border border-[#A1C2BD] text-[#19183B] rounded-lg font-medium hover:bg-[#E7F2EF] transition-colors"
                  disabled={isSharing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleShare}
                  disabled={selectedUsersForShare.length === 0 || isSharing}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSharing ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      Share with {selectedUsersForShare.length} user{selectedUsersForShare.length !== 1 ? 's' : ''}
                      {selectedSignUsers.length > 0 && (
                        <span className="text-xs opacity-90">
                          • {selectedSignUsers.length} signer{selectedSignUsers.length !== 1 ? 's' : ''}
                          {signerSteps.filter(s => s.parallel).length > 0 && ' with parallel signing'}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Sign Dialog */}
      {signDocument && (
        <Dialog.Root open={signDialogOpen} onOpenChange={setSignDialogOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />

            <Dialog.Content className="fixed inset-0 z-50 bg-white flex flex-col">
              <Dialog.Title className="sr-only">Sign Document</Dialog.Title>

              {/* Header */}
              <div className="p-4 border-b border-[#A1C2BD] flex justify-between items-center bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[#19183B]">
                      Sign Document: {signDocument.fileName}
                    </h2>

                    {signDocument.signerSteps?.length !== undefined && signDocument.signerSteps?.length > 0 && (
                      <button
                        onClick={() => setSigningOrderDialogOpen(true)}
                        className="group flex items-center gap-2 mt-1 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                      >
                        <Info className="w-3.5 h-3.5 text-blue-600" />
                        <p className="text-xs text-gray-500 group-hover:text-blue-700 transition-colors">
                          {signDocument.signerSteps.length} signer(s) •{" "}
                          {signDocument.signerSteps.some(s => s.parallel)
                            ? "Parallel signing enabled"
                            : "Sequential signing"}
                        </p>
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (signDocument) {
                      handleReleaseDocumentLock(signDocument);
                    }
                    setSignDialogOpen(false);
                    setSignDocument(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* PDF Signer — THIS fills the screen */}
              <div className="flex-1 overflow-hidden">
                <UserPdfSigner
                  preloadedDocument={signDocument}
                  onClose={() => {
                    if (signDocument) {
                      handleReleaseDocumentLock(signDocument);
                    }
                    setSignDialogOpen(false);
                    setSignDocument(null);
                    loadDocuments();
                  }}
                />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {/* Signing Order Indicator Dialog */}
      {signDocument && (
        <Dialog.Root open={signingOrderDialogOpen} onOpenChange={setSigningOrderDialogOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" />
            <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border-2 border-blue-200 z-[60]">
              {/* Dialog Header */}
              <div className="p-4 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-2xl shrink-0">
                <div className="flex items-center justify-between">
                  <Dialog.Title className="flex items-center gap-3 text-xl font-bold text-[#19183B]">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <ListOrdered className="w-5 h-5 text-blue-600" />
                    </div>
                    Signing Order Details
                  </Dialog.Title>
                  <button
                    onClick={() => setSigningOrderDialogOpen(false)}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-[#708993]" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2 ml-12">
                  View the complete signing workflow for this document
                </p>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <SigningOrderIndicator
                  document={signDocument}
                  currentUser={user}
                />
              </div>

              {/* Footer */}
              <div className="shrink-0 p-4 border-t border-blue-200 bg-white rounded-b-2xl">
                <div className="flex justify-end">
                  <button
                    onClick={() => setSigningOrderDialogOpen(false)}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {/* Shared Users Modal */}
      <Dialog.Root open={sharedUsersDialogOpen} onOpenChange={setSharedUsersDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border-2 border-[#A1C2BD]">
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
                  onClick={() => {
                    setSharedUsersDialogOpen(false);
                    setSelectedDocumentForSharedUsers(null);
                  }}
                  className="p-2 hover:bg-[#E7F2EF] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[#708993]" />
                </button>
              </div>

              <div className="mt-4">
                <p className="text-[#708993] text-sm">
                  Document "<span className="font-semibold text-[#19183B]">{selectedDocumentForSharedUsers?.fileName}</span>" is shared with the following users:
                </p>

                {/* Show if signing order is enabled */}
                {selectedDocumentForSharedUsers?.signerSteps && selectedDocumentForSharedUsers.signerSteps.length > 0 && selectedDocumentForSharedUsers.availableForSigning && (
                  <div className="mt-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded">
                    <div className="flex items-center gap-2">
                      <ListOrdered className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="text-xs text-purple-700 font-semibold">
                          {selectedDocumentForSharedUsers.signerSteps.some(s => s.parallel)
                            ? 'Parallel Signing Order Enabled'
                            : 'Signing Order Enabled'}
                        </p>
                        <p className="text-xs text-purple-600">
                          {selectedDocumentForSharedUsers.signerSteps.filter(s => s.hasSigned).length} of {selectedDocumentForSharedUsers.signerSteps.length} signers completed
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedDocumentForSharedUsers?.sharedToUsers && selectedDocumentForSharedUsers.sharedToUsers.length > 0 ? (
                <div className="space-y-4">
                  {/* Group users by permission type */}
                  <div className="space-y-4">
                    {/* View Only Users */}
                    {selectedDocumentForSharedUsers.sharedToUsers.filter(user => user.permission === 'view').length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-green-100 rounded-lg">
                            <Eye className="w-4 h-4 text-green-600" />
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900">View Only</h4>
                          <span className="text-xs text-gray-500">
                            ({selectedDocumentForSharedUsers.sharedToUsers.filter(user => user.permission === 'view').length} users)
                          </span>
                        </div>
                        <div className="space-y-2">
                          {selectedDocumentForSharedUsers.sharedToUsers
                            .filter(user => user.permission === 'view')
                            .map((sharedUser) => (
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
                                      {sharedUser.username}
                                    </p>
                                  </div>
                                  <p className="text-xs text-[#708993] truncate">
                                    {sharedUser.email}
                                  </p>
                                </div>

                                <div className="shrink-0">
                                  <span
                                    className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700"
                                  >
                                    View Only
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* View & Sign Users */}
                    {selectedDocumentForSharedUsers.sharedToUsers.filter(user => user.permission === 'view_and_sign').length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-purple-100 rounded-lg">
                            <PenTool className="w-4 h-4 text-purple-600" />
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900">View & Sign</h4>
                          <span className="text-xs text-gray-500">
                            ({selectedDocumentForSharedUsers.sharedToUsers.filter(user => user.permission === 'view_and_sign').length} users)
                          </span>
                        </div>
                        <div className="space-y-2">
                          {selectedDocumentForSharedUsers.sharedToUsers
                            .filter(user => user.permission === 'view_and_sign')
                            .map((sharedUser) => {
                              const userStep = selectedDocumentForSharedUsers?.signerSteps?.find(
                                step => step.userId === sharedUser.id
                              );
                              return { sharedUser, userStep };
                            })
                            .filter(item => item.userStep) // Optional: only include users with steps
                            .sort((a, b) => {
                              // Sort by step number in ascending order
                              // Handle cases where step might be undefined
                              const stepA = a.userStep?.step || Infinity;
                              const stepB = b.userStep?.step || Infinity;
                              return stepA - stepB;
                            })
                            .map(({ sharedUser, userStep }) => {
                              return (
                                <div
                                  key={sharedUser.id}
                                  className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                                >
                                  {/* Step number indicator */}
                                  {userStep ? (
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${userStep.hasSigned
                                      ? 'bg-green-100 border-2 border-green-300'
                                      : userStep.parallel
                                        ? 'bg-blue-100 border-2 border-blue-300'
                                        : 'bg-purple-100 border-2 border-purple-300'
                                      }`}>
                                      {userStep.hasSigned ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                      ) : userStep.parallel ? (
                                        <UsersIcon className="w-4 h-4 text-blue-600" />
                                      ) : !selectedDocumentForSharedUsers.availableForSigning ? (
                                        <User className="w-4 h-4 text-blue-600" />
                                      ) : (
                                        <span className="text-sm font-bold text-purple-700">{userStep.step}</span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full shrink-0">
                                      <User className="w-5 h-5 text-purple-600" />
                                    </div>
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-semibold text-[#19183B] truncate">
                                        {sharedUser.username}
                                      </p>
                                      {userStep?.hasSigned && (
                                        <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                          Signed
                                        </span>
                                      )}
                                      {userStep?.decline && (
                                        <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                                          Declined
                                        </span>
                                      )}
                                      {userStep?.parallel && !userStep.hasSigned && (
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
                                    {userStep && (
                                      <span className={`px-2 py-1 text-xs font-medium rounded ${userStep.hasSigned
                                        ? 'bg-green-100 text-green-700'
                                        : userStep.parallel
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-purple-100 text-purple-700'
                                        }`}>
                                        {userStep.hasSigned ? 'Signed ✓' :
                                          userStep.parallel ? `Step ${userStep.step} (Parallel)` : `Step ${userStep.step}`}
                                      </span>
                                    )}
                                    <span
                                      className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700"
                                    >
                                      View & Sign
                                    </span>

                                    {userStep && userStep.decline && !userStep.proceedNext && (
                                      <button
                                        onClick={() => {
                                          if (userStep.dsId) {
                                            handleSkipThisSigner(userStep.dsId);
                                          } else {
                                            toast.error('Unable to skip: missing signer identifier.');
                                          }
                                        }}
                                        className="px-4 py-2 text-sm bg-[#19183B] text-white rounded-lg font-medium hover:bg-[#708993] transition-colors"
                                      >
                                        Skip this signer
                                      </button>
                                    )}

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
                  {selectedDocumentForSharedUsers?.sharedToUsers?.length || 0} user(s) have access to this document
                  {selectedDocumentForSharedUsers?.signerSteps && selectedDocumentForSharedUsers.signerSteps.length > 0 && selectedDocumentForSharedUsers.availableForSigning &&
                    ` • ${selectedDocumentForSharedUsers.signerSteps.filter(s => s.hasSigned).length}/${selectedDocumentForSharedUsers.signerSteps.length} completed signing`}
                </p>
                <button
                  onClick={() => {
                    setSharedUsersDialogOpen(false);
                    setSelectedDocumentForSharedUsers(null);

                  }}
                  className="px-4 py-2 text-sm bg-[#19183B] text-white rounded-lg font-medium hover:bg-[#708993] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>



      {/* Shared With Modal */}
      <Dialog.Root open={sharedWithDialogOpen} onOpenChange={setSharedUsersDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border-2 border-[#A1C2BD]">
            {/* Header */}
            <div className="p-6 border-b border-[#A1C2BD] bg-white rounded-t-2xl shrink-0">
              <div className="flex items-center justify-between">
                <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B]">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  Shared With
                </Dialog.Title>
              </div>

              <div className="mt-4">
                <p className="text-[#708993] text-sm">
                  Document "<span className="font-semibold text-[#19183B]">{selectedDocumentForSharedUsers?.fileName}</span>" is shared with the following users:
                </p>

                {/* Show if signing order is enabled */}
                {selectedDocumentForSharedUsers?.signerSteps && selectedDocumentForSharedUsers.signerSteps.length > 0 && selectedDocumentForSharedUsers.availableForSigning && (
                  <div className="mt-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded">
                    <div className="flex items-center gap-2">
                      <ListOrdered className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="text-xs text-purple-700 font-semibold">
                          {selectedDocumentForSharedUsers.signerSteps.some(s => s.parallel)
                            ? 'Parallel Signing Order Enabled'
                            : 'Signing Order Enabled'}
                        </p>
                        <p className="text-xs text-purple-600">
                          {selectedDocumentForSharedUsers.signerSteps.filter(s => s.hasSigned).length} of {selectedDocumentForSharedUsers.signerSteps.length} signers completed
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedDocumentForSharedUsers?.sharedToUsers && selectedDocumentForSharedUsers.sharedToUsers.length > 0 ? (
                <div className="space-y-4">
                  {/* Group users by permission type */}
                  <div className="space-y-4">
                    {/* View Only Users */}
                    {selectedDocumentForSharedUsers.sharedToUsers.filter(user => user.permission === 'view').length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-green-100 rounded-lg">
                            <Eye className="w-4 h-4 text-green-600" />
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900">View Only</h4>
                          <span className="text-xs text-gray-500">
                            ({selectedDocumentForSharedUsers.sharedToUsers.filter(user => user.permission === 'view').length} users)
                          </span>
                        </div>
                        <div className="space-y-2">
                          {selectedDocumentForSharedUsers.sharedToUsers
                            .filter(user => user.permission === 'view')
                            .map((sharedUser) => (
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
                                      {sharedUser.username}
                                    </p>
                                  </div>
                                  <p className="text-xs text-[#708993] truncate">
                                    {sharedUser.email}
                                  </p>
                                </div>

                                <div className="shrink-0">
                                  <span
                                    className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700"
                                  >
                                    View Only
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* View & Sign Users */}
                    {selectedDocumentForSharedUsers.sharedToUsers.filter(user => user.permission === 'view_and_sign').length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-purple-100 rounded-lg">
                            <PenTool className="w-4 h-4 text-purple-600" />
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900">View & Sign</h4>
                          <span className="text-xs text-gray-500">
                            ({selectedDocumentForSharedUsers.sharedToUsers.filter(user => user.permission === 'view_and_sign').length} users)
                          </span>
                        </div>
                        <div className="space-y-2">
                          {selectedDocumentForSharedUsers.sharedToUsers
                            .filter(user => user.permission === 'view_and_sign')
                            .map((sharedUser) => {
                              const userStep = selectedDocumentForSharedUsers?.signerSteps?.find(
                                step => step.userId === sharedUser.id
                              );
                              return { sharedUser, userStep };
                            })
                            .filter(item => item.userStep) // Optional: only include users with steps
                            .sort((a, b) => {
                              // Sort by step number in ascending order
                              // Handle cases where step might be undefined
                              const stepA = a.userStep?.step || Infinity;
                              const stepB = b.userStep?.step || Infinity;
                              return stepA - stepB;
                            })
                            .map(({ sharedUser, userStep }) => {
                              return (
                                <div
                                  key={sharedUser.id}
                                  className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                                >
                                  {/* Step number indicator */}
                                  {userStep ? (
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${userStep.hasSigned
                                      ? 'bg-green-100 border-2 border-green-300'
                                      : userStep.parallel
                                        ? 'bg-blue-100 border-2 border-blue-300'
                                        : 'bg-purple-100 border-2 border-purple-300'
                                      }`}>
                                      {userStep.hasSigned ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                      ) : userStep.parallel ? (
                                        <UsersIcon className="w-4 h-4 text-blue-600" />
                                      ) : !selectedDocumentForSharedUsers.availableForSigning ? (
                                        <User className="w-4 h-4 text-blue-600" />
                                      ) : (
                                        <span className="text-sm font-bold text-purple-700">{userStep.step}</span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full shrink-0">
                                      <User className="w-5 h-5 text-purple-600" />
                                    </div>
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-semibold text-[#19183B] truncate">
                                        {sharedUser.username}
                                      </p>
                                      {userStep?.hasSigned && (
                                        <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                          Signed
                                        </span>
                                      )}
                                      {userStep?.decline && (
                                        <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                                          Declined
                                        </span>
                                      )}
                                      {userStep?.parallel && !userStep.hasSigned && (
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
                                    {userStep && (
                                      <span className={`px-2 py-1 text-xs font-medium rounded ${userStep.hasSigned
                                        ? 'bg-green-100 text-green-700'
                                        : userStep.parallel
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-purple-100 text-purple-700'
                                        }`}>
                                        {userStep.hasSigned ? 'Signed ✓' :
                                          userStep.parallel ? `Step ${userStep.step} (Parallel)` : `Step ${userStep.step}`}
                                      </span>
                                    )}
                                    <span
                                      className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700"
                                    >
                                      View & Sign
                                    </span>

                                    {userStep && userStep.decline && !userStep.proceedNext && (
                                      <button
                                        onClick={() => {
                                          if (userStep.dsId) {
                                            handleSkipThisSigner(userStep.dsId);
                                          } else {
                                            toast.error('Unable to skip: missing signer identifier.');
                                          }
                                        }}
                                        className="px-4 py-2 text-sm bg-[#19183B] text-white rounded-lg font-medium hover:bg-[#708993] transition-colors"
                                      >
                                        Skip this signer
                                      </button>
                                    )}

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
                  {selectedDocumentForSharedUsers?.sharedToUsers?.length || 0} user(s) have access to this document
                  {selectedDocumentForSharedUsers?.signerSteps && selectedDocumentForSharedUsers.signerSteps.length > 0 && selectedDocumentForSharedUsers.availableForSigning &&
                    ` • ${selectedDocumentForSharedUsers.signerSteps.filter(s => s.hasSigned).length}/${selectedDocumentForSharedUsers.signerSteps.length} completed signing`}
                </p>
                <button
                  onClick={() => {
                    setSharedWithDialogOpen(false);
                    setSelectedDocumentForSharedUsers(null);
                    handleView(selectedDocumentForSharedUsers);
                  }}
                  className="px-4 py-2 text-sm bg-[#19183B] text-white rounded-lg font-medium hover:bg-[#708993] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>



      {/* Unshare Modal */}
      <Dialog.Root open={unshareDialogOpen} onOpenChange={setUnshareDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border-2 border-red-200 z-50">
            {/* Header */}
            <div className="p-6 border-b border-red-200 bg-white rounded-t-2xl shrink-0">
              <div className="flex items-center justify-between">
                <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-red-600">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <UserX className="w-6 h-6 text-red-600" />
                  </div>
                  Remove Access
                </Dialog.Title>
                <button
                  onClick={() => {
                    setUnshareDialogOpen(false);
                    setSelectedDocumentForUnshare(null);
                    setSelectedUsersForUnshare([]);
                  }}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-red-600" />
                </button>
              </div>

              <div className="mt-4">
                <p className="text-gray-700 text-sm">
                  Select users to remove access from document "
                  <span className="font-semibold text-[#19183B]">
                    {selectedDocumentForUnshare?.fileName}
                  </span>":
                </p>

                <div className="p-3 bg-red-50 rounded-lg border border-red-200 mt-2">
                  <p className="text-sm text-red-800">
                    ⚠️ Selected users will lose all access to this document. This action cannot be undone.
                  </p>
                  {selectedDocumentForUnshare?.signerSteps && selectedDocumentForUnshare.signerSteps.filter(s => s.permission === 'view_and_sign').length > 0 && (
                    <p className="text-xs text-red-700 mt-1">
                      Note: Removing signers will also remove them from the signing order.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedDocumentForUnshare?.sharedToUsers && selectedDocumentForUnshare.sharedToUsers.length > 0 ? (
                <div className="space-y-4">
                  {/* Select All */}
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Checkbox.Root
                        id="select-all-unshare"
                        checked={selectedUsersForUnshare.length === selectedDocumentForUnshare.sharedToUsers.length && selectedDocumentForUnshare.sharedToUsers.length > 0}
                        onCheckedChange={selectAllUsersForUnshare}
                        className="w-4 h-4 bg-white border border-red-500 rounded flex items-center justify-center data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                      >
                        <Checkbox.Indicator>
                          <Check className="w-3 h-3 text-white" />
                        </Checkbox.Indicator>
                      </Checkbox.Root>
                      <label htmlFor="select-all-unshare" className="text-sm font-medium text-[#19183B] cursor-pointer">
                        Select All ({selectedDocumentForUnshare.sharedToUsers.length} users)
                      </label>
                    </div>
                  </div>

                  {/* View Only Users */}
                  {selectedDocumentForUnshare.sharedToUsers.filter(user => user.permission === 'view').length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-green-100 rounded-lg">
                          <Eye className="w-4 h-4 text-green-600" />
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900">View Only</h4>
                        <span className="text-xs text-gray-500">
                          ({selectedDocumentForUnshare.sharedToUsers.filter(user => user.permission === 'view').length} users)
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        {selectedDocumentForUnshare.sharedToUsers
                          .filter(user => user.permission === 'view')
                          .map((sharedUser) => (
                            <div key={sharedUser.id} className="flex items-center gap-3 p-4 hover:bg-red-50 transition-colors border border-gray-200 rounded-lg">
                              <Checkbox.Root
                                id={`user-unshare-${sharedUser.id}`}
                                checked={selectedUsersForUnshare.includes(sharedUser.id)}
                                onCheckedChange={() => toggleUserForUnshareSelection(sharedUser.id)}
                                className="w-4 h-4 bg-white border border-red-500 rounded flex items-center justify-center data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                              >
                                <Checkbox.Indicator>
                                  <Check className="w-3 h-3 text-white" />
                                </Checkbox.Indicator>
                              </Checkbox.Root>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-full bg-green-100">
                                    <Eye className="w-4 h-4 text-green-600" />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-[#19183B] truncate">
                                      {sharedUser.username}
                                    </p>
                                    <p className="text-xs text-[#708993] truncate">
                                      {sharedUser.email}
                                    </p>

                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700">
                                        View Only
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* View & Sign Users — sorted by step number */}
                  {selectedDocumentForUnshare.sharedToUsers.filter(user => user.permission === 'view_and_sign').length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                          <PenTool className="w-4 h-4 text-purple-600" />
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900">View & Sign</h4>
                        <span className="text-xs text-gray-500">
                          ({selectedDocumentForUnshare.sharedToUsers.filter(user => user.permission === 'view_and_sign').length} users)
                        </span>
                      </div>

                      <div className="space-y-2">
                        {selectedDocumentForUnshare.sharedToUsers
                          .filter(user => user.permission === 'view_and_sign')
                          .map((sharedUser) => {
                            const userStep = selectedDocumentForUnshare?.signerSteps?.find(
                              step => step.userId === sharedUser.id && step.permission === 'view_and_sign'
                            );
                            return { sharedUser, userStep };
                          })
                          .sort((a, b) => {
                            const stepA = a.userStep?.step ?? Infinity;
                            const stepB = b.userStep?.step ?? Infinity;
                            return stepA - stepB;
                          })
                          .map(({ sharedUser, userStep }) => {
                            const hasSigned = userStep?.hasSigned || false;

                            return (
                              <div key={sharedUser.id} className="flex items-center gap-3 p-4 hover:bg-red-50 transition-colors border border-gray-200 rounded-lg">
                                <Checkbox.Root
                                  id={`user-unshare-${sharedUser.id}`}
                                  checked={selectedUsersForUnshare.includes(sharedUser.id)}
                                  onCheckedChange={() => toggleUserForUnshareSelection(sharedUser.id)}
                                  className="w-4 h-4 bg-white border border-red-500 rounded flex items-center justify-center data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                >
                                  <Checkbox.Indicator>
                                    <Check className="w-3 h-3 text-white" />
                                  </Checkbox.Indicator>
                                </Checkbox.Root>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3">
                                    {/* Step number indicator */}
                                    {userStep ? (
                                      <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${hasSigned
                                        ? 'bg-green-100 border-2 border-green-300'
                                        : userStep.parallel
                                          ? 'bg-blue-100 border-2 border-blue-300'
                                          : 'bg-purple-100 border-2 border-purple-300'
                                        }`}>
                                        {hasSigned ? (
                                          <CheckCircle className="w-4 h-4 text-green-600" />
                                        ) : userStep.parallel ? (
                                          <UsersIcon className="w-4 h-4 text-blue-600" />
                                        ) : (
                                          <span className="text-sm font-bold text-purple-700">{userStep.step}</span>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="p-2 rounded-full bg-purple-100">
                                        <PenTool className="w-4 h-4 text-purple-600" />
                                      </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-[#19183B] truncate">
                                          {sharedUser.username}
                                        </p>
                                        {hasSigned && (
                                          <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                            Signed
                                          </span>
                                        )}
                                        {userStep?.parallel && !hasSigned && (
                                          <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                            Parallel
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-[#708993] truncate">
                                        {sharedUser.email}
                                      </p>

                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700">
                                          View & Sign
                                        </span>

                                        {userStep && (
                                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${hasSigned
                                            ? 'bg-green-100 text-green-700'
                                            : userStep.parallel
                                              ? 'bg-blue-100 text-blue-700'
                                              : 'bg-purple-100 text-purple-700'
                                            }`}>
                                            {hasSigned
                                              ? 'Signed'
                                              : userStep.parallel
                                                ? `Step ${userStep.step} (Parallel)`
                                                : `Step ${userStep.step}`}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Selected count */}
                  <div className="text-xs text-gray-500 text-right">
                    {selectedUsersForUnshare.length} of {selectedDocumentForUnshare.sharedToUsers.length} users selected
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">This document hasn't been shared with anyone yet</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 p-4 border-t border-red-200 bg-white rounded-b-2xl">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {selectedUsersForUnshare.length} user{selectedUsersForUnshare.length !== 1 ? 's' : ''} selected for removal
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setUnshareDialogOpen(false);
                      setSelectedDocumentForUnshare(null);
                      setSelectedUsersForUnshare([]);
                    }}
                    className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    disabled={isUnsharing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUnshare}
                    disabled={selectedUsersForUnshare.length === 0 || isUnsharing}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUnsharing ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <UserX className="w-3.5 h-3.5" />
                        Remove Access
                        {selectedUsersForUnshare.length > 0 && ` (${selectedUsersForUnshare.length})`}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>





      {/* Verify Dialog */}
      {verifyDocument && (
        <Dialog.Root open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed inset-0 bg-white z-50 flex flex-col">
              <Dialog.Title className="sr-only">Verify Document</Dialog.Title>
              <div className="p-4 border-b border-[#A1C2BD] flex justify-between items-center">
                <h2 className="text-lg font-semibold text-[#19183B]">
                  Verify Document: {verifyDocument.fileName}
                </h2>
                <button
                  onClick={() => {
                    setVerifyDialogOpen(false);
                    setVerifyDocument(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <UserPdfVerifierv2
                  preloadedDocument={verifyDocument}
                  onClose={() => {
                    setVerifyDialogOpen(false);
                    setVerifyDocument(null);
                  }}
                />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      <UpdateFlowDialog
        open={updateFlowDialogOpen}
        onOpenChange={setUpdateFlowDialogOpen}
        document={selectedDocumentForUpdateFlow}
        onSaved={() => {
          loadDocuments();
          setSelectedDocumentForUpdateFlow(null);
        }}
      />



    </>
  );
};

export default UploadManager;