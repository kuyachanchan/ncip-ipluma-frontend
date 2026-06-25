/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from "react";
import {
  File,
  FileSignature,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  Key,
  Copy,
  RotateCw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Signature
} from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import * as Dialog from "@radix-ui/react-dialog";
import api from "@/api/axiosInstance";
import { useAuth } from "@/auth/useAuth";
import toast from "react-hot-toast";
import { GlobalWorkerOptions } from "pdfjs-dist";
import type { RenderTask } from "pdfjs-dist";
import { usePdfLoader } from "@/hooks/usePdfLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSignatureManager } from "@/hooks/useSignatureManager";
import { useFileDownload } from "@/hooks/useFileDownload";
import type { Role } from "@/types/auth";
import { useSignaturePreview } from "@/hooks/useSignaturePreview";
import { useAuthImage } from "@/hooks/useAuthImage";
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import SharedWithDialog from "@/components/SharedWithDialog";

GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

import type { PDFDocument, DocumentStatus } from '@/types/types';
import type { BookmarkItem } from '@/types/types';



// ==================== Types ====================

interface SignatureCardPreviewProps {
  previewUrl: string;
}

interface SigningProps {
  preloadedDocument?: PDFDocument;
  onClose?: () => void;
}



interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  offset: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

interface Signature {
  id: string;
  fileName: string;
  signatureType: 'INITIAL' | 'FULL';
  previewUrl: string;
  createdAt: string;
  fileSize?: number;
  default: boolean;
}

interface CertificateHash {
  certificateHash: string;
  expiresAt: string;
}


// ==================== Bookmarks Pane ====================

interface BookmarksPaneProps {
  bookmarks: BookmarkItem[];
  currentSigner: number;
  currentPage: number;
  onNavigate: (page: number) => void;
}

const BookmarksPane: React.FC<BookmarksPaneProps> = ({ bookmarks, currentSigner, currentPage, onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false);
  //const {user} = useAuth()

  return (
    <div
      className={`flex flex-col bg-white border-r border-[#A1C2BD] transition-all duration-200 shrink-0 ${collapsed ? 'w-10' : 'w-56'
        }`}
      style={{ minHeight: 0 }}
    >
      {/* Pane header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#A1C2BD] shrink-0">
        {!collapsed && (
          <span className="text-xs font-medium text-[#19183B] uppercase tracking-wide truncate">
            Bookmarks
          </span>
        )}
        <button
          onClick={() => setCollapsed(prev => !prev)}
          className="p-1 rounded hover:bg-[#E7F2EF] text-[#708993] ml-auto"
          title={collapsed ? 'Show bookmarks' : 'Hide bookmarks'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Bookmark list */}
      {!collapsed && (
        <div className="overflow-y-auto flex-1">
          {bookmarks.map((bookmark, index) => {
            const isActive = currentPage >= bookmark.fromPage && currentPage <= bookmark.toPage;
            return (
              <button
                key={index}
                onClick={() => onNavigate(bookmark.fromPage)}
                className={`w-full text-left px-3 py-2.5 text-sm border-b border-[#A1C2BD]/40 transition-colors hover:bg-[#E7F2EF] flex flex-col gap-0.5 ${isActive ? 'bg-[#E7F2EF] font-medium text-[#19183B]' : 'text-[#708993]'
                  }`}
              >

                <span className="truncate leading-snug">
                  {bookmark.title}</span>
                <span className="text-[11px] text-[#A1C2BD]">
                  {bookmark.fromPage === bookmark.toPage
                    ? `p. ${bookmark.fromPage}`
                    : `pp. ${bookmark.fromPage}–${bookmark.toPage}`}
                </span>
                {bookmark.signerIds?.includes(currentSigner) && (
                  <div className='border border-dashed border-amber-500 bg-amber-300 rounded-full font-mono font-semibold text-[8px] text-gray-600 px-3 text-center uppercase'>
                    {bookmark.signaturePreferences && bookmark.signaturePreferences.find(
                      signer => signer.id, 10 == currentSigner
                    )?.signaturePreference} signature here
                  </div>
                )}

              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ==================== Helper Components ====================

const SignatureCardPreview: React.FC<SignatureCardPreviewProps> = ({ previewUrl }) => {
  const isLocal = previewUrl.startsWith("blob:") || previewUrl.startsWith("data:");
  const { imageSrc, loading, error } = useAuthImage({ url: previewUrl });

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
      {loading && <span className="text-sm text-gray-400 animate-pulse">Loading...</span>}
      {error && <span className="text-sm text-red-500">Failed to load</span>}
      {!loading && !error && finalSrc && (
        <img src={finalSrc} alt="Preview" className="max-h-32 object-contain" />
      )}
    </>
  );
};

// ==================== Main Component ====================

const SIGNATURE_DIMENSIONS = {
  FULL: { width: 300, height: 80 },
  INITIAL: { width: 100, height: 80 },
} as const;

function Signing({ preloadedDocument, onClose }: SigningProps) {
  const [confirmedPassword, setConfirmedPassword] = useState<string>("");
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const documentFromStateRef = useRef(location.state?.document);

  const origin = location.state?.origin;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);
  const rectRef = useRef<Rect | null>(null);
  const hasInitializedRef = useRef(false);

  // ==================== State ====================

  // Drawing & Interaction State
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDraggingSignature, setIsDraggingSignature] = useState(false);
  const [isHoveringSignature, setIsHoveringSignature] = useState(false);
  const [isResizingSignature, setIsResizingSignature] = useState(false);
  const [isRotatingSignature, setIsRotatingSignature] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number; xOffset?: number; yOffset?: number } | null>(null);

  // Document State
  const [pdfFile, setPdfFile] = useState<File | Blob | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<PDFDocument | null>(null);
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [pageImage, setPageImage] = useState<HTMLImageElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(0);
  const [canvasHeight, setCanvasHeight] = useState<number>(0);

  // Signature State
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [selectedSignature, setSelectedSignature] = useState<Signature | null>(null);
  const [selectedSignatureType, setSelectedSignatureType] = useState<'INITIAL' | 'FULL' | ''>('');

  // Certificate State
  const [certHash, setCertHash] = useState<CertificateHash | null>(null);

  // Dialog State
  const [chooseFileDialogOpen, setChooseFileDialogOpen] = useState(false);
  const [chooseSignatureTypeDialogOpen, setChooseSignatureTypeDialogOpen] = useState(false);
  const [sigPasswordDialogOpen, setSigPasswordDialogOpen] = useState(false);
  const [copyModeDialogOpen, setCopyModeDialogOpen] = useState(false);
  const [finishDialogOpen, setFinishDialogOpen] = useState(false); // NEW: Finish/Sign Again dialog

  // Signature password (used when fetching signature image preview)
  const [sigPassword, setSigPassword] = useState<string>("");
  const [sigPasswordError, setSigPasswordError] = useState<string | null>(null);
  const [isLoadingSignature, setIsLoadingSignature] = useState(false);
  const pendingSignatureRef = useRef<Signature | null>(null);

  // UI State
  const [searchTerm, setSearchTerm] = useState("");
  const [copyToPages, setCopyToPages] = useState<string>("");
  const [, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [zoom, setZoom] = useState<number>(0.60);


  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    offset: 0,
  });

  // Add these back with your other Dialog State declarations
  const [sharedUsersModalOpen, setSharedUsersModalOpen] = useState(false);
  const [sharedUsersDocument, setSharedUsersDocument] = useState<PDFDocument | null>(null);

  // ==================== Hooks ====================

  const { downloadFile } = useFileDownload();
  const { user } = useAuth();
  useSignaturePreview();
  useSettings(); // keep hook alive if needed elsewhere

  const { pdf, currentPage, setCurrentPage } = usePdfLoader(pdfFile);

  const {
    signatureFile,
    signatureImg,
    signaturePlacements,
    setSignatureImg,
    setSignatureFile,
    setMultiPageMode,
    addSignaturePlacement,
    removeSignaturePlacement,
    updateSignaturePlacement,
    setSignaturePlacements,
  } = useSignatureManager();

  const currentSignaturePosition = signaturePlacements.get(currentPage) || null;


  // ADD THIS


  // ==================== Helper Functions ====================

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes);
    if (size === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parsePagesInput = (input: string, totalPages: number): number[] => {
    const pages = new Set<number>();
    const parts = input.split(',').map(s => s.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(s => parseInt(s.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
            pages.add(i);
          }
        }
      } else if (part.toLowerCase() === 'all') {
        for (let i = 1; i <= totalPages; i++) {
          pages.add(i);
        }
      } else {
        const pageNum = parseInt(part);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
          pages.add(pageNum);
        }
      }
    }

    return Array.from(pages).sort((a, b) => a - b);
  };

  // ==================== Rotation Calculations ====================

  const calculateRotatedPoint = (x: number, y: number, centerX: number, centerY: number, angle: number) => {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const translatedX = x - centerX;
    const translatedY = y - centerY;

    const rotatedX = translatedX * cos - translatedY * sin;
    const rotatedY = translatedX * sin + translatedY * cos;

    return {
      x: rotatedX + centerX,
      y: rotatedY + centerY
    };
  };


  // May 19, 2026
  const checkDocumentStatus = async (document: PDFDocument): Promise<DocumentStatus | null | undefined> => {
    try {
      const response = await api.get('v1/documents/document-status/' + document.id)
      return response.data
    } catch (error: any) {
      toast.error(error)
    }
  }

  const updateDocumentStatus = async (document: PDFDocument, isAvailable: boolean) => {
    try {
      await api.patch('v1/documents/document-status/' + document.id, {
        availableForSigning: isAvailable
      })
    } catch (error: any) {
      toast.error(error)
    }
  }



  const calculateInverseRotatedPoint = (x: number, y: number, centerX: number, centerY: number, angle: number) => {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const translatedX = x - centerX;
    const translatedY = y - centerY;

    const rotatedX = translatedX * cos + translatedY * sin;
    const rotatedY = -translatedX * sin + translatedY * cos;

    return {
      x: rotatedX + centerX,
      y: rotatedY + centerY
    };
  };

  const getRotatedCorners = (rect: Rect) => {
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    const rotation = rect.rotation || 0;

    const corners = [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.width, y: rect.y },
      { x: rect.x + rect.width, y: rect.y + rect.height },
      { x: rect.x, y: rect.y + rect.height },
    ];

    return corners.map(corner =>
      calculateRotatedPoint(corner.x, corner.y, centerX, centerY, rotation)
    );
  };

  const getRotatedBoundingBox = (rect: Rect) => {
    const corners = getRotatedCorners(rect);

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    corners.forEach(corner => {
      minX = Math.min(minX, corner.x);
      maxX = Math.max(maxX, corner.x);
      minY = Math.min(minY, corner.y);
      maxY = Math.max(maxY, corner.y);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  };

  // ==================== Drawing Functions ====================

  const drawRotatedSelectionBox = (ctx: CanvasRenderingContext2D, rect: Rect) => {
    const rotation = rect.rotation || 0;
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    ctx.strokeStyle = "#708993";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.setLineDash([]);

    const handleSize = 6;
    const handles = [
      { x: rect.x - handleSize / 2, y: rect.y - handleSize / 2, dir: "nw" },
      { x: rect.x + rect.width - handleSize / 2, y: rect.y - handleSize / 2, dir: "ne" },
      { x: rect.x - handleSize / 2, y: rect.y + rect.height - handleSize / 2, dir: "sw" },
      { x: rect.x + rect.width - handleSize / 2, y: rect.y + rect.height - handleSize / 2, dir: "se" },
      { x: rect.x + rect.width / 2 - handleSize / 2, y: rect.y - handleSize / 2, dir: "n" },
      { x: rect.x + rect.width / 2 - handleSize / 2, y: rect.y + rect.height - handleSize / 2, dir: "s" },
      { x: rect.x - handleSize / 2, y: rect.y + rect.height / 2 - handleSize / 2, dir: "w" },
      { x: rect.x + rect.width - handleSize / 2, y: rect.y + rect.height / 2 - handleSize / 2, dir: "e" },
    ];

    handles.forEach(handle => {
      ctx.fillStyle = "#19183B";
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1;
      ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
    });

    ctx.restore();

    const rotationHandleDistance = 25;
    const topCenterX = rect.x + rect.width / 2;
    const topCenterY = rect.y;

    const rotatedTopCenter = calculateRotatedPoint(topCenterX, topCenterY, centerX, centerY, rotation);
    const rotationHandleX = rotatedTopCenter.x;
    const rotationHandleY = rotatedTopCenter.y - rotationHandleDistance;

    const handleRadius = 8;
    ctx.fillStyle = "#19183B";
    ctx.beginPath();
    ctx.arc(rotationHandleX, rotationHandleY, handleRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(rotationHandleX, rotationHandleY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.font = "12px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("↻", 0, 0);
    ctx.restore();
  };

  const getCursorPosition = (x: number, y: number, rect: Rect): string => {
    const rotation = rect.rotation || 0;
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;

    const rotationHandleDistance = 25;
    const topCenterX = rect.x + rect.width / 2;
    const topCenterY = rect.y;
    const rotatedTopCenter = calculateRotatedPoint(topCenterX, topCenterY, centerX, centerY, rotation);
    const rotationHandleX = rotatedTopCenter.x;
    const rotationHandleY = rotatedTopCenter.y - rotationHandleDistance;

    const distanceToRotationHandle = Math.sqrt(
      Math.pow(x - rotationHandleX, 2) + Math.pow(y - rotationHandleY, 2)
    );
    if (distanceToRotationHandle <= 15) {
      return "rotate";
    }

    const localMouse = calculateInverseRotatedPoint(x, y, centerX, centerY, rotation);

    if (
      localMouse.x >= rect.x &&
      localMouse.x <= rect.x + rect.width &&
      localMouse.y >= rect.y &&
      localMouse.y <= rect.y + rect.height
    ) {
      const handleTolerance = 8;

      const handles = [
        { x: rect.x, y: rect.y, dir: "nw" },
        { x: rect.x + rect.width, y: rect.y, dir: "ne" },
        { x: rect.x, y: rect.y + rect.height, dir: "sw" },
        { x: rect.x + rect.width, y: rect.y + rect.height, dir: "se" },
        { x: rect.x + rect.width / 2, y: rect.y, dir: "n" },
        { x: rect.x + rect.width / 2, y: rect.y + rect.height, dir: "s" },
        { x: rect.x, y: rect.y + rect.height / 2, dir: "w" },
        { x: rect.x + rect.width, y: rect.y + rect.height / 2, dir: "e" },
      ];

      for (const handle of handles) {
        if (
          Math.abs(localMouse.x - handle.x) <= handleTolerance &&
          Math.abs(localMouse.y - handle.y) <= handleTolerance
        ) {
          return handle.dir;
        }
      }

      return "move";
    }

    return "default";
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return null;

    const canvas = canvasRef.current;
    const rectBounds = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rectBounds.width;
    const scaleY = canvas.height / rectBounds.height;

    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rectBounds.left) * scaleX;
    const y = (clientY - rectBounds.top) * scaleY;

    return { x, y };
  };

  const clampRectToCanvas = (
    proposedX: number,
    proposedY: number,
    width: number,
    height: number,
    rotation: number,
    canvasW: number,
    canvasH: number
  ): { x: number; y: number } => {
    const tentativePos: Rect = { x: proposedX, y: proposedY, width, height, rotation };
    const bb = getRotatedBoundingBox(tentativePos);

    let adjustedX = proposedX;
    let adjustedY = proposedY;

    if (bb.x < 0) adjustedX -= bb.x;
    if (bb.y < 0) adjustedY -= bb.y;
    if (bb.x + bb.width > canvasW) adjustedX -= (bb.x + bb.width - canvasW);
    if (bb.y + bb.height > canvasH) adjustedY -= (bb.y + bb.height - canvasH);

    return { x: adjustedX, y: adjustedY };
  };

  const drawCanvas = ({ x, y }: { x: number; y: number }) => {
    if (!canvasRef.current || !pageImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(pageImage, 0, 0);

    const sigPos = currentSignaturePosition;

    if (isRotatingSignature && sigPos && startPos && signatureImg) {
      const centerX = sigPos.x + sigPos.width / 2;
      const centerY = sigPos.y + sigPos.height / 2;

      const startAngle = Math.atan2(startPos.y - centerY, startPos.x - centerX);
      const currentAngle = Math.atan2(y - centerY, x - centerX);
      const angleDiff = currentAngle - startAngle;
      const angleDiffDeg = angleDiff * (180 / Math.PI);
      const newRotation = ((sigPos.rotation || 0) + angleDiffDeg) % 360;
      const snappedRotation = Math.round(newRotation / 15) * 15;

      const newPos = { ...sigPos, rotation: snappedRotation };

      const newCenterX = newPos.x + newPos.width / 2;
      const newCenterY = newPos.y + newPos.height / 2;

      ctx.save();
      ctx.translate(newCenterX, newCenterY);
      ctx.rotate((snappedRotation * Math.PI) / 180);
      ctx.translate(-newCenterX, -newCenterY);
      ctx.drawImage(signatureImg, newPos.x, newPos.y, newPos.width, newPos.height);
      ctx.restore();

      drawRotatedSelectionBox(ctx, newPos);
      updateSignaturePlacement(currentPage, newPos);
      setStartPos({ x, y });
      return;
    }

    if (isResizingSignature && sigPos && startPos && signatureImg && resizeDirection) {
      const aspectRatio = sigPos.width / sigPos.height;
      const rotation = sigPos.rotation || 0;
      const centerX = sigPos.x + sigPos.width / 2;
      const centerY = sigPos.y + sigPos.height / 2;

      const localMouse = calculateInverseRotatedPoint(x, y, centerX, centerY, rotation);
      const localStart = calculateInverseRotatedPoint(startPos.x, startPos.y, centerX, centerY, rotation);

      let newWidth = sigPos.width;
      let newHeight = sigPos.height;
      let newX = sigPos.x;
      let newY = sigPos.y;

      const deltaX = localMouse.x - localStart.x;
      const deltaY = localMouse.y - localStart.y;

      switch (resizeDirection) {
        case 'se': {
          const delta = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : deltaY * aspectRatio;
          newWidth = Math.max(20, sigPos.width + delta);
          newHeight = newWidth / aspectRatio;
          break;
        }
        case 'sw': {
          const delta = Math.abs(deltaX) >= Math.abs(deltaY) ? -deltaX : deltaY * aspectRatio;
          newWidth = Math.max(20, sigPos.width + delta);
          newHeight = newWidth / aspectRatio;
          newX = sigPos.x + (sigPos.width - newWidth);
          break;
        }
        case 'ne': {
          const delta = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : -deltaY * aspectRatio;
          newWidth = Math.max(20, sigPos.width + delta);
          newHeight = newWidth / aspectRatio;
          newY = sigPos.y - (newHeight - sigPos.height);
          break;
        }
        case 'nw': {
          const delta = Math.abs(deltaX) >= Math.abs(deltaY) ? -deltaX : -deltaY * aspectRatio;
          newWidth = Math.max(20, sigPos.width + delta);
          newHeight = newWidth / aspectRatio;
          newX = sigPos.x + (sigPos.width - newWidth);
          newY = sigPos.y - (newHeight - sigPos.height);
          break;
        }
        case 'n': {
          newHeight = Math.max(20, sigPos.height - deltaY);
          newWidth = newHeight * aspectRatio;
          newX = sigPos.x + (sigPos.width - newWidth) / 2;
          newY = sigPos.y + (sigPos.height - newHeight);
          break;
        }
        case 's': {
          newHeight = Math.max(20, sigPos.height + deltaY);
          newWidth = newHeight * aspectRatio;
          newX = sigPos.x + (sigPos.width - newWidth) / 2;
          break;
        }
        case 'w': {
          newWidth = Math.max(20, sigPos.width - deltaX);
          newHeight = newWidth / aspectRatio;
          newX = sigPos.x + (sigPos.width - newWidth);
          newY = sigPos.y + (sigPos.height - newHeight) / 2;
          break;
        }
        case 'e': {
          newWidth = Math.max(20, sigPos.width + deltaX);
          newHeight = newWidth / aspectRatio;
          newY = sigPos.y + (sigPos.height - newHeight) / 2;
          break;
        }
      }

      const clamped = clampRectToCanvas(newX, newY, newWidth, newHeight, rotation, canvas.width, canvas.height);
      newX = clamped.x;
      newY = clamped.y;

      const newPos = { ...sigPos, x: newX, y: newY, width: newWidth, height: newHeight, rotation };

      const finalCenterX = newPos.x + newPos.width / 2;
      const finalCenterY = newPos.y + newPos.height / 2;

      ctx.save();
      ctx.translate(finalCenterX, finalCenterY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-finalCenterX, -finalCenterY);
      ctx.drawImage(signatureImg, newPos.x, newPos.y, newPos.width, newPos.height);
      ctx.restore();

      drawRotatedSelectionBox(ctx, newPos);
      updateSignaturePlacement(currentPage, newPos);
      setStartPos({ x, y });
      return;
    }

    if (isDraggingSignature && sigPos && startPos && signatureImg) {
      const rotation = sigPos.rotation || 0;

      const newCenterX = x - (startPos.xOffset ?? 0);
      const newCenterY = y - (startPos.yOffset ?? 0);

      const newX = newCenterX - sigPos.width / 2;
      const newY = newCenterY - sigPos.height / 2;

      const clamped = clampRectToCanvas(newX, newY, sigPos.width, sigPos.height, rotation, canvas.width, canvas.height);

      const clampedCenterX = clamped.x + sigPos.width / 2;
      const clampedCenterY = clamped.y + sigPos.height / 2;

      const newPos = { ...sigPos, x: clamped.x, y: clamped.y, rotation };

      ctx.save();
      ctx.translate(clampedCenterX, clampedCenterY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-clampedCenterX, -clampedCenterY);
      ctx.drawImage(signatureImg, newPos.x, newPos.y, newPos.width, newPos.height);
      ctx.restore();

      drawRotatedSelectionBox(ctx, newPos);
      updateSignaturePlacement(currentPage, newPos);
      return;
    }

    if (sigPos && signatureImg) {
      const rotation = sigPos.rotation || 0;
      const centerX = sigPos.x + sigPos.width / 2;
      const centerY = sigPos.y + sigPos.height / 2;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
      ctx.drawImage(signatureImg, sigPos.x, sigPos.y, sigPos.width, sigPos.height);
      ctx.restore();

      if (isHoveringSignature || isDraggingSignature || isResizingSignature || isRotatingSignature) {
        drawRotatedSelectionBox(ctx, sigPos);
      }
    }

    if (isDrawing && startPos) {
      const rawW = x - startPos.x;
      const rawH = y - startPos.y;
      const selX = rawW >= 0 ? startPos.x : startPos.x + rawW;
      const selY = rawH >= 0 ? startPos.y : startPos.y + rawH;
      const selW = Math.abs(rawW);
      const selH = Math.abs(rawH);

      ctx.strokeStyle = "#708993";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(selX, selY, selW, selH);
      ctx.setLineDash([]);
      rectRef.current = { x: selX, y: selY, width: selW, height: selH };
    }
  };

  // ==================== Event Handlers ====================

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    const { x, y } = coords;
    const sigPos = signaturePlacements.get(currentPage) || null;

    if (sigPos && signatureImg) {
      const cursorPos = getCursorPosition(x, y, sigPos);

      if (cursorPos === "rotate") {
        setIsRotatingSignature(true);
        setIsHoveringSignature(true);
        setStartPos({ x, y });
        if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
        if ('touches' in e) e.preventDefault();
        return;
      }

      if (cursorPos === "move") {
        setIsDraggingSignature(true);

        const centerX = sigPos.x + sigPos.width / 2;
        const centerY = sigPos.y + sigPos.height / 2;

        const offsetX = x - centerX;
        const offsetY = y - centerY;

        setStartPos({ x: centerX, y: centerY, xOffset: offsetX, yOffset: offsetY });
        if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
        if ('touches' in e) e.preventDefault();
        return;
      }

      if (["nw", "ne", "sw", "se", "n", "s", "e", "w"].includes(cursorPos)) {
        setIsResizingSignature(true);
        setResizeDirection(cursorPos);
        setStartPos({ x, y });

        if (canvasRef.current) {
          const cursorMap: Record<string, string> = {
            "nw": "nw-resize", "ne": "ne-resize",
            "sw": "sw-resize", "se": "se-resize",
            "n": "n-resize", "s": "s-resize",
            "e": "e-resize", "w": "w-resize",
          };
          canvasRef.current.style.cursor = cursorMap[cursorPos] || 'default';
        }

        if ('touches' in e) e.preventDefault();
        return;
      }
    }

    if (sigPos && signatureImg) return;

    setStartPos({ x, y });
    setIsDrawing(true);
    if (canvasRef.current) canvasRef.current.style.cursor = 'crosshair';
    if ('touches' in e) e.preventDefault();
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    const { x, y } = coords;
    const sigPos = signaturePlacements.get(currentPage) || null;

    if (sigPos && signatureImg) {
      const cursorPos = getCursorPosition(x, y, sigPos);

      if (!isDraggingSignature && !isResizingSignature && !isRotatingSignature && !isDrawing) {
        const cursorMap: Record<string, string> = {
          "rotate": "grab", "move": "grab",
          "nw": "nw-resize", "ne": "ne-resize",
          "sw": "sw-resize", "se": "se-resize",
          "n": "n-resize", "s": "s-resize",
          "e": "e-resize", "w": "w-resize",
          "default": "default"
        };

        if (canvasRef.current) {
          canvasRef.current.style.cursor = cursorMap[cursorPos] || 'default';
        }

        setIsHoveringSignature(cursorPos !== "default");
      }
    } else {
      setIsHoveringSignature(false);
      if (canvasRef.current && !isDrawing) {
        canvasRef.current.style.cursor = 'default';
      }
    }

    drawCanvas({ x, y });

    if (('touches' in e) && (isDraggingSignature || isResizingSignature || isRotatingSignature || isDrawing)) {
      e.preventDefault();
    }
  };

  const handlePointerUp = () => {
    if (isRotatingSignature) {
      setIsRotatingSignature(false);
      setStartPos(null);
      return;
    }

    if (isResizingSignature) {
      setIsResizingSignature(false);
      setResizeDirection(null);
      setStartPos(null);
      return;
    }

    if (isDraggingSignature) {
      setIsDraggingSignature(false);
      setStartPos(null);
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);
      setStartPos(null);
    }
  };

  const handleRotateSignature = () => {
    const sigPos = signaturePlacements.get(currentPage);
    if (sigPos && signatureImg) {
      const currentRotation = sigPos.rotation || 0;
      const newRotation = (currentRotation + 90) % 360;

      const newPos = { ...sigPos, rotation: newRotation };
      updateSignaturePlacement(currentPage, newPos);
      toast.success(`Signature rotated to ${newRotation}°`);
    }
  };

  const handleResizeToOriginal = () => {
    const sigPos = signaturePlacements.get(currentPage);
    if (sigPos && signatureImg && selectedSignature) {
      const { width: originalWidth, height: originalHeight } = SIGNATURE_DIMENSIONS[selectedSignature.signatureType];

      const newPos = { ...sigPos, width: originalWidth, height: originalHeight };
      updateSignaturePlacement(currentPage, newPos);
      toast.success("Signature resized to default dimensions");
    }
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    if (pdf) {
      setCurrentPage((prev) => Math.min(pdf.numPages, prev + 1));
    }
  };

  const handleRemoveSignature = () => {
    removeSignaturePlacement(currentPage);
    if (signaturePlacements.size === 1) {
      setSignatureImg(null);
      setMultiPageMode(false);
    }
  };

  const handleCopyToPages = () => {
    if (!currentSignaturePosition || !pdf) return;
    setCopyModeDialogOpen(true);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(3, parseFloat((prev + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoom(prev => Math.max(0.25, parseFloat((prev - 0.25).toFixed(2))));

  const handleCopyConfirm = () => {
    if (!currentSignaturePosition || !pdf) return;

    const pages = parsePagesInput(copyToPages, pdf.numPages);

    if (pages.length === 0) {
      toast.error("No valid pages specified");
      return;
    }

    const newPlacements = new Map(signaturePlacements);
    let copiedCount = 0;

    pages.forEach(pageNum => {
      if (pageNum !== currentPage) {
        newPlacements.set(pageNum, { ...currentSignaturePosition });
        copiedCount++;
      }
    });

    if (copiedCount === 0) {
      toast.error("No new pages to copy to (current page excluded)");
      return;
    }

    setSignaturePlacements(newPlacements);
    setCopyModeDialogOpen(false);
    setCopyToPages("");
    setMultiPageMode(true);
    toast.success(`Signature copied to ${copiedCount} page(s)`);
  };

  // ==================== API Functions ====================

  const loadDocumentForSigning = async (doc: PDFDocument) => {
    setIsLoadingPdf(true);
    try {
      setSelectedDocument(doc);

      console.log('Loading PDF:', doc.filePath);

      const response = await api.get(`v1/documents/view/${doc.filePath}`, {
        responseType: 'blob',
        timeout: 120000,
      });

      let pdfBlob = response.data;

      if (!(pdfBlob instanceof Blob)) {
        console.error('Response is not a blob:', pdfBlob);
        throw new Error('Invalid response format from server');
      }

      console.log('PDF Blob received:', {
        size: pdfBlob.size,
        type: pdfBlob.type,
        url: doc.filePath
      });

      if (pdfBlob.size === 0) {
        throw new Error('Received empty PDF file');
      }

      try {
        const buffer = await pdfBlob.slice(0, 4).arrayBuffer();
        const header = new Uint8Array(buffer);
        const isPDF = header[0] === 0x25 && header[1] === 0x50 &&
          header[2] === 0x44 && header[3] === 0x46;

        if (!isPDF) {
          console.error('Invalid PDF header:', Array.from(header));
          pdfBlob = new Blob([pdfBlob], { type: 'application/pdf' });
        }
      } catch (err) {
        console.warn('Could not validate PDF header:', err);
      }

      setPdfFile(pdfBlob);
      setSignaturePlacements(new Map());
      setSignatureImg(null);
      setCurrentPage(1);

    } catch (error: any) {
      console.error('Error loading PDF:', error);

      let errorMessage = 'Failed to load PDF document';
      if (error.response) {
        errorMessage += `: Server responded with ${error.response.status}`;
      } else if (error.request) {
        errorMessage += ': No response from server';
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }

      toast.error(errorMessage);
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const loadDocumentById = async (documentId: string) => {
    try {
      const response = await api.get(`v1/documents/${documentId}`);
      await loadDocumentForSigning(response.data);
      return response.data;
    } catch (error) {
      toast.error('Failed to load document');
      throw error;
    }
  };

  const loadDefaultCert = async () => {
    try {
      const response = await api.get("v1/certificates/default", { params: { user_id: user?.id } });
      const data = response.data;
      if (isExpired(data.expiresAt)) {
        toast.error("Expired default certificate");
        return;
      }
      setCertHash(data);
    } catch {
      toast.error("No default certificate found");
    }
  };

  const loadSignatures = async (userId: string | null, userRoles: Role[], type: any) => {
    try {
      const params = {
        user_id: userId,
        user_roles: userRoles,
        type: null,
        only_defaults: true
      };

      if (type) {
        params.type = type;
      }

      const response = await api.get("v1/signatures", { params });
      setSignatures(response.data);
    } catch (error) {
      console.error("Error loading signatures:", error);
    }
  };

  const loadDocuments = async (page = 1, search = "") => {
    try {
      const params = {
        page: page,
        limit: pagination.itemsPerPage,
        offset: pagination.offset,
        user_id: user?.id,
        user_roles: '',
        search: search,
      };
      const response = await api.get("v1/documents", { params });
      const data = response.data;
      setDocuments(data.data);

      setPagination((prev) => ({
        ...prev,
        currentPage: page,
        totalItems: data.pagination.totalItems,
        totalPages: data.pagination.totalPages,
        offset: (page - 1) * pagination.itemsPerPage,
      }));
    } catch (error) {
      toast.error(`Error fetching: ${error}`);
    }
  };

  const resetAfterSuccess = () => {
    setPdfFile(null);
    setSelectedDocument(null);
    setSignaturePlacements(new Map());
    setSignatureImg(null);
    setSignatureFile(null);
    setSelectedSignature(null);
    setSelectedSignatureType('');
    rectRef.current = null;
    setCurrentPage(1);
    setSigPassword("");
    setConfirmedPassword("");
    setError(null);

    navigate(origin);
  };

  // Updated handleSubmit to show dialog first
  const handleSubmit = async () => {
    if (signaturePlacements.size === 0 || !signatureFile || !pdfFile) {
      toast.error("Please select a signature and place it on the document");
      return;
    }

    // Show the confirmation dialog
    setFinishDialogOpen(true);
  };

  // New function to handle "Yes, I'm finished signing"
  const handleConfirmSigning = async () => {
    setFinishDialogOpen(false);
    
    // Use the confirmed password that was stored during signature selection
    if (!confirmedPassword) {
      toast.error("Certificate password is required. Please select your signature again.");
      return;
    }

    await handlePasswordConfirm(confirmedPassword, false);
  };

  // New function to handle "No, I need to sign again"
  const handleSignAgain = async () => {
    setFinishDialogOpen(false);
    // Clear the signature placement but keep the signature selected
    // Use the confirmed password that was stored during signature selection
    if (!confirmedPassword) {
      toast.error("Certificate password is required. Please select your signature again.");
      return;
    }

    await handlePasswordConfirm(confirmedPassword, true);
  };


  const handlePasswordConfirm = async (password: string, notDoneSigning: boolean) => {
    if (!password) {
      toast.error("Please enter your certificate password");
      return;
    }

    if (signaturePlacements.size === 0 || !signatureFile || !pdfFile) {
      toast.error("Please select a signature and place it on the document");
      return;
    }

    setVerifying(true);
    setError(null);

    const formData = new FormData();
    formData.append("documentId", selectedDocument?.id || "");
    formData.append("documentFileName", selectedDocument?.fileName || "");
    formData.append("pdf_document", pdfFile!);
    formData.append("password", password);
    formData.append("canvasWidth", canvasWidth.toString());
    formData.append("canvasHeight", canvasHeight.toString());
    formData.append("location", "Unknown Location");

    if (selectedDocument?.fileName) formData.append("original_filename", selectedDocument.fileName);
    if (user?.id) formData.append("user_id", user.id);

    if (signatureFile) {
      formData.append("signature_image", signatureFile);
    }

    if (certHash?.certificateHash) formData.append("certificate_hash", certHash.certificateHash);

    if (selectedSignature?.signatureType) {
      formData.append("signature_type", selectedSignature.signatureType);
    }

    if (selectedSignature?.signatureType && selectedSignature.signatureType.toString() === 'INITIAL') {
      formData.append("isInitial", "true");
    } else {
      formData.append("isInitial", "false");
    }

    if (notDoneSigning) {
      formData.append("notDoneSigning","true")
    } else {
      formData.append("notDoneSigning","false")
    }

    const placementsArray = Array.from(signaturePlacements.entries()).map(
      ([page, rect]) => ({
        pageNumber: page,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        rotation: rect.rotation || 0,
      })
    );

    formData.append("signaturePlacements", JSON.stringify(placementsArray));

    try {
      const response = await api.post("v1/sign-document", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;

      if (data.signedFile) {
        await downloadFile(data.signedFile);
        toast.success(`Document signed successfully! Signed on ${signaturePlacements.size} page(s)`);
        resetAfterSuccess();
      } else {
        toast.error(data.error || "Verification failed");
      }
    } catch (err: any) {
      if (err.response) {
        if (err.response.status === 400) {
          const errorMessage = err.response.data?.message || err.response.data?.error || "Bad request";
          toast.error(errorMessage);
          setError(errorMessage);
          console.error("Certificate error details:", err.response.data);
        } else if (err.response.status === 403) {
          toast.error("Access denied — you do not have permission to sign this document.");
          setError("Access denied — you do not have permission to sign this document.");
        } else if (err.response.status === 401) {
          toast.error("Invalid certificate password. Please try again.");
          setError("Invalid certificate password. Please try again.");
        } else {
          const errorMessage = err.response.data?.message || err.response.data?.error || `HTTP error! status: ${err.response.status}`;
          toast.error(errorMessage);
          setError(errorMessage);
        }
      } else if (err.request) {
        toast.error("No response from server. Please check your connection.");
        setError("No response from server. Please check your connection.");
      } else {
        toast.error("Error connecting to server: " + err.message);
        setError("Error connecting to server: " + err.message);
      }
    } finally {
      if (selectedDocument) {
        updateDocumentStatus(selectedDocument, true)
      }

      setVerifying(false);
    }
  };


  const handleChooseSignatureType = () => {
    if (!selectedDocument && !preloadedDocument) {
      toast.error("Please load PDF Document first.");
      return;
    }
    setChooseSignatureTypeDialogOpen(true);
  };

  const handleOpenDocument = async () => {
    if (!selectedDocument) return;

    setIsLoadingPdf(true);
    try {
      const response = await api.get("v1/documents/view/" + selectedDocument.filePath, {
        responseType: 'blob'
      });

      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });

      setPdfFile(pdfBlob);
      setChooseFileDialogOpen(false);
      setSearchTerm("");

      setSignaturePlacements(new Map());
      setSignatureImg(null);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Failed to load PDF document');
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadDocuments(1, searchTerm);
  };

  const handleSelectDocument = (document: PDFDocument) => {
    setSelectedDocument(document);
  };

  const handleSignatureSelection = async (signature: Signature, password: string) => {
    setIsLoadingSignature(true);
    setSigPasswordError(null);
    try {
      const response = await api.get(`v1/signatures/${signature.id}/image`, {
        params: {
          initial: signature.signatureType === 'FULL' ? false : true,
          certificateHash: certHash?.certificateHash ?? '',
          password: password,
        },
        responseType: 'blob'
      });

      const signatureBlob = new Blob([response.data], { type: 'image/png' });

      setSignatureFile(signatureBlob as any);

      const img = new Image();
      const url = URL.createObjectURL(signatureBlob);
      img.src = url;

      img.onload = () => {
        setSignatureImg(img);

        const { width: initialWidth, height: initialHeight } = SIGNATURE_DIMENSIONS[signature.signatureType];

        const defaultRect: Rect = {
          x: 100,
          y: 100,
          width: initialWidth,
          height: initialHeight,
          rotation: 0
        };

        rectRef.current = defaultRect;
        addSignaturePlacement(currentPage, { ...defaultRect, rotation: defaultRect.rotation ?? 0 });

        if (canvasRef.current && pageImage) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.drawImage(pageImage, 0, 0);
            ctx.drawImage(img, defaultRect.x, defaultRect.y, defaultRect.width, defaultRect.height);
            drawRotatedSelectionBox(ctx, defaultRect);
          }
        }
      };

      img.onerror = () => {
        console.error('Failed to load signature image');
        toast.error('Failed to load signature image');
      };

      setSelectedSignature(signature);
      setConfirmedPassword(password);
      setSigPasswordDialogOpen(false);
      setChooseSignatureTypeDialogOpen(false);
      setSigPassword("");
      pendingSignatureRef.current = null;
      toast.success(`${signature.signatureType} signature selected`);
      setTimeout(() => {
        canvasScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);

    } catch (err: any) {
      console.error('Error loading signature:', err);
      if (err.response?.status === 401) {
        setSigPasswordError("Invalid certificate password. Please try again.");
      } else {
        setSigPasswordError("Failed to load signature. Please check your password.");
      }
    } finally {
      setIsLoadingSignature(false);
    }
  };

  // ==================== Effects ====================

  useEffect(() => {
    const initializeDocument = async () => {
      if (hasInitializedRef.current) return;
      setIsInitializing(true);
      hasInitializedRef.current = true;

      const documentFromState = documentFromStateRef.current;

      try {
        let loadedDocument = null;

        if (preloadedDocument) {
          await loadDocumentForSigning(preloadedDocument);
          loadedDocument = preloadedDocument;
          setSharedUsersDocument(preloadedDocument);
          setSharedUsersModalOpen(true);
        } else if (documentFromState) {
          await loadDocumentForSigning(documentFromState);
          loadedDocument = documentFromState;
          setSharedUsersDocument(documentFromState);
          setSharedUsersModalOpen(true);
        } else if (id) {
          const doc = await loadDocumentById(id);
          loadedDocument = doc;
          setSharedUsersDocument(doc);
          setSharedUsersModalOpen(true);
        }

        if (loadedDocument) {
          const status = await checkDocumentStatus(loadedDocument);
          if (status && !status.availableForSigning) {
            toast.error("This document is currently open for signing by another user.")
            toast.error("Document is not available at this time.")
            hasInitializedRef.current = false;
            navigate(origin)
          }

          if (status && status.availableForSigning) {
            await updateDocumentStatus(loadedDocument, false)
          }
        }

      } catch (error) {
        console.error('Error initializing document:', error);
        hasInitializedRef.current = false;
      } finally {
        setIsInitializing(false);
      }
    };

    initializeDocument();
  }, [id, preloadedDocument]);

  useEffect(() => {
    loadDefaultCert();
  }, []);

  useEffect(() => {
    if (user?.id && user?.roles) {
      loadSignatures(user.id, user?.roles, null);
    }
  }, []);

  useEffect(() => {
    if (chooseFileDialogOpen) {
      loadDocuments();
    }
  }, [chooseFileDialogOpen]);

  useEffect(() => {
    return () => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }

      if (signatureImg) {
        URL.revokeObjectURL(signatureImg.src);
      }

      if (pageImage) {
        URL.revokeObjectURL(pageImage.src);
      }
    };
  }, [signatureImg, pageImage]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) {
      return;
    }

    let renderTask: RenderTask | null = null;
    let isMounted = true;

    const renderPage = async () => {
      try {
        const page = await pdf.getPage(currentPage);
        const desiredWidth = 1400;
        const originalViewport = page.getViewport({ scale: 1 });
        const scale = desiredWidth / originalViewport.width;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || !isMounted) return;
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        setCanvasWidth(viewport.width);
        setCanvasHeight(viewport.height);

        context.clearRect(0, 0, canvas.width, canvas.height);

        if (renderTask) {
          try {
            renderTask.cancel();
          } catch (e) {
            // Ignore cancellation errors
          }
        }

        renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        });

        await renderTask.promise;

        if (!isMounted) return;

        const img = new Image();
        img.onload = () => {
          if (isMounted) {
            setPageImage(img);
          }
        };
        img.src = canvas.toDataURL();

      } catch (error: any) {
        if (error instanceof Error &&
          (error.name === 'RenderingCancelledException' ||
            error.message?.includes('cancel') ||
            error.message?.includes('destroyed'))) {
          console.log('Render cancelled or PDF destroyed');
        } else {
          console.error('Error rendering PDF:', error);
        }
      }
    };

    renderPage();

    return () => {
      isMounted = false;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch (e) {
          // Ignore cancellation errors
        }
        renderTask = null;
      }
    };
  }, [pdf, currentPage]);

  useEffect(() => {
    if (!canvasRef.current || !pageImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(pageImage, 0, 0);

    const sigPos = signaturePlacements.get(currentPage);
    if (sigPos && signatureImg) {
      const rotation = sigPos.rotation || 0;
      const centerX = sigPos.x + sigPos.width / 2;
      const centerY = sigPos.y + sigPos.height / 2;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
      ctx.drawImage(signatureImg, sigPos.x, sigPos.y, sigPos.width, sigPos.height);
      ctx.restore();

      if (isHoveringSignature || isDraggingSignature || isResizingSignature || isRotatingSignature) {
        drawRotatedSelectionBox(ctx, sigPos);
      }
    }
  }, [pageImage, currentPage, signaturePlacements, signatureImg, isHoveringSignature, isDraggingSignature, isResizingSignature, isRotatingSignature]);

  useEffect(() => {
    const handleMouseLeave = () => {
      setIsDraggingSignature(false);
      setIsDrawing(false);
      setIsHoveringSignature(false);
      setIsResizingSignature(false);
      setIsRotatingSignature(false);
      setResizeDirection(null);
      setStartPos(null);
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mouseleave', handleMouseLeave);
      canvas.addEventListener('touchcancel', handleMouseLeave);
      return () => {
        canvas.removeEventListener('mouseleave', handleMouseLeave);
        canvas.removeEventListener('touchcancel', handleMouseLeave);
      };
    }
  }, []);

  // ==================== Render ====================

  return (
    <>
      {(isInitializing || isLoadingPdf) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#19183B] mx-auto"></div>
            <p className="mt-4 text-center">
              {isInitializing ? 'Loading document...' : 'Loading PDF content...'}
            </p>
          </div>
        </div>
      )}

      <div className="relative min-h-screen overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-md"
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)`,
          }}
        ></div>

        <div className="absolute inset-0 bg-black/30"></div>

        <div className="relative p-6 max-w-12xl mx-auto flex items-center justify-center min-h-screen">
          <div
            id="content"
            className="relative bg-white rounded-xl shadow-sm border border-[#A1C2BD] overflow-hidden w-full flex flex-col"
            style={{ height: "calc(100vh - 3rem)" }}
          >
            {/* Header */}
            <div className="bg-white border-b border-[#A1C2BD] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#A1C2BD] rounded-lg">
                  <File className="w-6 h-6 text-[#19183B]" />
                </div>
                <div>
                  <p className="text-[#708993] text-sm">
                    {selectedDocument ? selectedDocument.fileName : "No document selected"}
                    {isLoadingPdf && " (Loading...)"}
                  </p>
                </div>
              </div>

              {/* Close Button — navigates back to /my-documents */}
              <button
                onClick={() => {
                  if (onClose) {
                    onClose();
                  } else {
                    navigate(origin);
                  }

                  if (selectedDocument) {
                    updateDocumentStatus(selectedDocument, true);
                  }

                }}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-[#708993] hover:text-red-500 transition-colors" />
              </button>
            </div>

            {/* PDF Navigation and Controls */}
            {pdf && selectedDocument && (
              <div className="bg-white border-b border-[#A1C2BD] p-3 flex flex-col gap-3">
                {/* Row 1: Page Navigation */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      onClick={handlePreviousPage}
                      disabled={currentPage <= 1}
                      variant="outline"
                      className="border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF] px-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <span className="text-sm font-medium text-[#19183B] whitespace-nowrap">
                      Page {currentPage} of {pdf.numPages}
                    </span>

                    <Button
                      onClick={handleNextPage}
                      disabled={currentPage >= pdf.numPages}
                      variant="outline"
                      className="border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF] px-2"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>

                    <Input
                      type="number"
                      min="1"
                      max={pdf.numPages}
                      value={currentPage}
                      onChange={(e) => {
                        const page = Math.max(1, Math.min(pdf.numPages, parseInt(e.target.value) || 1));
                        setCurrentPage(page);
                      }}
                      className="w-16 text-center border-[#A1C2BD] focus:ring-[#708993]"
                    />
                  </div>

                  {/* Always-visible: Select Signature Type + Finish Signing */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      onClick={handleChooseSignatureType}
                      variant="outline"
                      className="border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF] px-2 sm:px-4"
                    >
                      <span className="hidden sm:inline">Sign</span>
                    </Button>

                    <Button
                      onClick={handleSubmit}
                      disabled={signaturePlacements.size === 0 || selectedDocument === null}
                      className="bg-[#19183B] hover:bg-[#708993] text-white px-2 sm:px-4"
                    >
                      {verifying ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white sm:mr-2 inline-block" />
                          <span className="hidden sm:inline">Signing...</span>
                        </>
                      ) : (
                        <>
                          <span className="sm:hidden">Save</span>
                          <span className="hidden sm:inline">Save</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Row 2: Signature action buttons (only when signature is placed) */}
                {currentSignaturePosition && signatureImg && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      onClick={handleRotateSignature}
                      variant="outline"
                      className="border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF] px-2 sm:px-4 text-xs sm:text-sm"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Rotate</span>
                    </Button>

                    <Button
                      onClick={handleResizeToOriginal}
                      variant="outline"
                      className="border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF] px-2 sm:px-4 text-xs sm:text-sm"
                      title="Reset to original size"
                    >
                      <Maximize2 className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Reset Size</span>
                    </Button>

                    <Button
                      onClick={handleCopyToPages}
                      variant="outline"
                      className="border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF] px-2 sm:px-4 text-xs sm:text-sm"
                    >
                      <Copy className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Copy to Pages</span>
                    </Button>

                    <Button
                      onClick={handleRemoveSignature}
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50 px-2 sm:px-4 text-xs sm:text-sm"
                    >
                      <X className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Remove Signature</span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Canvas Area */}


            <div
              className="flex overflow-hidden bg-gray-400"
              style={{ flex: '1 1 0', minHeight: 0 }}
            >
              {/* Bookmarks Navigation Pane */}
              {pdf && selectedDocument && selectedDocument.bookmarks && selectedDocument.bookmarks.length > 0 && (
                <BookmarksPane
                  bookmarks={selectedDocument.bookmarks}
                  currentPage={currentPage}
                  currentSigner={parseInt(user?.id ?? '0', 10)}
                  onNavigate={(page) => setCurrentPage(page)}
                />
              )}

              {/* Scrollable Canvas */}
              <div
                ref={canvasScrollRef}
                className="overflow-y-auto overflow-x-auto p-6 flex-1"
              >
                {/* Zoom Controls */}
                {pdf && selectedDocument && (
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <button
                      onClick={handleZoomOut}
                      disabled={zoom <= 0.25}
                      className="p-1.5 bg-white rounded-lg shadow hover:bg-[#E7F2EF] disabled:opacity-40 transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4 text-[#19183B]" />
                    </button>
                    <span className="text-white text-sm font-medium w-14 text-center select-none">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      disabled={zoom >= 3}
                      className="p-1.5 bg-white rounded-lg shadow hover:bg-[#E7F2EF] disabled:opacity-40 transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4 text-[#19183B]" />
                    </button>
                  </div>
                )}

                <div className="flex justify-center">
                  {!selectedDocument ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[#708993]">
                      <File className="w-16 h-16 mb-4 text-white" />
                      <p className="text-lg text-white">Choose a PDF document to get started</p>
                    </div>
                  ) : isLoadingPdf ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[#708993]">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A1C2BD]"></div>
                      <p className="text-lg mt-4">Loading PDF...</p>
                    </div>
                  ) : !pdf ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[#708993]">
                      <File className="w-16 h-16 mb-4" />
                      <p className="text-lg">Failed to load PDF</p>
                    </div>
                  ) : (
                    <div
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.15s ease',
                        width: '100%',
                        marginBottom: zoom > 1 ? `${(zoom - 1) * 100}%` : 0,
                      }}
                    >
                      <canvas
                        ref={canvasRef}
                        onMouseDown={handlePointerDown}
                        onMouseMove={handlePointerMove}
                        onMouseUp={handlePointerUp}
                        onTouchStart={handlePointerDown}
                        onTouchMove={handlePointerMove}
                        onTouchEnd={handlePointerUp}
                        className="border border-[#A1C2BD] touch-none"
                        style={{
                          cursor: isHoveringSignature ? 'grab' : isDrawing ? 'crosshair' : 'default',
                          display: 'block',
                          maxWidth: '100%',
                          width: '100%'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>





          </div>
        </div>
      </div>

      {/* File Dialog */}
      <Dialog.Root open={chooseFileDialogOpen} onOpenChange={setChooseFileDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] p-6 border-2 border-[#A1C2BD] flex flex-col">
            <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B] mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <File className="w-6 h-6 text-[#19183B]" />
              </div>
              Choose File
            </Dialog.Title>

            <p className="text-[#708993] mb-6">
              Select the file to be loaded in the signature canvas from your uploaded PDF document.
            </p>

            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#708993] w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:outline-none focus:border-[#19183B]"
                />
              </div>
            </form>

            <div className="flex-1 overflow-y-auto mb-6">
              <div className="space-y-3">
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-[#708993]">No documents found</div>
                ) : (
                  documents.map((document) => (
                    <div
                      key={document.id}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedDocument?.id === document.id
                        ? "border-[#19183B] bg-[#E7F2EF]"
                        : "border-[#A1C2BD] hover:border-[#19183B]"
                        }`}
                      onClick={() => handleSelectDocument(document)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <File className="w-8 h-8 text-[#19183B]" />
                          <div>
                            <h3 className="font-semibold">{document.fileName}</h3>
                            <div className="text-sm text-[#708993] flex gap-3">
                              <span>{formatFileSize(document.fileSize)}</span>
                              <span>{formatDate(document.uploadedAt)}</span>
                            </div>
                          </div>
                        </div>
                        <button className="p-2 hover:bg-[#A1C2BD] rounded-lg">
                          <Eye className="w-5 h-5 text-[#19183B]" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setChooseFileDialogOpen(false);
                  setSelectedDocument(null);
                  setSearchTerm("");
                }}
                className="flex-1 px-6 py-3 border-2 border-[#A1C2BD] rounded-xl"
              >
                Cancel
              </button>

              <button
                onClick={handleOpenDocument}
                disabled={!selectedDocument || isLoadingPdf}
                className="flex-1 px-6 py-3 bg-[#19183B] text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoadingPdf ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Loading...
                  </>
                ) : (
                  'Open'
                )}
              </button>
            </div>

            <Dialog.Close className="absolute top-4 right-4 p-2 hover:bg-red-50 rounded-lg">
              <X className="w-5 h-5 text-[#708993]" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Signature Type Dialog */}
      <Dialog.Root open={chooseSignatureTypeDialogOpen} onOpenChange={setChooseSignatureTypeDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-[calc(100%-2rem)] sm:w-full max-w-md max-h-[90vh] p-4 sm:p-6 border-2 border-[#A1C2BD] flex flex-col">
            <Dialog.Title className="flex items-center gap-2 sm:gap-3 text-lg sm:text-2xl font-bold text-[#19183B] mb-3 sm:mb-4 pr-8">
              <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg shrink-0">
                <Signature className="w-4 h-4 sm:w-6 sm:h-6 text-[#19183B]" />
              </div>
              Signature
            </Dialog.Title>

            <p className="text-xs sm:text-sm text-[#708993] mb-4 sm:mb-6">
              Select the type of signature you want to use.
            </p>

            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6 overflow-y-auto flex-1">
              {signatures.find(sig => sig.signatureType === "FULL") && (
                <label className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 border-2 border-gray-200 rounded-xl hover:border-[#A1C2BD] cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="signatureType"
                    value="FULL"
                    checked={selectedSignatureType === 'FULL'}
                    onChange={(e) => setSelectedSignatureType(e.target.value as 'INITIAL' | 'FULL')}
                    className="w-4 h-4 mt-1 text-[#19183B] focus:ring-[#A1C2BD] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#19183B] text-sm sm:text-base mb-2">Full Signature</div>
                    <div className="bg-gray-100 p-2 sm:p-3 rounded-lg border min-h-[60px] sm:min-h-[80px] flex items-center justify-center overflow-hidden">
                      <div className="max-w-full overflow-hidden flex items-center justify-center">
                        <SignatureCardPreview
                          previewUrl={signatures.find(sig => sig.signatureType === "FULL")?.previewUrl || ""}
                        />
                      </div>
                    </div>
                  </div>
                </label>
              )}

              {signatures.find(sig => sig.signatureType === "INITIAL") && (
                <label className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 border-2 border-gray-200 rounded-xl hover:border-[#A1C2BD] cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="signatureType"
                    value="INITIAL"
                    checked={selectedSignatureType === 'INITIAL'}
                    onChange={(e) => setSelectedSignatureType(e.target.value as 'INITIAL' | 'FULL')}
                    className="w-4 h-4 mt-1 text-[#19183B] focus:ring-[#A1C2BD] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#19183B] text-sm sm:text-base mb-2">Initial</div>
                    <div className="bg-gray-100 p-2 sm:p-3 rounded-lg border min-h-[60px] sm:min-h-[80px] flex items-center justify-center overflow-hidden">
                      <div className="max-w-full overflow-hidden flex items-center justify-center">
                        <SignatureCardPreview
                          previewUrl={signatures.find(sig => sig.signatureType === "INITIAL")?.previewUrl || ""}
                        />
                      </div>
                    </div>
                  </div>
                </label>
              )}
            </div>

            <div className="flex gap-2 sm:gap-3 shrink-0">
              <button
                onClick={() => setChooseSignatureTypeDialogOpen(false)}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-[#A1C2BD] rounded-xl"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (selectedSignatureType) {
                    const selectedSig = signatures.find(
                      sig => sig.signatureType === selectedSignatureType
                    );
                    if (selectedSig) {
                      pendingSignatureRef.current = selectedSig;
                      setSigPasswordError(null);
                      setSigPassword("");
                      setSigPasswordDialogOpen(true);
                    }
                  }
                }}
                disabled={!selectedSignatureType}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-[#19183B] text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Apply
              </button>
            </div>

            <Dialog.Close className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 hover:bg-red-50 rounded-lg">
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-[#708993]" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Signature Certificate Password Dialog */}
      <Dialog.Root open={sigPasswordDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setSigPasswordDialogOpen(false);
          setSigPassword("");
          setSigPasswordError(null);
          pendingSignatureRef.current = null;
        }
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-[#A1C2BD] flex flex-col">
            <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B] mb-2">
              <div className="p-2 bg-[#A1C2BD] rounded-lg">
                <Key className="w-6 h-6 text-[#19183B]" />
              </div>
              Certificate Password
            </Dialog.Title>

            <p className="text-[#708993] mb-5 text-sm">
              Enter your certificate password to load the{" "}
              <span className="font-medium text-[#19183B]">
                {pendingSignatureRef.current?.signatureType === 'FULL' ? 'Full Signature' : 'Initial'}
              </span>{" "}
              signature preview.
            </p>

            {sigPasswordError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{sigPasswordError}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#19183B] mb-2">
                  Certificate Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter your certificate password"
                  value={sigPassword}
                  onChange={(e) => setSigPassword(e.target.value)}
                  className="border-[#A1C2BD] focus:ring-[#708993]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && sigPassword && pendingSignatureRef.current) {
                      handleSignatureSelection(pendingSignatureRef.current, sigPassword);
                    }
                  }}
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSigPasswordDialogOpen(false);
                    setSigPassword("");
                    setSigPasswordError(null);
                    pendingSignatureRef.current = null;
                  }}
                  className="flex-1 border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF]"
                  disabled={isLoadingSignature}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (sigPassword && pendingSignatureRef.current) {
                      handleSignatureSelection(pendingSignatureRef.current, sigPassword);
                    }
                  }}
                  disabled={!sigPassword || isLoadingSignature}
                  className="flex-1 bg-[#19183B] hover:bg-[#708993] text-white"
                >
                  {isLoadingSignature ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    'Confirm'
                  )}
                </Button>
              </div>
            </div>

            <Dialog.Close className="absolute top-4 right-4 p-2 hover:bg-red-50 rounded-lg">
              <X className="w-5 h-5 text-[#708993]" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Copy Mode Dialog */}
      <Dialog.Root open={copyModeDialogOpen} onOpenChange={setCopyModeDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-[#A1C2BD] flex flex-col sm:max-w-md">
            <Dialog.Title className="flex items-center gap-2 text-xl font-bold text-[#19183B] mb-4">
              <div className="p-2 bg-[#A1C2BD] rounded-lg">
                <Copy className="w-5 h-5 text-[#19183B]" />
              </div>
              Copy Signature to Pages
            </Dialog.Title>
            <div className="space-y-5 pt-4">
              <p className="text-sm text-[#708993]">
                Specify which pages to copy the signature to:
              </p>
              <div>
                <label className="block text-sm font-medium text-[#19183B] mb-2">
                  Page Numbers
                </label>
                <Input
                  type="text"
                  placeholder="e.g., 1,4,7-10 or 'all'"
                  value={copyToPages}
                  onChange={(e) => setCopyToPages(e.target.value)}
                  className="text-base border-[#A1C2BD] focus:ring-[#708993]"
                />
                <p className="text-xs text-[#708993] mt-2">
                  Examples: "1,4" (pages 1 and 4), "1-10" (pages 1 to 10), "all" (all pages)
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCopyModeDialogOpen(false);
                    setCopyToPages("");
                  }}
                  className="flex-1 border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCopyConfirm}
                  disabled={!copyToPages.trim()}
                  className="flex-1 bg-[#19183B] hover:bg-[#708993]"
                >
                  Copy Signature
                </Button>
              </div>
            </div>
            <Dialog.Close className="absolute top-4 right-4 p-2 hover:bg-red-50 rounded-lg">
              <X className="w-5 h-5 text-[#708993]" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Finish / Sign Again Dialog - NEW */}
      <Dialog.Root open={finishDialogOpen} onOpenChange={setFinishDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-[#A1C2BD] flex flex-col">
            <Dialog.Title className="flex items-center gap-3 text-xl font-bold text-[#19183B] mb-4">
              <div className="p-2 bg-[#A1C2BD] rounded-lg">
                <FileSignature className="w-6 h-6 text-[#19183B]" />
              </div>
              Confirm Signing
            </Dialog.Title>

            <p className="text-[#708993] mb-6 text-center text-base">
              Have you finished signing this document, or do you need to sign it again?
            </p>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleConfirmSigning}
                className="w-full bg-[#19183B] hover:bg-[#708993] text-white py-3 text-base"
              >
                Yes, I'm finished signing
              </Button>
              
              <Button
                onClick={handleSignAgain}
                variant="outline"
                className="w-full border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF] py-3 text-base"
              >
                No, I need to sign again
              </Button>
            </div>

            <Dialog.Close className="absolute top-4 right-4 p-2 hover:bg-red-50 rounded-lg">
              <X className="w-5 h-5 text-[#708993]" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <SharedWithDialog
        open={sharedUsersModalOpen}
        onOpenChange={setSharedUsersModalOpen}
        document={sharedUsersDocument}
        currentUser={user}
      />
    </>
  );
}

export default Signing;