import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import * as Dialog from "@radix-ui/react-dialog";
import {
    ChevronLeft,
    ChevronRight,
    Key,
    RotateCw,
    Maximize2,
    Copy,
    X,
    FileSignature,
    File,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import { useAuthImage } from "@/hooks/useAuthImage";
import { useSignatureManager } from "@/hooks/useSignatureManager";

GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;


interface SignatureCardPreviewProps {
    previewUrl: string;
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
  FULL:    { width: 300, height: 80 },
  INITIAL: { width: 100, height: 80 },
} as const;

function SignExternal() {
    const [searchParams] = useSearchParams();
    const pdfUrl = searchParams.get("pdfUrl");
    const appKey = searchParams.get("appKey");
    const appName = searchParams.get("appName");
    const email = searchParams.get("email");
    const key = searchParams.get("key");
    const appUrl = searchParams.get("appUrl");
    const recId = searchParams.get("id");
    const uuId = searchParams.get("uid") ?? "0";
    const a = searchParams.get("a") || "0";
    const originalFilePath = searchParams.get("originalFilePath");
    const decodedPdfUrl = pdfUrl ? decodeURIComponent(pdfUrl) : null;

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const canvasScrollRef = useRef<HTMLDivElement | null>(null);
    const rectRef = useRef<Rect | null>(null);

    // PDF State
    const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
    const [, setPdfBlob] = useState<Blob | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageImage, setPageImage] = useState<HTMLImageElement | null>(null);
    const [canvasWidth, setCanvasWidth] = useState(0);
    const [canvasHeight, setCanvasHeight] = useState(0);
    const [loadingPdf, setLoadingPdf] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);

    // Signature & Certificate State
    const [signatures, setSignatures] = useState<Signature[]>([]);
    const [selectedSignature, setSelectedSignature] = useState<Signature | null>(null);
    const [selectedSignatureType, setSelectedSignatureType] = useState<'INITIAL' | 'FULL' | ''>('');
    const [certHash, setCertHash] = useState<CertificateHash | null>(null);
    const [confirmedPassword, setConfirmedPassword] = useState<string>("");

    const [loadingExternalData, setLoadingExternalData] = useState(false);
    const [, setExternalDataError] = useState<string | null>(null);

    // Zoom State
    const [zoom, setZoom] = useState<number>(0.60);

    // Interaction State
    const [isDrawing, setIsDrawing] = useState(false);
    const [isDraggingSignature, setIsDraggingSignature] = useState(false);
    const [isHoveringSignature, setIsHoveringSignature] = useState(false);
    const [isResizingSignature, setIsResizingSignature] = useState(false);
    const [isRotatingSignature, setIsRotatingSignature] = useState(false);
    const [resizeDirection, setResizeDirection] = useState<string | null>(null);
    const [startPos, setStartPos] = useState<{ x: number; y: number; xOffset?: number; yOffset?: number } | null>(null);

    // Dialog / UI State
    const [chooseSignatureTypeDialogOpen, setChooseSignatureTypeDialogOpen] = useState(false);
    const [sigPasswordDialogOpen, setSigPasswordDialogOpen] = useState(false);
    const [copyModeDialogOpen, setCopyModeDialogOpen] = useState(false);
    const [copyToPages, setCopyToPages] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Signature password state (for loading signature at selection time)
    const [sigPassword, setSigPassword] = useState<string>("");
    const [sigPasswordError, setSigPasswordError] = useState<string | null>(null);
    const [isLoadingSignature, setIsLoadingSignature] = useState(false);
    const pendingSignatureRef = useRef<Signature | null>(null);

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

    // ==================== Rotation Helpers ====================

    const calculateRotatedPoint = (x: number, y: number, centerX: number, centerY: number, angle: number) => {
        const rad = (angle * Math.PI) / 180;
        const cos = Math.cos(rad); const sin = Math.sin(rad);
        const tx = x - centerX; const ty = y - centerY;
        return { x: tx * cos - ty * sin + centerX, y: tx * sin + ty * cos + centerY };
    };

    const calculateInverseRotatedPoint = (x: number, y: number, centerX: number, centerY: number, angle: number) => {
        const rad = (angle * Math.PI) / 180;
        const cos = Math.cos(rad); const sin = Math.sin(rad);
        const tx = x - centerX; const ty = y - centerY;
        return { x: tx * cos + ty * sin + centerX, y: -tx * sin + ty * cos + centerY };
    };

    const getRotatedBoundingBox = (rect: Rect) => {
        const cx = rect.x + rect.width / 2; const cy = rect.y + rect.height / 2;
        const rotation = rect.rotation || 0;
        const corners = [
            { x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y },
            { x: rect.x + rect.width, y: rect.y + rect.height }, { x: rect.x, y: rect.y + rect.height },
        ].map(c => calculateRotatedPoint(c.x, c.y, cx, cy, rotation));
        return {
            x: Math.min(...corners.map(c => c.x)), y: Math.min(...corners.map(c => c.y)),
            width: Math.max(...corners.map(c => c.x)) - Math.min(...corners.map(c => c.x)),
            height: Math.max(...corners.map(c => c.y)) - Math.min(...corners.map(c => c.y)),
        };
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

    // ==================== Drawing ====================

    const drawRotatedSelectionBox = (ctx: CanvasRenderingContext2D, rect: Rect) => {
        const rotation = rect.rotation || 0;
        const centerX = rect.x + rect.width / 2; const centerY = rect.y + rect.height / 2;
        ctx.save();
        ctx.translate(centerX, centerY); ctx.rotate((rotation * Math.PI) / 180); ctx.translate(-centerX, -centerY);
        ctx.strokeStyle = "#708993"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height); ctx.setLineDash([]);
        const hs = 6;
        const handles = [
            { x: rect.x - hs / 2, y: rect.y - hs / 2 },
            { x: rect.x + rect.width - hs / 2, y: rect.y - hs / 2 },
            { x: rect.x - hs / 2, y: rect.y + rect.height - hs / 2 },
            { x: rect.x + rect.width - hs / 2, y: rect.y + rect.height - hs / 2 },
            { x: rect.x + rect.width / 2 - hs / 2, y: rect.y - hs / 2 },
            { x: rect.x + rect.width / 2 - hs / 2, y: rect.y + rect.height - hs / 2 },
            { x: rect.x - hs / 2, y: rect.y + rect.height / 2 - hs / 2 },
            { x: rect.x + rect.width - hs / 2, y: rect.y + rect.height / 2 - hs / 2 },
        ];
        handles.forEach(h => {
            ctx.fillStyle = "#19183B"; ctx.fillRect(h.x, h.y, hs, hs);
            ctx.strokeStyle = "white"; ctx.lineWidth = 1; ctx.strokeRect(h.x, h.y, hs, hs);
        });
        ctx.restore();
        const rotatedTop = calculateRotatedPoint(rect.x + rect.width / 2, rect.y, centerX, centerY, rotation);
        const rhX = rotatedTop.x; const rhY = rotatedTop.y - 25;
        ctx.fillStyle = "#19183B"; ctx.beginPath(); ctx.arc(rhX, rhY, 8, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(rhX, rhY); ctx.rotate((rotation * Math.PI) / 180);
        ctx.font = "12px Arial"; ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("↻", 0, 0); ctx.restore();
    };

    const getCursorPosition = (x: number, y: number, rect: Rect): string => {
        const rotation = rect.rotation || 0;
        const centerX = rect.x + rect.width / 2; const centerY = rect.y + rect.height / 2;
        const rotatedTop = calculateRotatedPoint(rect.x + rect.width / 2, rect.y, centerX, centerY, rotation);
        if (Math.sqrt(Math.pow(x - rotatedTop.x, 2) + Math.pow(y - (rotatedTop.y - 25), 2)) <= 15) return "rotate";
        const local = calculateInverseRotatedPoint(x, y, centerX, centerY, rotation);
        if (local.x >= rect.x && local.x <= rect.x + rect.width && local.y >= rect.y && local.y <= rect.y + rect.height) {
            const tol = 8;
            const cornerHandles = [
                { x: rect.x, y: rect.y, dir: "nw" }, { x: rect.x + rect.width, y: rect.y, dir: "ne" },
                { x: rect.x, y: rect.y + rect.height, dir: "sw" }, { x: rect.x + rect.width, y: rect.y + rect.height, dir: "se" },
                { x: rect.x + rect.width / 2, y: rect.y, dir: "n" }, { x: rect.x + rect.width / 2, y: rect.y + rect.height, dir: "s" },
                { x: rect.x, y: rect.y + rect.height / 2, dir: "w" }, { x: rect.x + rect.width, y: rect.y + rect.height / 2, dir: "e" },
            ];
            for (const c of cornerHandles) {
                if (Math.abs(local.x - c.x) <= tol && Math.abs(local.y - c.y) <= tol) return c.dir;
            }
            return "move";
        }
        return "default";
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        if (!canvasRef.current) return null;
        const canvas = canvasRef.current; const bounds = canvas.getBoundingClientRect();
        const scaleX = canvas.width / bounds.width; const scaleY = canvas.height / bounds.height;
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
        return { x: (clientX - bounds.left) * scaleX, y: (clientY - bounds.top) * scaleY };
    };

    const drawCanvas = ({ x, y }: { x: number; y: number }) => {
        if (!canvasRef.current || !pageImage) return;
        const canvas = canvasRef.current; const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(pageImage, 0, 0);
        const sigPos = signaturePlacements.get(currentPage) || null;

        const drawSig = (pos: Rect) => {
            if (!signatureImg) return;
            const rotation = pos.rotation || 0; const cx = pos.x + pos.width / 2; const cy = pos.y + pos.height / 2;
            ctx.save(); ctx.translate(cx, cy); ctx.rotate((rotation * Math.PI) / 180); ctx.translate(-cx, -cy);
            ctx.drawImage(signatureImg, pos.x, pos.y, pos.width, pos.height); ctx.restore();
        };

        if (isRotatingSignature && sigPos && startPos && signatureImg) {
            const cx = sigPos.x + sigPos.width / 2; const cy = sigPos.y + sigPos.height / 2;
            const startAngle = Math.atan2(startPos.y - cy, startPos.x - cx);
            const currentAngle = Math.atan2(y - cy, x - cx);
            const angleDiff = (currentAngle - startAngle) * (180 / Math.PI);
            const newRotation = Math.round(((sigPos.rotation || 0) + angleDiff) / 15) * 15;
            const newPos = { ...sigPos, rotation: newRotation };
            drawSig(newPos); drawRotatedSelectionBox(ctx, newPos); updateSignaturePlacement(currentPage, newPos); setStartPos({ x, y }); return;
        }

        if (isResizingSignature && sigPos && startPos && signatureImg && resizeDirection) {
            const aspectRatio = sigPos.width / sigPos.height;
            const rotation = sigPos.rotation || 0;
            const cx = sigPos.x + sigPos.width / 2; const cy = sigPos.y + sigPos.height / 2;
            const lm = calculateInverseRotatedPoint(x, y, cx, cy, rotation);
            const ls = calculateInverseRotatedPoint(startPos.x, startPos.y, cx, cy, rotation);
            const dx = lm.x - ls.x; const dy = lm.y - ls.y;
            let { width: nw, height: nh, x: nx, y: ny } = sigPos;
            /*switch (resizeDirection) {
                case "se": nw = Math.max(20, sigPos.width + dx); nh = nw / aspectRatio; break;
                case "sw": nw = Math.max(20, sigPos.width - dx); nh = nw / aspectRatio; nx = sigPos.x + (sigPos.width - nw); break;
                case "ne": nw = Math.max(20, sigPos.width + dx); nh = nw / aspectRatio; ny = sigPos.y - (nh - sigPos.height); break;
                case "nw": nw = Math.max(20, sigPos.width - dx); nh = nw / aspectRatio; nx = sigPos.x + (sigPos.width - nw); ny = sigPos.y - (nh - sigPos.height); break;
                case "n": nh = Math.max(20, sigPos.height - dy); nw = sigPos.width; ny = sigPos.y + (sigPos.height - nh); break;
                case "s": nh = Math.max(20, sigPos.height + dy); nw = sigPos.width; break;
                case "w": nw = Math.max(20, sigPos.width - dx); nh = sigPos.height; nx = sigPos.x + (sigPos.width - nw); break;
                case "e": nw = Math.max(20, sigPos.width + dx); nh = sigPos.height; break;
            }*/
            
            switch (resizeDirection) {
                case "se": { const d = Math.abs(dx) >= Math.abs(dy) ? dx : dy * aspectRatio; nw = Math.max(20, sigPos.width + d); nh = nw / aspectRatio; break; }
                case "sw": { const d = Math.abs(dx) >= Math.abs(dy) ? -dx : dy * aspectRatio; nw = Math.max(20, sigPos.width + d); nh = nw / aspectRatio; nx = sigPos.x + (sigPos.width - nw); break; }
                case "ne": { const d = Math.abs(dx) >= Math.abs(dy) ? dx : -dy * aspectRatio; nw = Math.max(20, sigPos.width + d); nh = nw / aspectRatio; ny = sigPos.y - (nh - sigPos.height); break; }
                case "nw": { const d = Math.abs(dx) >= Math.abs(dy) ? -dx : -dy * aspectRatio; nw = Math.max(20, sigPos.width + d); nh = nw / aspectRatio; nx = sigPos.x + (sigPos.width - nw); ny = sigPos.y - (nh - sigPos.height); break; }
                case "n": { nh = Math.max(20, sigPos.height - dy); nw = nh * aspectRatio; nx = sigPos.x + (sigPos.width - nw) / 2; ny = sigPos.y + (sigPos.height - nh); break; }
                case "s": { nh = Math.max(20, sigPos.height + dy); nw = nh * aspectRatio; nx = sigPos.x + (sigPos.width - nw) / 2; break; }
                case "w": { nw = Math.max(20, sigPos.width - dx); nh = nw / aspectRatio; nx = sigPos.x + (sigPos.width - nw); ny = sigPos.y + (sigPos.height - nh) / 2; break; }
                case "e": { nw = Math.max(20, sigPos.width + dx); nh = nw / aspectRatio; ny = sigPos.y + (sigPos.height - nh) / 2; break; }
            }
            
            const clamped = clampRectToCanvas(nx, ny, nw, nh, rotation, canvas.width, canvas.height);
            const np = { x: clamped.x, y: clamped.y, width: nw, height: nh, rotation };
            drawSig(np); drawRotatedSelectionBox(ctx, np); updateSignaturePlacement(currentPage, np); setStartPos({ x, y }); return;
        }

        if (isDraggingSignature && sigPos && startPos && signatureImg) {
            const rotation = sigPos.rotation || 0;
            const newCenterX = x - (startPos.xOffset ?? 0);
            const newCenterY = y - (startPos.yOffset ?? 0);
            const newX = newCenterX - sigPos.width / 2;
            const newY = newCenterY - sigPos.height / 2;
            const clamped = clampRectToCanvas(newX, newY, sigPos.width, sigPos.height, rotation, canvas.width, canvas.height);
            const np = { ...sigPos, x: clamped.x, y: clamped.y, rotation };
            const clampedCX = clamped.x + sigPos.width / 2;
            const clampedCY = clamped.y + sigPos.height / 2;
            ctx.save(); ctx.translate(clampedCX, clampedCY); ctx.rotate((rotation * Math.PI) / 180); ctx.translate(-clampedCX, -clampedCY);
            ctx.drawImage(signatureImg, np.x, np.y, np.width, np.height); ctx.restore();
            drawRotatedSelectionBox(ctx, np); updateSignaturePlacement(currentPage, np); return;
        }

        if (sigPos && signatureImg) {
            drawSig(sigPos);
            if (isHoveringSignature || isDraggingSignature || isResizingSignature || isRotatingSignature) drawRotatedSelectionBox(ctx, sigPos);
        }

        if (isDrawing && startPos) {
            const rw = x - startPos.x; const rh = y - startPos.y;
            const sx = rw >= 0 ? startPos.x : startPos.x + rw; const sy = rh >= 0 ? startPos.y : startPos.y + rh;
            ctx.strokeStyle = "#708993"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
            ctx.strokeRect(sx, sy, Math.abs(rw), Math.abs(rh)); ctx.setLineDash([]);
            rectRef.current = { x: sx, y: sy, width: Math.abs(rw), height: Math.abs(rh) };
        }
    };

    // ==================== Event Handlers ====================

    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        const coords = getCoordinates(e); if (!coords) return;
        const { x, y } = coords; const sigPos = signaturePlacements.get(currentPage) || null;
        if (sigPos && signatureImg) {
            const cp = getCursorPosition(x, y, sigPos);
            if (cp === "rotate") {
                setIsRotatingSignature(true); setIsHoveringSignature(true); setStartPos({ x, y });
                if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
                if ("touches" in e) e.preventDefault(); return;
            }
            if (cp === "move") {
                setIsDraggingSignature(true);
                const cx = sigPos.x + sigPos.width / 2; const cy = sigPos.y + sigPos.height / 2;
                setStartPos({ x: cx, y: cy, xOffset: x - cx, yOffset: y - cy });
                if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
                if ("touches" in e) e.preventDefault(); return;
            }
            if (["nw", "ne", "sw", "se", "n", "s", "e", "w"].includes(cp)) {
                setIsResizingSignature(true); setResizeDirection(cp); setStartPos({ x, y });
                const cm: Record<string, string> = { nw: "nw-resize", ne: "ne-resize", sw: "sw-resize", se: "se-resize", n: "n-resize", s: "s-resize", e: "e-resize", w: "w-resize" };
                if (canvasRef.current) canvasRef.current.style.cursor = cm[cp];
                if ("touches" in e) e.preventDefault(); return;
            }
        }
        if (sigPos && signatureImg) return;
        setStartPos({ x, y }); setIsDrawing(true);
        if (canvasRef.current) canvasRef.current.style.cursor = "crosshair";
        if ("touches" in e) e.preventDefault();
    };

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        const coords = getCoordinates(e); if (!coords) return;
        const { x, y } = coords; const sigPos = signaturePlacements.get(currentPage) || null;
        if (sigPos && signatureImg && !isDraggingSignature && !isResizingSignature && !isRotatingSignature && !isDrawing) {
            const cp = getCursorPosition(x, y, sigPos);
            const cm: Record<string, string> = { rotate: "grab", move: "grab", nw: "nw-resize", ne: "ne-resize", sw: "sw-resize", se: "se-resize", n: "n-resize", s: "s-resize", e: "e-resize", w: "w-resize", default: "default" };
            if (canvasRef.current) canvasRef.current.style.cursor = cm[cp] || "default";
            setIsHoveringSignature(cp !== "default");
        } else if (!sigPos) {
            setIsHoveringSignature(false);
            if (canvasRef.current && !isDrawing) canvasRef.current.style.cursor = "default";
        }
        drawCanvas({ x, y });
        if ("touches" in e && (isDraggingSignature || isResizingSignature || isRotatingSignature || isDrawing)) e.preventDefault();
    };

    const handlePointerUp = () => {
        setIsRotatingSignature(false); setIsResizingSignature(false); setResizeDirection(null);
        setIsDraggingSignature(false); setIsDrawing(false); setStartPos(null);
    };

    const handleRotateSignature = () => {
        const sp = signaturePlacements.get(currentPage);
        if (sp) {
            const newRotation = ((sp.rotation || 0) + 90) % 360;
            updateSignaturePlacement(currentPage, { ...sp, rotation: newRotation });
            toast.success(`Signature rotated to ${newRotation}°`);
        }
    };

    const handleResizeToOriginal = () => {
        const sp = signaturePlacements.get(currentPage);
        if (sp && selectedSignature) {
            const { width: originalWidth, height: originalHeight } = SIGNATURE_DIMENSIONS[selectedSignature.signatureType];

            const newPos = { ...sp, width: originalWidth, height: originalHeight };
            updateSignaturePlacement(currentPage,newPos);
            toast.success("Signature resized to default dimensions");
        }
    };

    const handleRemoveSignature = () => {
        removeSignaturePlacement(currentPage);
        if (signaturePlacements.size === 1) {
            setSignatureImg(null);
            setMultiPageMode(false);
        }
    };

    const handleZoomIn = () => setZoom(prev => Math.min(3, parseFloat((prev + 0.25).toFixed(2))));
    const handleZoomOut = () => setZoom(prev => Math.max(0.25, parseFloat((prev - 0.25).toFixed(2))));

    const parsePagesInput = (input: string, totalPages: number): number[] => {
        const pages = new Set<number>();
        input.split(",").map(s => s.trim()).forEach(part => {
            if (part.includes("-")) {
                const [s, e] = part.split("-").map(n => parseInt(n.trim()));
                if (!isNaN(s) && !isNaN(e)) for (let i = Math.max(1, s); i <= Math.min(totalPages, e); i++) pages.add(i);
            } else if (part.toLowerCase() === "all") {
                for (let i = 1; i <= totalPages; i++) pages.add(i);
            } else {
                const n = parseInt(part);
                if (!isNaN(n) && n >= 1 && n <= totalPages) pages.add(n);
            }
        });
        return Array.from(pages).sort((a, b) => a - b);
    };

    const handleCopyConfirm = () => {
        if (!currentSignaturePosition || !pdf) return;
        const pages = parsePagesInput(copyToPages, pdf.numPages);
        if (pages.length === 0) { toast.error("No valid pages specified"); return; }
        const next = new Map(signaturePlacements); let count = 0;
        pages.forEach(p => { if (p !== currentPage) { next.set(p, { ...currentSignaturePosition }); count++; } });
        if (count === 0) { toast.error("No new pages to copy to (current page excluded)"); return; }
        setSignaturePlacements(next); setCopyModeDialogOpen(false); setCopyToPages("");
        setMultiPageMode(true);
        toast.success(`Signature copied to ${count} page(s)`);
    };

    // ==================== Signature Selection ====================

    const handleChooseSignatureType = () => {
        if (!pdf) return;
        setSelectedSignatureType(""); setChooseSignatureTypeDialogOpen(true);
    };

// REPLACE the handleSignatureSelection function in SignExternal.tsx
// with this version. The bug was using `new URL(relativeString)` which
// throws when VITE_API_BASE_URL is empty or relative (e.g. "" or "/api").
// Fix: build the query string manually, same pattern as Signing.tsx uses
// via axios params.

    const handleSignatureSelection = async (signature: Signature, password: string) => {
        setIsLoadingSignature(true);
        setSigPasswordError(null);
        try {

            const headers: Record<string, string> = {
                "X-API-Key": import.meta.env.VITE_APP_KEY,
                "Accept": "image/png",
                "X-App-NAME": import.meta.env.VITE_APP_NAME,
            };

            // ✅ FIX: Build query string manually instead of using `new URL()`
            // `new URL(relativeString)` throws "Invalid URL" when the base is
            // empty or a relative path. URLSearchParams + string concat is safe.
            const params = new URLSearchParams({
                initial: signature.signatureType === 'FULL' ? 'false' : 'true',
                certificateHash: certHash?.certificateHash ?? '',
                password: password,
            });

            const apiUrl = `/api/v1/signatures/${signature.id}/image?${params.toString()}`;

            const response: Response = await fetch(apiUrl, {
                method: 'GET',
                headers,
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw { response: { status: 401 } };
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const signatureBlob = await response.blob();
            setSignatureFile(signatureBlob as any);

            const img = new Image();
            const objectUrl = URL.createObjectURL(signatureBlob);
            img.src = objectUrl;

            img.onload = () => {
                setSignatureImg(img);

                const { width: initialWidth, height: initialHeight } = SIGNATURE_DIMENSIONS[signature.signatureType];

                const defaultRect: Rect = {
                    x: 100,
                    y: 100,
                    width: initialWidth,
                    height: initialHeight,
                    rotation: 0,
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

                URL.revokeObjectURL(objectUrl);
            };

            img.onerror = () => {
                console.error('Failed to load signature image');
                toast.error('Failed to load signature image');
                URL.revokeObjectURL(objectUrl);
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
    // ==================== Submit ====================

    const handleSubmit = async () => {
        if (signaturePlacements.size === 0 || !signatureFile || !pdf) {
            toast.error("Please select a signature and place it on the document");
            return;
        }

        if (!confirmedPassword) {
            toast.error("Certificate password is required. Please select your signature again.");
            return;
        }

        if (!email || !appKey || !appName) {
            setSubmitError("Missing required authentication data");
            return;
        }

        setVerifying(true);
        setSubmitError(null);

        const formData = new FormData();
        formData.append("key", key || "");
        formData.append("app_url", appUrl || "");
        formData.append("pdf_preview_url", pdfUrl || "");
        formData.append("original_filepath", originalFilePath || "");
        if (selectedSignature?.id) formData.append("signature_image_id", selectedSignature.id);
        if (certHash?.certificateHash) formData.append("certificate_hash", certHash.certificateHash);
        formData.append("password", confirmedPassword);
        formData.append("canvasWidth", canvasWidth.toString());
        formData.append("canvasHeight", canvasHeight.toString());
        formData.append("location", "Unknown Location");
        formData.append("userId", uuId);
        formData.append("a", a);
        if(recId) formData.append("id", recId);

        if (selectedSignature?.signatureType?.toString() === 'INITIAL') {
            formData.append("isInitial", "true");
        } else {
            formData.append("isInitial", "false");
        }

        if (signatureFile) {
            formData.append("signature_image", signatureFile);
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
            const headers: Record<string, string> = {
                "X-API-Key": import.meta.env.VITE_APP_KEY,
                "Accept": "application/json",
                "X-App-NAME": import.meta.env.VITE_APP_NAME ,
            };

            const response: Response = await fetch(
                `/api/v1/external/admin/external-systems/sign-document`,
                { method: 'POST', headers, body: formData }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw {
                    response: {
                        status: response.status,
                        data: errorData || { error: `HTTP error! status: ${response.status}` }
                    }
                };
            }

            const data = await response.json();

            if (data.signedFile) {
                toast.success(`Signature submitted successfully! Signed on ${signaturePlacements.size} page(s)`);

                console.log('✅ About to send postMessage...');
                console.log('Is in iframe?', window !== window.parent);
                window.parent.postMessage({
                    status: 'signed',
                    signedFile: data.signedFile,
                    pages: signaturePlacements.size
                }, '*');
                console.log('✅ postMessage sent!');

                toast.success("This tab will close after 5 seconds...");
                setTimeout(() => {
                    if (window.top) window.top.close();
                }, 5000);
            } else {
                toast.error(data.error || "Signing failed");
            }
        } catch (err: any) {
            console.error('Signing error:', err);
            if (err.response) {
                if (err.response.status === 403) {
                    setSubmitError("Access denied — you do not have permission to sign this document.");
                } else if (err.response.status === 401) {
                    setSubmitError("Invalid certificate password. Please select your signature again.");
                } else {
                    setSubmitError(err.response.data?.error || `HTTP error! status: ${err.response.status}`);
                }
            } else if (err.request) {
                setSubmitError("No response from server. Please check your connection.");
            } else {
                setSubmitError("Error connecting to server: " + (err.message ?? "Unknown error"));
            }
        } finally {
            setVerifying(false);
        }
    };

    // ==================== External Data Loading ====================

    useEffect(() => {
        if (!email || !appKey || !appName) return;
        let cancelled = false;
        setLoadingExternalData(true); setExternalDataError(null);
        const headers: Record<string, string> = { "X-API-Key": import.meta.env.VITE_APP_KEY, "Accept": "application/json", "X-App-NAME": import.meta.env.VITE_APP_NAME };

        (async () => {
            try {
                const [certRes, sigListRes] = await Promise.all([
                    fetch(`/api/v1/external/admin/external-systems/${encodeURIComponent(email)}/default-certificate`, { headers }),
                    fetch(`/api/v1/external/admin/external-systems/${encodeURIComponent(email)}/default-signatures`, { headers }),
                ]);

                const certData = certRes.ok ? await certRes.json() : null;
                const sigListData = sigListRes.ok ? await sigListRes.json() : [];

                if (cancelled) return;

                if (certData) setCertHash(certData);
                if (Array.isArray(sigListData)) setSignatures(sigListData);
            } catch (err: unknown) {
                if (!cancelled) {
                    const msg = err instanceof Error ? err.message : "Failed to load signature data.";
                    setExternalDataError(msg);
                }
            } finally {
                if (!cancelled) setLoadingExternalData(false);
            }
        })();

        return () => { cancelled = true; };
    }, [email, appKey]);

    // ==================== PDF Loading ====================

    useEffect(() => {
        if (!decodedPdfUrl) return;
        let cancelled = false; setLoadingPdf(true); setPdfError(null);
        (async () => {
            try {
                const res = await fetch(decodedPdfUrl, { mode: "cors", credentials: "omit" });
                if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
                const ab = await res.arrayBuffer();
                if (cancelled) return;
                setPdfBlob(new Blob([ab], { type: "application/pdf" }));
                const pdfDoc = await getDocument({ data: ab }).promise;
                if (cancelled) return;
                setPdf(pdfDoc); setCurrentPage(1); setSignaturePlacements(new Map()); setSignatureImg(null);
            } catch (err: unknown) {
                if (!cancelled) setPdfError(err instanceof Error ? err.message : "Failed to load PDF.");
            } finally { if (!cancelled) setLoadingPdf(false); }
        })();
        return () => { cancelled = true; };
    }, [decodedPdfUrl]);

    // ==================== Page Rendering ====================

    useEffect(() => {
        if (!pdf || !canvasRef.current) return;
        let renderTask: RenderTask | null = null; let isMounted = true;
        (async () => {
            try {
                const page = await pdf.getPage(currentPage);
                const scale = 800 / page.getViewport({ scale: 1 }).width;
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current!; const ctx = canvas.getContext("2d")!;
                canvas.width = viewport.width; canvas.height = viewport.height;
                setCanvasWidth(viewport.width); setCanvasHeight(viewport.height);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                renderTask = page.render({ canvasContext: ctx, viewport, canvas: canvas });
                await renderTask.promise;
                if (!isMounted) return;
                const img = new Image(); img.onload = () => { if (isMounted) setPageImage(img); }; img.src = canvas.toDataURL();
            } catch (err: unknown) { const e = err as Error; if (e?.name !== "RenderingCancelledException") console.error(e); }
        })();
        return () => { isMounted = false; try { renderTask?.cancel(); } catch { /**/ } };
    }, [pdf, currentPage]);

    // ==================== Redraw ====================

    useEffect(() => {
        if (!canvasRef.current || !pageImage) return;
        const canvas = canvasRef.current; const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(pageImage, 0, 0);
        const sigPos = signaturePlacements.get(currentPage);
        if (sigPos && signatureImg) {
            const rotation = sigPos.rotation || 0; const cx = sigPos.x + sigPos.width / 2; const cy = sigPos.y + sigPos.height / 2;
            ctx.save(); ctx.translate(cx, cy); ctx.rotate((rotation * Math.PI) / 180); ctx.translate(-cx, -cy);
            ctx.drawImage(signatureImg, sigPos.x, sigPos.y, sigPos.width, sigPos.height); ctx.restore();
            if (isHoveringSignature || isDraggingSignature || isResizingSignature || isRotatingSignature) drawRotatedSelectionBox(ctx, sigPos);
        }
    }, [pageImage, currentPage, signaturePlacements, signatureImg, isHoveringSignature, isDraggingSignature, isResizingSignature, isRotatingSignature]);

    // ==================== Mouse Leave ====================

    useEffect(() => {
        const h = () => {
            setIsDraggingSignature(false); setIsDrawing(false); setIsHoveringSignature(false);
            setIsResizingSignature(false); setIsRotatingSignature(false); setResizeDirection(null); setStartPos(null);
        };
        const canvas = canvasRef.current;
        canvas?.addEventListener("mouseleave", h); canvas?.addEventListener("touchcancel", h);
        return () => { canvas?.removeEventListener("mouseleave", h); canvas?.removeEventListener("touchcancel", h); };
    }, []);

    const sigReadyCount = signatures.length;
    const pdfFileName = decodedPdfUrl
        ? decodeURIComponent(decodedPdfUrl.split('/').pop() || 'Document')
        : "No document";

    // ==================== Render ====================

    return (
        <>
            {loadingPdf && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#19183B] mx-auto"></div>
                        <p className="mt-4 text-center">Loading PDF...</p>
                    </div>
                </div>
            )}

            <div className="relative min-h-screen overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-md"
                    style={{ backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)` }} />
                <div className="absolute inset-0 bg-black/30" />

                <div className="relative p-6 max-w-12xl mx-auto flex items-center justify-center min-h-screen">
                    <div className="relative bg-white rounded-xl shadow-sm border border-[#A1C2BD] overflow-hidden w-full flex flex-col"
                        style={{ height: "calc(100vh - 3rem)" }}>

                        {/* Header */}
                        <div className="bg-white border-b border-[#A1C2BD] p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#A1C2BD] rounded-lg">
                                    <File className="w-6 h-6 text-[#19183B]" />
                                </div>
                                <p className="text-[#708993] text-sm">
                                    {pdfFileName}{loadingPdf && " (Loading...)"}
                                </p>
                            </div>
                        </div>

                        {/* Inline Error Banners */}
                        {pdfError && (
                            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-600 text-sm"><strong>Error:</strong> {pdfError}</p>
                            </div>
                        )}
                        {submitError && (
                            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-600 text-sm"><strong>Error:</strong> {submitError}</p>
                            </div>
                        )}

                        {/* Nav & Controls */}
                        {pdf && (
                            <div className="bg-white border-b border-[#A1C2BD] p-4 flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage <= 1}
                                        className="p-2 border border-[#A1C2BD] rounded-lg text-[#19183B] hover:bg-[#E7F2EF] disabled:opacity-40"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm font-medium text-[#19183B]">
                                        Page {currentPage} of {pdf.numPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(pdf.numPages, p + 1))}
                                        disabled={currentPage >= pdf.numPages}
                                        className="p-2 border border-[#A1C2BD] rounded-lg text-[#19183B] hover:bg-[#E7F2EF] disabled:opacity-40"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                    <input
                                        type="number"
                                        min={1}
                                        max={pdf.numPages}
                                        value={currentPage}
                                        onChange={e => setCurrentPage(Math.max(1, Math.min(pdf.numPages, parseInt(e.target.value) || 1)))}
                                        className="w-20 text-center border border-[#A1C2BD] rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#708993]"
                                    />
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    {currentSignaturePosition && signatureImg && (
                                        <>
                                            <button
                                                onClick={handleRotateSignature}
                                                className="flex items-center gap-1 px-3 py-2 border border-[#A1C2BD] rounded-lg text-sm text-[#19183B] hover:bg-[#E7F2EF]"
                                            >
                                                <RotateCw className="w-4 h-4" /> Rotate
                                            </button>
                                            <button
                                                onClick={handleResizeToOriginal}
                                                className="flex items-center gap-1 px-3 py-2 border border-[#A1C2BD] rounded-lg text-sm text-[#19183B] hover:bg-[#E7F2EF]"
                                            >
                                                <Maximize2 className="w-4 h-4" /> Reset Size
                                            </button>
                                            <button
                                                onClick={() => setCopyModeDialogOpen(true)}
                                                className="flex items-center gap-1 px-3 py-2 border border-[#A1C2BD] rounded-lg text-sm text-[#19183B] hover:bg-[#E7F2EF]"
                                            >
                                                <Copy className="w-4 h-4" /> Copy to Pages
                                            </button>
                                            <button
                                                onClick={handleRemoveSignature}
                                                className="px-3 py-2 border border-red-300 rounded-lg text-sm text-red-600 hover:bg-red-50"
                                            >
                                                Remove Signature
                                            </button>
                                        </>
                                    )}

                                    <button
                                        onClick={handleChooseSignatureType}
                                        disabled={sigReadyCount === 0 || loadingExternalData}
                                        className="flex items-center gap-1 px-3 py-2 border border-[#A1C2BD] rounded-lg text-sm text-[#19183B] hover:bg-[#E7F2EF] disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <FileSignature className="w-4 h-4" />
                                        {loadingExternalData ? "Loading…" : "Select Signature Type"}
                                    </button>

                                    <button
                                        onClick={handleSubmit}
                                        disabled={signaturePlacements.size === 0 || verifying}
                                        className="px-4 py-2 bg-[#19183B] text-white rounded-lg text-sm hover:bg-[#708993] disabled:opacity-40 transition-colors flex items-center gap-2"
                                    >
                                        {verifying ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                                Signing...
                                            </>
                                        ) : "Issue Certificate"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Canvas Area */}
                        <div
                            ref={canvasScrollRef}
                            className="overflow-y-auto overflow-x-auto bg-gray-400 p-6"
                            style={{ flex: '1 1 0', minHeight: 0 }}
                        >
                            {/* Zoom Controls */}
                            {pdf && (
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
                                {loadingPdf ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-white">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4" />
                                        <p>Loading PDF...</p>
                                    </div>
                                ) : !decodedPdfUrl ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-white">
                                        <File className="w-16 h-16 mb-4" />
                                        <p className="text-lg">No PDF URL provided.</p>
                                    </div>
                                ) : !pdf && !pdfError ? (
                                    <p className="text-white py-20">Preparing document...</p>
                                ) : pdf ? (
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
                                            className="border border-[#A1C2BD] touch-none block"
                                            style={{
                                                cursor: isHoveringSignature ? "grab" : isDrawing ? "crosshair" : "default",
                                                maxWidth: "100%",
                                                width: "100%",
                                            }}
                                        />
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Choose Signature Type Dialog */}
            <Dialog.Root open={chooseSignatureTypeDialogOpen} onOpenChange={setChooseSignatureTypeDialogOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] p-6 border-2 border-[#A1C2BD] flex flex-col">
                        <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B] mb-4">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <FileSignature className="w-6 h-6 text-[#19183B]" />
                            </div>
                            Select Signature Type
                        </Dialog.Title>
                        <p className="text-[#708993] mb-6">
                            Select the type of signature you want to use. (Default signature)
                        </p>
                        <div className="space-y-4 mb-6 overflow-y-auto">
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
                                                previewUrl={'v1/external/admin/external-systems/signatures/' + (signatures.find(sig => sig.signatureType === "FULL")?.id || "") + '/preview'}
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
                                                previewUrl={'v1/external/admin/external-systems/signatures/' + (signatures.find(sig => sig.signatureType === "INITIAL")?.id || "") + '/preview'}
                                            />
                                        </div>
                                    </div>
                                </label>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setChooseSignatureTypeDialogOpen(false)}
                                className="flex-1 px-6 py-3 border-2 border-[#A1C2BD] rounded-xl text-[#19183B] hover:bg-[#E7F2EF]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedSignatureType) {
                                        const sig = signatures.find(s => s.signatureType === selectedSignatureType);
                                        if (sig) {
                                            pendingSignatureRef.current = sig;
                                            setSigPasswordError(null);
                                            setSigPassword("");
                                            setSigPasswordDialogOpen(true);
                                        }
                                    }
                                }}
                                disabled={!selectedSignatureType}
                                className="flex-1 px-6 py-3 bg-[#19183B] text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                Apply
                            </button>
                        </div>
                        <Dialog.Close className="absolute top-4 right-4 p-2 hover:bg-red-50 rounded-lg">
                            <X className="w-5 h-5 text-[#708993]" />
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
                    <Dialog.Content className="fixed top-1/2 left-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-[#A1C2BD]">
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
                                <label className="block text-sm font-medium text-[#19183B] mb-2">Certificate Password</label>
                                <input
                                    type="password"
                                    placeholder="Enter your certificate password"
                                    value={sigPassword}
                                    onChange={e => setSigPassword(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && sigPassword && pendingSignatureRef.current) {
                                            handleSignatureSelection(pendingSignatureRef.current, sigPassword);
                                        }
                                    }}
                                    autoFocus
                                    className="w-full border border-[#A1C2BD] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#708993]"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setSigPasswordDialogOpen(false);
                                        setSigPassword("");
                                        setSigPasswordError(null);
                                        pendingSignatureRef.current = null;
                                    }}
                                    disabled={isLoadingSignature}
                                    className="flex-1 px-4 py-2 border border-[#A1C2BD] rounded-xl text-[#19183B] hover:bg-[#E7F2EF] disabled:opacity-40"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (sigPassword && pendingSignatureRef.current) {
                                            handleSignatureSelection(pendingSignatureRef.current, sigPassword);
                                        }
                                    }}
                                    disabled={!sigPassword || isLoadingSignature}
                                    className="flex-1 px-4 py-2 bg-[#19183B] text-white rounded-xl hover:bg-[#708993] disabled:opacity-40 flex items-center justify-center gap-2"
                                >
                                    {isLoadingSignature ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                            Loading...
                                        </>
                                    ) : "Confirm"}
                                </button>
                            </div>
                        </div>
                        <Dialog.Close className="absolute top-4 right-4 p-2 hover:bg-red-50 rounded-lg">
                            <X className="w-5 h-5 text-[#708993]" />
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Copy to Pages Dialog */}
            <Dialog.Root open={copyModeDialogOpen} onOpenChange={setCopyModeDialogOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-[#A1C2BD]">
                        <Dialog.Title className="flex items-center gap-2 text-xl font-bold text-[#19183B] mb-4">
                            <div className="p-2 bg-[#A1C2BD] rounded-lg">
                                <Copy className="w-5 h-5 text-[#19183B]" />
                            </div>
                            Copy Signature to Pages
                        </Dialog.Title>
                        <div className="space-y-5 pt-2">
                            <p className="text-sm text-[#708993]">Specify which pages to copy the signature to:</p>
                            <div>
                                <label className="block text-sm font-medium text-[#19183B] mb-2">Page Numbers</label>
                                <input
                                    type="text"
                                    placeholder="e.g., 1,4,7-10 or 'all'"
                                    value={copyToPages}
                                    onChange={e => setCopyToPages(e.target.value)}
                                    className="w-full border border-[#A1C2BD] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#708993]"
                                />
                                <p className="text-xs text-[#708993] mt-2">
                                    Examples: "1,4" (pages 1 and 4), "1-10" (pages 1 to 10), "all" (all pages)
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => { setCopyModeDialogOpen(false); setCopyToPages(""); }}
                                    className="flex-1 px-4 py-2 border border-[#A1C2BD] rounded-xl text-[#19183B] hover:bg-[#E7F2EF]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCopyConfirm}
                                    disabled={!copyToPages.trim()}
                                    className="flex-1 px-4 py-2 bg-[#19183B] text-white rounded-xl hover:bg-[#708993] disabled:opacity-40"
                                >
                                    Copy Signature
                                </button>
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

export default SignExternal;