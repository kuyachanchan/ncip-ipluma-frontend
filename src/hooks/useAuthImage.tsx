import { useEffect, useRef, useState } from "react";
import api from "@/api/axiosInstance";
import axios from "axios";

interface UseAuthImageOptions {
  url: string;
}

export function useAuthImage({ url }: UseAuthImageOptions) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!url) return;

    setLoading(true);
    setError(null);

    // Local URLs (blob/data)
    if (url.startsWith("blob:") || url.startsWith("data:")) {
      setImageSrc(url);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchImage = async () => {
      try {
        const response = await api.get(url, {
          responseType: "blob",
          signal: controller.signal,
        });

        const objectUrl = URL.createObjectURL(response.data);

        // Cleanup previous object URL
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }

        objectUrlRef.current = objectUrl;
        setImageSrc(objectUrl);
      } catch (err: any) {
        // ✅ Ignore cancelation
        if (
          err?.name === "CanceledError" ||
          axios.isCancel(err)
        ) {
          return;
        }

        setError(err?.message || "Image fetch failed");
      } finally {
        setLoading(false);
      }
    };

    fetchImage();

    return () => {
      controller.abort();

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [url]);

  return { imageSrc, loading, error };
}
