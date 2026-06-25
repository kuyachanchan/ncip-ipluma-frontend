/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import api from "../api/axiosInstance";
import { AuthContext } from "./AuthContext";
import { setupAxiosInterceptors } from "../api/setupInterceptors";
import { type User } from "../types/auth";
import { setAuthHelpers } from "./authHelpers";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | undefined>(undefined);
  const [isInitialized, setIsInitialized] = useState(false);

  // ✅ Login - FIXED: Don't call /auth/me after login
  const login = async (username: string, password: string): Promise<User> => {
    try {
      //console.log('🔐 Attempting login...');
      
      const res = await api.post("/auth/login", { username, password }, {
        withCredentials: true
      });

      /*console.log('✅ Login successful:', {
        status: res.status,
        data: res.data,
        hasSetCookie: res.headers['set-cookie'] ? 'yes' : 'no'
      });*/
      
      // ✅ Set user data directly from login response
      // The login response should already contain the user object
      setUser(res.data);
      setIsAuthenticated(true);
      
      // ❌ REMOVED: Don't call /auth/me after login!
      // The cookies are set and will work on subsequent requests
      return res.data;
    } catch (error) {
      //console.error('❌ Login failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    }
  };

  const updateUserProperty = useCallback(<K extends keyof User>(
    key: K, 
    value: User[K]
  ): void => {
    setUser(prevUser => {
      if (!prevUser) {
        //console.warn('Cannot update property: no user logged in');
        return null;
      }
      return { ...prevUser, [key]: value };
    });

    // Force a re-render by updating a dummy state
    // This helps with immediate re-evaluation of guards
    setUser(current => current);
  }, []);


  // ✅ Refresh token
  const refreshAccessToken = async (): Promise<boolean> => {
    //console.log('🔄 Starting token refresh via cookies...');
    
    try {
      // For cookie-based auth, just call the endpoint
      // Cookies will be sent automatically with withCredentials: true
      const res = await api.post("/auth/refresh-token");
      
      //console.log('✅ Token refresh successful, user data:', res.data);
      
      // Update user data from response
      setUser(res.data);
      setIsAuthenticated(true);
      return true;
    } catch (error: any) {
      /*console.error('❌ Token refresh failed:', {
        status: error.response?.status,
        message: error.message,
        isRefreshTokenFailed: error.isRefreshTokenFailed
      });*/
      
      // Don't call logout here - let the interceptor handle it
      return false;
    }
  };

  // ✅ Logout
  const logout = async (): Promise<void> => {
    try {
      // Call logout API (cookies will be sent)
      await api.post("/auth/logout");
      //console.log("✅ Logout API call successful");
    } catch(error) {
      //console.log("⚠️ Logout API call failed", error);
    } finally {
      // Always clear the local auth state
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // ✅ Setup interceptors ONCE
  useEffect(() => {
    const authActions = { refreshAccessToken, logout };
    setupAxiosInterceptors(authActions);
    
    // ALSO setup the auth helpers for other parts of the app
    setAuthHelpers({
      refresh: refreshAccessToken,
      logout: logout
    });
    
    //console.log('✅ Auth interceptors initialized');
  }, []);

  // ✅ Load user ONCE at startup (only on app initialization)
  useEffect(() => {
    const initAuth = async () => {
      //console.log('🔍 Initializing auth state...');
      
      try {
        // Try to get current user (this checks if user has valid session)
        const res = await api.get<User>("/auth/me", { withCredentials: true });
        
        //console.log('✅ Auth initialized - user logged in:', res.data);
        setUser(res.data);
        setIsAuthenticated(true);
      } catch (error: any) {
        /*console.log('🔴 Auth initialization failed (not logged in):', {
          status: error.response?.status,
          message: error.message
        });*/
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsInitialized(true);
      }
    };

    initAuth();
  }, []);

  // In your AuthProvider component, add this useEffect
  useEffect(() => {
    /*console.log('🔄 Auth state updated:', { 
      isAuthenticated, 
      user: user ? { 
        id: user.id, 
        username: user.username, 
        finishedSetup: user.finishedSetup 
      } : null 
    });*/
  }, [user, isAuthenticated]);

  // Don't render children until auth state is determined
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, updateUserProperty, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};