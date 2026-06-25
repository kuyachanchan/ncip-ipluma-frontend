// hooks/useSignatureManager.ts
import { useState } from 'react';

interface Rect {
  rotation: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const useSignatureManager = () => {
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signatureImg, setSignatureImg] = useState<HTMLImageElement | null>(null);
  const [certificate, setCertificate] = useState<File>();
  const [signaturePlacements, setSignaturePlacements] = useState<Map<number, Rect>>(new Map());
  const [multiPageMode, setMultiPageMode] = useState(false);

  // Flexible signature upload that accepts both events and File objects
  const handleSignatureUpload = (input: React.ChangeEvent<HTMLInputElement> | File) => {
    let file: File | null = null;
    
    if (input instanceof File) {
      // Handle direct File object
      file = input;
    } else if (input.target?.files?.[0]) {
      // Handle event from file input
      file = input.target.files[0];
    }
    
    if (file) {
      setSignatureFile(file);
      
      // Create and set image element for preview/rendering
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;
      img.onload = () => {
        setSignatureImg(img);
      };
    }
  };

  const handleCertificateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setCertificate(file);
  };

  const addSignaturePlacement = (page: number, rect: Rect) => {
    const newPlacements = new Map(signaturePlacements);
    newPlacements.set(page, rect);
    setSignaturePlacements(newPlacements);
  };

  const removeSignaturePlacement = (page: number) => {
    const newPlacements = new Map(signaturePlacements);
    newPlacements.delete(page);
    setSignaturePlacements(newPlacements);
  };

  const updateSignaturePlacement = (page: number, rect: Rect) => {
    const newPlacements = new Map(signaturePlacements);
    newPlacements.set(page, rect);
    setSignaturePlacements(newPlacements);
  };

  // Clear all signature data
  const clearSignature = () => {
    setSignatureFile(null);
    setSignatureImg(null);
    setSignaturePlacements(new Map());
  };

  return {
    signatureFile,
    signatureImg,
    certificate,
    signaturePlacements,
    multiPageMode,
    setSignatureFile, // Now exported
    setSignatureImg,
    setCertificate,
    setMultiPageMode,
    handleSignatureUpload,
    handleCertificateUpload,
    addSignaturePlacement,
    removeSignaturePlacement,
    updateSignaturePlacement,
    setSignaturePlacements,
    clearSignature,
  };
};