import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  getCurrentUser,
  loginUser,
  registerUser,
  setAuthToken,
  getAuthToken,
  type UserResponse,
  type UserLoginRequest,
  type UserRegisterRequest,
} from "@/lib/api";

interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: UserLoginRequest) => Promise<void>;
  register: (payload: UserRegisterRequest) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = useCallback(async () => {
    const existingToken = getAuthToken();
    if (!existingToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const profile = await getCurrentUser();
      setUser(profile);
      setToken(existingToken);
    } catch (err) {
      // Invalid or expired token: clear credentials cleanly.
      // Do not silently downgrade an authenticated user's session without resetting state.
      setAuthToken(null);
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials: UserLoginRequest) => {
    setIsLoading(true);
    try {
      const { access_token } = await loginUser(credentials);
      setAuthToken(access_token);
      setToken(access_token);
      const profile = await getCurrentUser();
      setUser(profile);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: UserRegisterRequest) => {
    setIsLoading(true);
    try {
      // Register user account
      await registerUser(payload);
      // Automatically log in with same credentials
      await login({ email: payload.email, password: payload.password });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: Boolean(user && token),
        login,
        register,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
