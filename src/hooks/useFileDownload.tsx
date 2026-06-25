import { useState } from 'react';
import api from '@/api/axiosInstance';

export const useFileDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadFile = async (filename: string, apiEndpoint?: string) => {
    setIsDownloading(true);
    setError(null);

    try {
      // 1️⃣ Initial download request with blob response type
      const response = await api.get(
        apiEndpoint || `v1/download/${filename}`,
        {
          responseType: 'blob',
        }
      );

      // 2️⃣ Axios automatically handles 401 via interceptors (if configured)
      // No need to check here if your interceptor handles token refresh

      // 3️⃣ If we reach here, response was successful (2xx status)
      // Process download
      const blob = response.data; // Axios returns blob in response.data
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
    } catch (err: any) {
      // Axios throws errors for non-2xx status codes
      let errorMessage = 'Download failed';

      if (err.response) {
        // Server responded with error status
        const status = err.response.status;
        
        if (status === 403) {
          errorMessage = 'Access denied — you do not have permission to download this file.';
        } else if (status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (status === 404) {
          errorMessage = 'File not found.';
        } else {
          errorMessage = `Download failed: ${err.response.statusText || 'Unknown error'}`;
        }
      } else if (err.request) {
        // Request made but no response
        errorMessage = 'Network error. Please check your connection.';
      } else {
        // Error setting up request
        errorMessage = err.message || 'Download failed';
      }

      setError(errorMessage);
      setIsDownloading(false);
      return false;
    }
  };

  return { downloadFile, isDownloading, error };
};