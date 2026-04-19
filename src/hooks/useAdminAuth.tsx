import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AdminAuthContextType {
  emailVerified: boolean;
  pinVerified: boolean;
  fullyAuthenticated: boolean;
  setEmailVerified: (v: boolean) => void;
  setPinVerified: (v: boolean) => void;
  logoutAdmin: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

const STORAGE_KEY = "admin_auth_state_v1";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [emailVerified, setEmailVerifiedState] = useState(false);
  const [pinVerified, setPinVerifiedState] = useState(false);

  // Restore (sessionStorage so it dies with the tab)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setEmailVerifiedState(!!parsed.emailVerified);
        setPinVerifiedState(!!parsed.pinVerified);
      }
    } catch {
      // ignore
    }
  }, []);

  const persist = (e: boolean, p: boolean) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ emailVerified: e, pinVerified: p }));
    } catch {
      // ignore
    }
  };

  const setEmailVerified = (v: boolean) => {
    setEmailVerifiedState(v);
    persist(v, v ? pinVerified : false);
    if (!v) setPinVerifiedState(false);
  };

  const setPinVerified = (v: boolean) => {
    setPinVerifiedState(v);
    persist(emailVerified, v);
  };

  const logoutAdmin = () => {
    setEmailVerifiedState(false);
    setPinVerifiedState(false);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        emailVerified,
        pinVerified,
        fullyAuthenticated: emailVerified && pinVerified,
        setEmailVerified,
        setPinVerified,
        logoutAdmin,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
