import { useState } from 'react';
import { useTokenRefresh } from './useTokenRefresh';

export const useFileDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { handleTokenRefresh } = useTokenRefresh();

  const downloadFile = async (filename: string, apiEndpoint?: string) => {
    setIsDownloading(true);
    setError(null);

    const authToken = sessionStorage.getItem('authToken');

    try {
      // 1️⃣ Initial download request
      let response = await fetch(apiEndpoint || `/api/v1/download/${filename}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // 2️⃣ Handle 401: token expired → refresh
      if (response.status === 401) {
        try {
          const newToken = await handleTokenRefresh();
          if (!newToken) throw new Error('Failed to refresh token');

          // Retry with new token
          response = await fetch(apiEndpoint || `/api/download/${filename}`, {
            headers: {
              Authorization: `Bearer ${newToken}`,
            },
          });
        } catch (refreshError) {
          throw new Error('Session expired — please log in again.');
        }
      }

      // 3️⃣ Handle 403: forbidden access
      if (response.status === 403) {
        throw new Error('Access denied — you do not have permission to download this file.');
      }

      // 4️⃣ Handle all other non-OK responses
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      // 5️⃣ Process download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      a.remove();
      setIsDownloading(false);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      setError(errorMessage);
      setIsDownloading(false);
      return false;
    }
  };

  return { downloadFile, isDownloading, error };
};
