// types/auth.ts
export interface User {
  id: string;
  username: string;
  email: string;
  roles: Role[];
  lastSetupNumber?: number;
  finishedSetup?: boolean;
}

export type Role = 'ROLE_SUPERADMIN' | 'ROLE_USER' | 'ROLE_ADMIN';

export interface AuthActions {
  refreshAccessToken: () => Promise<boolean>;
  logout: () => Promise<void>;
}


export interface Auth{
    isAuthenticated: boolean | undefined;
    user: User | null;
    login: (username: string, password:string) => Promise<User>;
  logout: () => void;
  updateUserProperty: <K extends keyof User>(key: K, value: User[K]) => void;
  setUser: (user: User | null) => void;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user?: User;
  message?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  success: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  clearSuccess: () => void;
}