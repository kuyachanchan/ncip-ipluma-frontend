// components/SignatureCanvas.tsx
import React, { useRef } from 'react';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SignatureCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  pageImage: HTMLImageElement | null;
  signatureImg: HTMLImageElement | null;
  signaturePosition: Rect | null;
  isDrawing: boolean;
  isDraggingSignature: boolean;
  isHoveringSignature: boolean;
  startPos: { x: number; y: number; xOffset?: number; yOffset?: number } | null;
  currentPage: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  drawCanvas: (pos: { x: number; y: number }) => void;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  canvasRef,
  pageImage,
  isDraggingSignature,
  isHoveringSignature,
  onMouseDown,
  onMouseUp,
  drawCanvas,
}) => {
  const isDrawingFrame = useRef(false);
  const latestMousePos = useRef<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current || !pageImage) return;

    const canvas = canvasRef.current;
    const rectBounds = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rectBounds.width;
    const scaleY = canvas.height / rectBounds.height;

    const currentX = (e.clientX - rectBounds.left) * scaleX;
    const currentY = (e.clientY - rectBounds.top) * scaleY;

    latestMousePos.current = { x: currentX, y: currentY };

    if (!isDrawingFrame.current) {
      isDrawingFrame.current = true;
      requestAnimationFrame(() => {
        isDrawingFrame.current = false;
        if (latestMousePos.current) {
          drawCanvas(latestMousePos.current);
        }
      });
    }
  };

  const cursor = isDraggingSignature ? 'grabbing' : 
                (isHoveringSignature ? 'grab' : 'crosshair');

  return (
    <div className="flex justify-center overflow-auto max-h-[800px]">
      <canvas
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={onMouseUp}
        style={{ cursor }}
        className="border border-slate-300 rounded-lg shadow-sm max-w-full h-auto"
      />
    </div>
  );
};