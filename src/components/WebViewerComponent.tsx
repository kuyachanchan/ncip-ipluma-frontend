/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import WebViewer, { WebViewerInstance } from "@pdftron/webviewer";




export interface WebViewerHandle {
  instance: WebViewerInstance | null;
  loadDocument: (url: string) => void;
}

interface Props {
  fileUrl: string | null;
  currentPage: number;
  onPageCountChange: (count: number) => void;
}

const WebViewerComponent = forwardRef<WebViewerHandle, Props>(
  ({ fileUrl, currentPage, onPageCountChange }, ref) => {
    const viewerDiv = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<WebViewerInstance | null>(null);

    useImperativeHandle(ref, () => ({
      instance: instanceRef.current,
      loadDocument: (url: string) => {
        instanceRef.current?.Core.documentViewer.loadDocument(url);
      }
    }));

    useEffect(() => {
      if (!viewerDiv.current) return;

      WebViewer(
        {
          path: `${import.meta.env.BASE_URL}webviewer`, // ensures path works in prod
          initialDoc:"http://localhost:8081/api/v1/documents/view/2/documents/a9c838ba-ecd1-4454-bc94-da2152b70c68.pdf"
        },
        viewerDiv.current
      ).then((instance) => {
        instanceRef.current = instance;

        instance.Core.documentViewer.addEventListener("documentLoaded", () => {
          const pageCount = instance.Core.documentViewer.getPageCount();
          onPageCountChange(pageCount);
        });

        instance.UI.setToolbarGroup("toolbarGroup-Annotate");
      });
    }, []);

    useEffect(() => {
      if (fileUrl && instanceRef.current) {
        instanceRef.current.Core.documentViewer.loadDocument(fileUrl);
      }
    }, [fileUrl]);

    useEffect(() => {
      if (instanceRef.current) {
        instanceRef.current.Core.documentViewer.setCurrentPage(currentPage, false);
      }
    }, [currentPage]);

    return <div ref={viewerDiv} style={{ height: "100%", width: "100%" }} />;
  }
);

export default WebViewerComponent;
