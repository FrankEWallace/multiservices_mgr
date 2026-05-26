import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi, setAuthToken, getAuthToken, User } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (accessToken: string) => Promise<void>;
  register: (data: { email: string; username: string; password: string; fullName?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const userData = await authApi.me();
          setUser(userData);
        } catch {
          setAuthToken(null);
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: userData, token } = await authApi.login(email, password);
    setAuthToken(token);
    setUser(userData);
  }, []);

  const loginWithGoogle = useCallback(async (accessToken: string) => {
    const { user: userData, token } = await authApi.googleLogin(accessToken);
    setAuthToken(token);
    setUser(userData);
  }, []);

  const register = useCallback(
    async (data: { email: string; username: string; password: string; fullName?: string }) => {
      const { user: userData, token } = await authApi.register(data);
      setAuthToken(token);
      setUser(userData);
    },
    [],
  );

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithGoogle,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
