/* eslint-disable @typescript-eslint/no-explicit-any */
import api from "../api/axiosInstance";
import type { AuthActions } from "@/types/auth";

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export function setupAxiosInterceptors(actions: AuthActions) {
  //console.log('🔄 Setting up axios interceptors for cookie-based auth...');

  api.interceptors.response.use(
    (response) => {
      // Log successful responses for debugging (excluding auth/me to reduce noise)
      if (response.config.url?.includes('/auth/') && !response.config.url?.includes('/auth/me')) {
        /*console.log('✅ Auth response:', {
          url: response.config.url,
          status: response.status,
          hasSetCookie: response.headers['set-cookie'] ? 'yes' : 'no',
          cookieCount: response.headers['set-cookie']?.length || 0
        });*/
      }
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      /*console.log('🔴 Interceptor caught error:', {
        status: error.response?.status,
        url: originalRequest?.url,
        path: originalRequest?.url?.replace(api.defaults.baseURL || '', ''),
        isRetry: originalRequest?._retry
      });*/

      // =========================================================================
      // 🔴 SPECIAL CASE 1: Refresh token endpoint itself failed (401)
      // This means refresh token is invalid/expired - force logout
      // =========================================================================
      if (
        error.response?.status === 401 &&
        originalRequest?.url?.includes("/auth/refresh-token")
      ) {
        //console.log('🔴 Refresh token endpoint returned 401 - refresh token invalid/expired');
        //console.log('🔄 Forcing logout...');
        
        // Don't retry - just logout
        await actions.logout();
        
        // Reject with special flag so other parts know this was a refresh failure
        return Promise.reject({
          ...error,
          isRefreshTokenFailed: true,
          message: 'Refresh token invalid or expired'
        });
      }

      // =========================================================================
      // 🔴 SPECIAL CASE 2: Initial auth check (/auth/me) failed
      // This happens on app startup - DON'T try to refresh, just fail silently
      // =========================================================================
      if (
        error.response?.status === 401 &&
        originalRequest?.url?.includes("/auth/me")
      ) {
        //console.log('🔴 Initial auth check (/auth/me) failed - user not logged in');
        // Just reject - don't try to refresh or logout
        return Promise.reject(error);
      }

      // =========================================================================
      // 🔴 SPECIAL CASE 3: Login endpoint failed
      // Just reject - login failure is handled by UI
      // =========================================================================
      if (originalRequest?.url?.includes("/auth/login")) {
        //console.log('🔴 Login request failed');
        return Promise.reject(error);
      }

      // =========================================================================
      // 🔴 SPECIAL CASE 4: Logout endpoint failed
      // Just clear local state and reject
      // =========================================================================
      if (originalRequest?.url?.includes("/auth/logout")) {
        //console.log('🔴 Logout request failed, clearing local state anyway');
        return Promise.reject(error);
      }

      // =========================================================================
      // 🔄 REGULAR HANDLING: For other 401/403 errors AFTER user is logged in
      // Try to refresh the token and retry the request
      // =========================================================================
      if (
        (error.response?.status === 401 || error.response?.status === 403) &&
        !originalRequest?._retry &&
        !originalRequest?.url?.includes("/auth/") && // Don't intercept ANY auth endpoints
        !originalRequest?.url?.includes("/v1/sign-document-multi") &&
        !originalRequest?.url?.includes("/v1/verify-document") &&
        !originalRequest?.url?.includes("/v1/download/")
      ) {
        // If we're already refreshing, queue the request
        if (isRefreshing) {
          //console.log('⏳ Token refresh in progress, queuing request...');
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => {
              //console.log('🔄 Processing queued request...');
              return api(originalRequest);
            })
            .catch(err => {
              //console.error('❌ Queued request failed:', err);
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;
        //console.log(`🔄 Attempting token refresh (original: ${originalRequest.url})`);

        try {
          const refreshed = await actions.refreshAccessToken();
          //console.log('✅ Token refresh result:', refreshed);
          
          if (refreshed) {
            // Process all queued requests
            processQueue(null);
            //console.log(`🔄 Retrying original request: ${originalRequest.url}`);
            return api(originalRequest);
          } else {
            //console.log('❌ Token refresh returned false, logging out...');
            processQueue(new Error('Refresh failed'));
            await actions.logout();
            return Promise.reject(new Error('Authentication failed'));
          }
        } catch (refreshError: any) {
          /*console.error('❌ Token refresh error:', {
            message: refreshError.message,
            isRefreshTokenFailed: refreshError.isRefreshTokenFailed
          });*/
          
          // If refresh failed due to invalid refresh token, logout
          if (refreshError.isRefreshTokenFailed) {
            //console.log('🔴 Refresh token invalid, forcing logout...');
            processQueue(refreshError);
            await actions.logout();
          } else {
            processQueue(refreshError);
          }
          
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // =========================================================================
      // For all other errors
      // =========================================================================
      return Promise.reject(error);
    }
  );

  // =========================================================================
  // Request interceptor for debugging
  // =========================================================================
  api.interceptors.request.use(
      (config) => {
        // Log requests for debugging (excluding auth/me to reduce noise)
        if (!config.url?.includes('/auth/me')) {
          /*console.log('📤 Request:', {
            url: config.url,
            method: config.method,
            withCredentials: config.withCredentials,
            hasAuthHeader: !!config.headers.Authorization
          });*/
        }
        return config;
      },
      (error) => {
        //console.error('📤 Request interceptor error:', error);
        return Promise.reject(error);
      }
    );
  }