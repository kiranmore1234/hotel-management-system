"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setStoredToken } from "@/lib/api";
import {
  AuthContext,
  isManagerOrAdmin,
  type AuthUser,
  type UserRole,
} from "@/lib/auth";

type LoginResponse = {
  token: string;
  userId: number;
  name: string;
  username: string;
  role: string;
  expiresAt: string;
};

type ApiUser = Omit<AuthUser, "id"> & { id: number };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const token = window.localStorage.getItem("niyojan_token");
    if (!token) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    void api<ApiUser>("/api/auth/me")
      .then((currentUser) => {
        if (active) setUser({ ...currentUser, role: currentUser.role as UserRole });
      })
      .catch(() => {
        setStoredToken(null);
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (username: string, password?: string, pin?: string) => {
      const response = await api<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password, pin }),
        skipAuth: true,
      });
      setStoredToken(response.token);
      const authenticatedUser: AuthUser = {
        id: response.userId,
        name: response.name,
        username: response.username,
        role: response.role as UserRole,
        isActive: true,
      };
      setUser(authenticatedUser);
      return authenticatedUser;
    },
    []
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isManager: user ? isManagerOrAdmin(user.role) : false,
      login,
      logout,
    }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { useAuth } from "@/lib/auth";
