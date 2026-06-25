// apiTypes.ts
interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  offset: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: PaginationInfo;
}

export interface ShareRequest {
  ownerUserId: number;
  shareWithUserId: number;
}

export interface ShareSignedRequest extends ShareRequest {
  shareMessage?: string;
  allowDownload?: boolean;
  allowForwarding?: boolean;
  expiresAt?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
}