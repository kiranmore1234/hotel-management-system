"use client";

import { createContext, useContext } from "react";

export type UserRole = string;

export type AuthUser = {
  id: number;
  name: string;
  username: string;
  role: UserRole;
  isActive: boolean;
};

export type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isManager: boolean;
  login: (username: string, password?: string, pin?: string) => Promise<AuthUser>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

export function isManagerOrAdmin(role: string): boolean {
  return role === "Manager" || role === "Admin";
}
