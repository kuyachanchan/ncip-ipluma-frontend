import type { Role } from "./auth";

export interface Certificate {
  id: number;
  userId: number;
  fileName: string;
  storedFileName: string;
  certificateHash: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
  expiresAt: string | null;
  issuer: string | null;
  subject: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
}


export interface PDFDocument {
  comment: string;
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: string;
  status: string;
  uploadedAt: string;
  ownerDetails: {
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
  office?: string;
  availableForDownload?: boolean;
  permission?: 'view' | 'view_and_sign';
  availableForSigning?: boolean;
  availableForViewing?: boolean;
  nextSignerId?: number;
  signerSteps?: SignerStep[];
  currentSignerIndex?: number;
  bookmarks?: BookmarkItem[];
  initialSignerSteps?: InitialSignerStep[];
}

export interface UserType {
  id: string;
  username: string;
  email: string;
  roles?: string[] | Array<{ id: number; name: string }>;
}

export interface Signer {
  id: string;
  username: string;
  email: string;
  signaturePreference?: 'full' | 'initial';
}


export interface SignerStep {
  id: string;
  dsId: {
    documentId: number,
    userId: number
  },
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
}


type DocStats = 'UPLOADED' | 'SIGNED' | 'SHARED' | 'SIGNED_AND_SHARED' | 'ARCHIEVED';


interface UserSearchResponse {
  id: number;
  username: string;
  email: string;
  password: string;
  roles: Role[];
}

interface OwnerDetails {
  id: number;
  username: string;
  email: string;
}

export interface PdfUploadResponse {
  id: number;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  status: DocStats;
  uploadedAt: Date | string; // LocalDateTime maps to Date in TypeScript
  ownerDetails: OwnerDetails;
  sharedToUsers: UserSearchResponse[];
  availableForDownload: boolean;
  permission: string;
  availableForViewing: boolean;
  availableForSigning: boolean;
  nextUserIdsToSign: number[];
  parallel: boolean;
  downloadable: boolean;
}


export interface DocumentStatus {
  availableForSigning: boolean;
  availableForViewing: boolean;
  delete: boolean;
}

export interface DocumentTab {
  id?: string;
  elementId: string; // ID of the element in the PDF viewer that this tab is associated with
  title: string;
  pageStart: number;
  pageEnd: number;
  newEntry: boolean; // Flag to indicate if this is a newly added tabbing
}


export interface Thumbnail {
  filename: string;
  data: string;
  page: number;
  format: string;
}



export interface BookmarkItem {
  title: string;
  fromPage: number;
  toPage: number;
  signerIds?: number[],
  assignedSignersToBookmark?: Signer[];
  signaturePreferences?:SignaturePreference[]
}


export interface InitialSignerStep {
  step: number;
  userId?: string;
  user?: Signer;
  hasSigned?: boolean;
  signedAt?: string;
  parallel?: boolean;
  parallelGroup?: number;
  permission?: string;
  decline?: boolean;
  proceedNext?: boolean;
  isNew?: boolean;
  signaturePreference?: 'full' | 'initial';
}

export interface SignaturePreference {
  id: number;
  signaturePreference: string
}