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
  sharedToUsers: Array<{ 
    id: string; 
    username: string; 
    email: string;
    permission?: 'view' | 'view_and_sign';
  }>;
  office?: string;
  downloadable?: boolean;
    permission?: 'view' | 'view_and_sign';
    availableForSigning?: boolean;
    availableForViewing?: boolean;
}