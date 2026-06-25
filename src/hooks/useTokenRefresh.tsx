import { useCallback } from 'react';

export const useTokenRefresh = () => {
  const handleTokenRefresh = useCallback(async () => {
    const refreshToken = sessionStorage.getItem('refreshToken');

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/v1/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      if (data.token) {
        sessionStorage.setItem('authToken', data.token);

        // Optionally update refresh token if a new one is provided
        if (data.refreshToken) {
          sessionStorage.setItem('refreshToken', data.refreshToken);
        }

        return data.token; // Return new token if needed
      } else {
        throw new Error('No new access token received');
      }
    } catch (error) {
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('refreshToken');
      //window.location.href = '/login';
      throw error;
    }
  }, []);

  return { handleTokenRefresh };
};
