// hooks/usePdfLoader.ts
import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from "pdfjs-dist";

export const usePdfLoader = (file: File | Blob | null) => {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!file) {
      setPdf(null);
      setCurrentPage(1);
      return;
    }
    
    const fileReader = new FileReader();
    let isMounted = true;
    
    fileReader.onload = async () => {
      if (!isMounted) return;
      
      const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
      
      // Clean up previous PDF if exists
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      
      try {
        const pdfDoc = await pdfjsLib.getDocument({
          data: typedArray,
          disableAutoFetch: true,
          disableStream: true,
        }).promise;
        
        if (!isMounted) return;
        
        setPdf(pdfDoc);
        setCurrentPage(1);
        
        // Store cleanup function
        cleanupRef.current = () => {
          try {
            pdfDoc.destroy();
          } catch (error) {
            console.log('Error destroying PDF:', error);
          }
        };
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };
    
    fileReader.readAsArrayBuffer(file);
    
    return () => {
      isMounted = false;
      fileReader.abort();
    };
  }, [file]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return { pdf, currentPage, setCurrentPage };
};