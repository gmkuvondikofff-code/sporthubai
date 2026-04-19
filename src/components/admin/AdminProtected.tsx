import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function AdminProtected({ children }: { children: ReactNode }) {
  const { fullyAuthenticated, emailVerified } = useAdminAuth();
  if (!fullyAuthenticated) {
    return <Navigate to={emailVerified ? "/admin/verify-pin" : "/admin/login"} replace />;
  }
  return <>{children}</>;
}
