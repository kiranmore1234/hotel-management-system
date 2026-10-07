"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { isManagerOrAdmin } from "@/lib/auth";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    router.replace(isManagerOrAdmin(user.role) ? "/dashboard" : "/tables");
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 text-slate-600">
      Redirecting…
    </div>
  );
}
