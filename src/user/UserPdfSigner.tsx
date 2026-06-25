/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from "react";
import {
  Plus,
  File,
  FileSignature,
  Fullscreen,
  Minimize,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  Key,
  Copy,
  RotateCw,
  Maximize2
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

GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

// ==================== Types ====================

interface SignatureCardPreviewProps {
  previewUrl: string;
}

interface UserPdfSignerProps {
  preloadedDocument?: PDFDocument;
  onClose?: () => void;
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

//type RotationAngle = 0 | 90 | 180 | 270;

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

function UserPdfSigner({ preloadedDocument, onClose }: UserPdfSignerProps) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const documentFromState = location.state?.document;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
  const [certificatePassword, setCertificatePassword] = useState<string>("");

  // Dialog State
  const [chooseFileDialogOpen, setChooseFileDialogOpen] = useState(false);
  const [chooseSignatureTypeDialogOpen, setChooseSignatureTypeDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [copyModeDialogOpen, setCopyModeDialogOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);

  // UI State
  const [searchTerm, setSearchTerm] = useState("");
  const [copyToPages, setCopyToPages] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    offset: 0,
  });

  // ==================== Hooks ====================

  const { isFullScreen, handleFullScreen } = useSettings();
  const { downloadFile } = useFileDownload();
  const { user } = useAuth();
  useSignaturePreview();

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

    // Draw dashed border
    ctx.strokeStyle = "#708993";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.setLineDash([]);

    // Draw resize handles for all 8 directions
    const handleSize = 6;
    const handles = [
      // Corners
      { x: rect.x - handleSize/2, y: rect.y - handleSize/2, dir: "nw" },
      { x: rect.x + rect.width - handleSize/2, y: rect.y - handleSize/2, dir: "ne" },
      { x: rect.x - handleSize/2, y: rect.y + rect.height - handleSize/2, dir: "sw" },
      { x: rect.x + rect.width - handleSize/2, y: rect.y + rect.height - handleSize/2, dir: "se" },
      
      // Edges
      { x: rect.x + rect.width/2 - handleSize/2, y: rect.y - handleSize/2, dir: "n" },
      { x: rect.x + rect.width/2 - handleSize/2, y: rect.y + rect.height - handleSize/2, dir: "s" },
      { x: rect.x - handleSize/2, y: rect.y + rect.height/2 - handleSize/2, dir: "w" },
      { x: rect.x + rect.width - handleSize/2, y: rect.y + rect.height/2 - handleSize/2, dir: "e" },
    ];

    handles.forEach(handle => {
      ctx.fillStyle = "#19183B";
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1;
      ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
    });

    ctx.restore();

    // Draw rotation handle
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

    // Check rotation handle
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

    // Check other positions using inverse rotation
    const localMouse = calculateInverseRotatedPoint(x, y, centerX, centerY, rotation);

    if (
      localMouse.x >= rect.x &&
      localMouse.x <= rect.x + rect.width &&
      localMouse.y >= rect.y &&
      localMouse.y <= rect.y + rect.height
    ) {
      const handleTolerance = 8;
      
      // Check all 8 resize handles
      const handles = [
        // Corners
        { x: rect.x, y: rect.y, dir: "nw" },
        { x: rect.x + rect.width, y: rect.y, dir: "ne" },
        { x: rect.x, y: rect.y + rect.height, dir: "sw" },
        { x: rect.x + rect.width, y: rect.y + rect.height, dir: "se" },
        
        // Edges
        { x: rect.x + rect.width/2, y: rect.y, dir: "n" },
        { x: rect.x + rect.width/2, y: rect.y + rect.height, dir: "s" },
        { x: rect.x, y: rect.y + rect.height/2, dir: "w" },
        { x: rect.x + rect.width, y: rect.y + rect.height/2, dir: "e" },
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

  const drawCanvas = ({ x, y }: { x: number; y: number }) => {
    if (!canvasRef.current || !pageImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(pageImage, 0, 0);

    const sigPos = currentSignaturePosition;

    // Handle rotation
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

    // Handle resizing
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

      // Handle all 8 resize directions
      switch (resizeDirection) {
        // Corners
        case 'se':
          newWidth = Math.max(20, sigPos.width + deltaX);
          newHeight = newWidth / aspectRatio;
          break;
        case 'sw':
          newWidth = Math.max(20, sigPos.width - deltaX);
          newHeight = newWidth / aspectRatio;
          newX = sigPos.x + (sigPos.width - newWidth);
          break;
        case 'ne':
          newWidth = Math.max(20, sigPos.width + deltaX);
          newHeight = newWidth / aspectRatio;
          newY = sigPos.y - (newHeight - sigPos.height);
          break;
        case 'nw':
          newWidth = Math.max(20, sigPos.width - deltaX);
          newHeight = newWidth / aspectRatio;
          newX = sigPos.x + (sigPos.width - newWidth);
          newY = sigPos.y - (newHeight - sigPos.height);
          break;
        
        // Edges
        case 'n':
          newHeight = Math.max(20, sigPos.height - deltaY);
          newWidth = sigPos.width; // Keep width constant
          newY = sigPos.y + (sigPos.height - newHeight);
          break;
        case 's':
          newHeight = Math.max(20, sigPos.height + deltaY);
          newWidth = sigPos.width; // Keep width constant
          break;
        case 'w':
          newWidth = Math.max(20, sigPos.width - deltaX);
          newHeight = sigPos.height; // Keep height constant
          newX = sigPos.x + (sigPos.width - newWidth);
          break;
        case 'e':
          newWidth = Math.max(20, sigPos.width + deltaX);
          newHeight = sigPos.height; // Keep height constant
          break;
      }

      const boundingBox = getRotatedBoundingBox({
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
        rotation: rotation
      });

      if (boundingBox.x < 0 || boundingBox.x + boundingBox.width > canvas.width ||
          boundingBox.y < 0 || boundingBox.y + boundingBox.height > canvas.height) {
        return;
      }

      const newPos = { ...sigPos, x: newX, y: newY, width: newWidth, height: newHeight, rotation: rotation };

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

    // Handle dragging
    if (isDraggingSignature && sigPos && startPos && signatureImg) {
      const rotation = sigPos.rotation || 0;

      const newCenterX = x - (startPos.xOffset ?? 0);
      const newCenterY = y - (startPos.yOffset ?? 0);

      const newX = newCenterX - sigPos.width / 2;
      const newY = newCenterY - sigPos.height / 2;

      const clampedX = Math.max(0, Math.min(newX, canvas.width - sigPos.width));
      const clampedY = Math.max(0, Math.min(newY, canvas.height - sigPos.height));

      const clampedCenterX = clampedX + sigPos.width / 2;
      const clampedCenterY = clampedY + sigPos.height / 2;

      const newPos = { ...sigPos, x: clampedX, y: clampedY, rotation: rotation };

      const boundingBox = getRotatedBoundingBox(newPos);
      if (boundingBox.x < 0 || boundingBox.x + boundingBox.width > canvas.width ||
          boundingBox.y < 0 || boundingBox.y + boundingBox.height > canvas.height) {
        return;
      }

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

    // Draw existing signature
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

    // Draw selection rectangle
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

        //const rotation = sigPos.rotation || 0;
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
            "nw": "nw-resize",
            "ne": "ne-resize",
            "sw": "sw-resize",
            "se": "se-resize",
            "n": "n-resize",
            "s": "s-resize",
            "e": "e-resize",
            "w": "w-resize",
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
          "rotate": "grab",
          "move": "grab",
          "nw": "nw-resize",
          "ne": "ne-resize",
          "sw": "sw-resize",
          "se": "se-resize",
          "n": "n-resize",
          "s": "s-resize",
          "e": "e-resize",
          "w": "w-resize",
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
      // Use the same initial sizes as when first placed
      let originalWidth: number;
      let originalHeight: number;

      if (selectedSignature.signatureType === 'FULL') {
        originalWidth = 100;
        originalHeight = 60;
      } else {
        originalWidth = 60;
        originalHeight = 60;
      }

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

      const response = await api.get("v1/documents/view/" + doc.filePath, {
        responseType: 'blob'
      });

      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      setPdfFile(pdfBlob);

      setSignaturePlacements(new Map());
      setSignatureImg(null);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error loading PDF:', error);
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const loadDocumentById = async (documentId: string) => {
    try {
      const response = await api.get(`v1/documents/${documentId}`);
      await loadDocumentForSigning(response.data);
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
    setCertificatePassword("");
    setError(null);

    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  const handleSubmit = async () => {
    setPasswordDialogOpen(true);
  };


  const handlePasswordConfirm = async () => {
    if (!certificatePassword) {
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
    formData.append("password", certificatePassword);
    formData.append("canvasWidth", canvasWidth.toString());
    formData.append("canvasHeight", canvasHeight.toString());
    formData.append("location", "Unknown Location");

    if (selectedDocument?.fileName) formData.append("original_filename", selectedDocument.fileName);
    if (user?.id) formData.append("user_id", user.id);
    
    // Append the signature file instead of signature ID
    if (signatureFile) {
      formData.append("signature_image", signatureFile);
    }
    
    if (certHash?.certificateHash) formData.append("certificate_hash", certHash.certificateHash);
    
    // Add signature type
    if (selectedSignature?.signatureType) {
      formData.append("signature_type", selectedSignature.signatureType);
    }
    
    if (selectedSignature?.signatureType && selectedSignature.signatureType.toString() === 'INITIAL') {
      formData.append("isInitial", "true");
    } else {
      formData.append("isInitial", "false");
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

        setPasswordDialogOpen(false);
        setCertificatePassword("");

        toast.success(`Signature submitted successfully! Signed on ${signaturePlacements.size} page(s)`);

        resetAfterSuccess();
      } else {
        toast.error(data.error || "Verification failed");
      }
    } catch (err: any) {
      if (err.response) {
        if (err.response.status === 403) {
          setError("Access denied — you do not have permission to sign this document.");
        } else if (err.response.status === 401) {
          setError("Invalid certificate password. Please try again.");
        } else {
          setError(err.response.data?.error || `HTTP error! status: ${err.response.status}`);
        }
      } else if (err.request) {
        setError("No response from server. Please check your connection.");
      } else {
        setError("Error connecting to server: " + err.message);
      }
    } finally {
      setVerifying(false);
    }
  };


  const handleChooseFile = () => {
    loadDocuments();
    setChooseFileDialogOpen((prev) => !prev);
    setIsFabOpen((prev) => !prev);
  };

  const handleChooseSignatureType = () => {
    if (!selectedDocument && !preloadedDocument) {
      toast.error("Please load PDF Document first.");
      return;
    }
    setIsFabOpen(false);
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

  const handleSignatureSelection = async (signature: Signature) => {
    try {
      /*const response = await api.get(`v1/signatures/${signature.id}/file`, {
        responseType: 'blob'
      });*/
      const response = await api.get(`v1/signatures/${signature.id}/image`, {
        params: {
          initial: signature.signatureType == 'FULL' ? false : true,
          certificateHash: 'a88b1c4d2d85803093dd890d96f4db9cd4995f278274e82febfb68c77e11aa94',
          password: 'Ccernechez1996'
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

        // Set different initial sizes based on signature type
        let initialWidth: number;
        let initialHeight: number;

        if (signature.signatureType === 'FULL') {
          // Full signature: 100px x 60px
          initialWidth = 100;
          initialHeight = 60;
        } else {
          // Initial signature: 60px x 60px
          initialWidth = 60;
          initialHeight = 60;
        }

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
      setChooseSignatureTypeDialogOpen(false);
      toast.success(`${signature.signatureType} signature selected`);

    } catch (error) {
      console.error('Error loading signature:', error);
      toast.error('Failed to load signature');
    }
  };

  // ==================== Effects ====================

  useEffect(() => {
    const initializeDocument = async () => {
      if (hasInitializedRef.current) return;

      setIsInitializing(true);
      hasInitializedRef.current = true;

      try {
        console.log('Initializing document with:', {
          preloadedDocument: !!preloadedDocument,
          documentFromState: !!documentFromState,
          id
        });

        if (preloadedDocument) {
          console.log('Using preloaded document');
          await loadDocumentForSigning(preloadedDocument);
          setSelectedDocument(preloadedDocument);
        } else if (documentFromState) {
          console.log('Using document from route state');
          await loadDocumentForSigning(documentFromState);
        } else if (id) {
          console.log('Fetching document by ID:', id);
          await loadDocumentById(id);
        }
      } catch (error) {
        console.error('Error initializing document:', error);
        hasInitializedRef.current = false;
      } finally {
        setIsInitializing(false);
      }
    };

    initializeDocument();

    return () => {
      hasInitializedRef.current = false;
    };
  }, [id, documentFromState, preloadedDocument]);

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
        console.log('Rendering page', currentPage);

        const page = await pdf.getPage(currentPage);
        const desiredWidth = 800;
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
            </div>

            {/* PDF Navigation and Controls */}
            {pdf && selectedDocument && (
              <div className="bg-white border-b border-[#A1C2BD] p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={handlePreviousPage}
                    disabled={currentPage <= 1}
                    variant="outline"
                    className="border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <span className="text-sm font-medium text-[#19183B]">
                    Page {currentPage} of {pdf.numPages}
                  </span>

                  <Button
                    onClick={handleNextPage}
                    disabled={currentPage >= pdf.numPages}
                    variant="outline"
                    className="border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF]"
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
                    className="w-20 text-center border-[#A1C2BD] focus:ring-[#708993]"
                  />
                </div>

                <div className="flex items-center gap-3">
                  {currentSignaturePosition && signatureImg && (
                    <>
                      <Button
                        onClick={handleRotateSignature}
                        variant="outline"
                        className="border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF]"
                        title="Rotate 90°"
                      >
                        <RotateCw className="w-4 h-4 mr-2" />
                        Rotate
                      </Button>
                      <Button
                        onClick={handleResizeToOriginal}
                        variant="outline"
                        className="border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF]"
                        title="Reset to original size"
                      >
                        <Maximize2 className="w-4 h-4 mr-2" />
                        Reset Size
                      </Button>
                      <Button
                        onClick={handleCopyToPages}
                        variant="outline"
                        className="border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF]"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy to Pages
                      </Button>
                      <Button
                        onClick={handleRemoveSignature}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        Remove Signature
                      </Button>
                    </>
                  )}
                  <Button
                    onClick={handleSubmit}
                    disabled={signaturePlacements.size === 0 || selectedDocument === null}
                    className="bg-[#19183B] hover:bg-[#708993] text-white"
                  >
                    Submit Signature
                  </Button>
                </div>
              </div>
            )}

            {/* Canvas Area */}
            <div
              className="overflow-y-auto overflow-x-auto bg-gray-400 p-6"
              style={{
                flex: '1 1 0',
                minHeight: 0
              }}
            >
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
                      maxWidth: '100%'
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 flex flex-col items-end gap-4">
        {isFabOpen && (
          <div className="flex flex-col gap-3">
            {!selectedDocument && !preloadedDocument && (
              <button
                onClick={handleChooseFile}
                className="flex items-center gap-3 bg-white text-[#19183B] pl-4 pr-5 py-3 rounded-full shadow-lg hover:scale-105 border-2 border-[#A1C2BD] hover:bg-[#E7F2EF] transition-all"
              >
                <div className="p-2 bg-[#A1C2BD] rounded-full">
                  <File className="w-5 h-5 text-[#19183B]" />
                </div>
                <span className="font-semibold">Choose PDF</span>
              </button>
            )}

            <button
              onClick={handleChooseSignatureType}
              className="flex items-center gap-3 bg-white text-[#19183B] pl-4 pr-5 py-3 rounded-full shadow-lg hover:scale-105 border-2 border-[#A1C2BD]"
            >
              <div className="p-2 bg-[#A1C2BD] rounded-full">
                <FileSignature className="w-5 h-5 text-[#19183B]" />
              </div>
              <span className="font-semibold">Sign</span>
            </button>

            {!preloadedDocument && (
              <button
                onClick={handleFullScreen}
                className="flex items-center gap-3 bg-white text-[#19183B] pl-4 pr-5 py-3 rounded-full shadow-lg hover:scale-105 border-2 border-[#A1C2BD]"
              >
                <div className="p-2 bg-[#A1C2BD] rounded-full">
                  {isFullScreen ? (
                    <Minimize className="w-5 h-5 text-[#19183B]" />
                  ) : (
                    <Fullscreen className="w-5 h-5 text-[#19183B]" />
                  )}
                </div>
                <span className="font-semibold">
                  {isFullScreen ? "Minimize" : "Fullscreen"}
                </span>
              </button>
            )}
          </div>
        )}

        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 ${
            isFabOpen
              ? "bg-red-500 hover:bg-red-600 rotate-45"
              : "bg-[#19183B] hover:bg-[#708993]"
          }`}
        >
          <Plus className="w-8 h-8 text-white" />
        </button>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="fixed top-4 right-4 p-2 bg-white rounded-full shadow-lg z-50 hover:bg-gray-100"
        >
          <X className="w-6 h-6" />
        </button>
      )}

      {/* Password Dialog */}
      <Dialog.Root open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-[#A1C2BD] flex flex-col">
            <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B] mb-4">
              <div className="p-2 bg-[#A1C2BD] rounded-lg">
                <Key className="w-6 h-6 text-[#19183B]" />
              </div>
              Certificate Password
            </Dialog.Title>

            <p className="text-[#708993] mb-6">
              Please enter the password for your .p12 certificate to sign the document.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
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
                  value={certificatePassword}
                  onChange={(e) => setCertificatePassword(e.target.value)}
                  className="border-[#A1C2BD] focus:ring-[#708993]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePasswordConfirm();
                    }
                  }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPasswordDialogOpen(false);
                    setCertificatePassword("");
                    setError(null);
                  }}
                  className="flex-1 border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF]"
                  disabled={verifying}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePasswordConfirm}
                  disabled={!certificatePassword || verifying}
                  className="flex-1 bg-[#19183B] hover:bg-[#708993] text-white"
                >
                  {verifying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing...
                    </>
                  ) : (
                    'Sign Document'
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
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedDocument?.id === document.id
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
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] p-6 border-2 border-[#A1C2BD] flex flex-col">
            <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B] mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileSignature className="w-6 h-6 text-[#19183B]" />
              </div>
              Choose Signature Type
            </Dialog.Title>

            <p className="text-[#708993] mb-6">
              Select the type of signature you want to use. (Default signature)
            </p>

            <div className="space-y-4 mb-6">
              {signatures.find(sig => sig.signatureType === "FULL") && (
                <label className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-[#A1C2BD] cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="signatureType"
                    value="FULL"
                    checked={selectedSignatureType === 'FULL'}
                    onChange={(e) => setSelectedSignatureType(e.target.value as 'INITIAL' | 'FULL')}
                    className="w-4 h-4 text-[#19183B] focus:ring-[#A1C2BD]"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-[#19183B] mb-2">Full Signature</div>
                    <div className="bg-gray-100 p-3 rounded-lg border min-h-[80px] flex items-center justify-center">
                      <SignatureCardPreview
                        previewUrl={signatures.find(sig => sig.signatureType === "FULL")?.previewUrl || ""}
                      />
                    </div>
                  </div>
                </label>
              )}

              {signatures.find(sig => sig.signatureType === "INITIAL") && (
                <label className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-[#A1C2BD] cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="signatureType"
                    value="INITIAL"
                    checked={selectedSignatureType === 'INITIAL'}
                    onChange={(e) => setSelectedSignatureType(e.target.value as 'INITIAL' | 'FULL')}
                    className="w-4 h-4 text-[#19183B] focus:ring-[#A1C2BD]"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-[#19183B] mb-2">Initial</div>
                    <div className="bg-gray-100 p-3 rounded-lg border min-h-[80px] flex items-center justify-center">
                      <SignatureCardPreview
                        previewUrl={signatures.find(sig => sig.signatureType === "INITIAL")?.previewUrl || ""}
                      />
                    </div>
                  </div>
                </label>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setChooseSignatureTypeDialogOpen(false)}
                className="flex-1 px-6 py-3 border-2 border-[#A1C2BD] rounded-xl"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (selectedSignatureType) {
                    const selectedSignature = signatures.find(
                      sig => sig.signatureType === selectedSignatureType
                    );

                    if (selectedSignature) {
                      handleSignatureSelection(selectedSignature);
                      setChooseSignatureTypeDialogOpen(false);
                    }
                  }
                }}
                disabled={!selectedSignatureType}
                className="flex-1 px-6 py-3 bg-[#19183B] text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Sign
              </button>
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
    </>
  );
}

export default UserPdfSigner;