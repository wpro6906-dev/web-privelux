import React, { createContext, useContext, useEffect, useState } from "react";

interface AdminAuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => {
    return localStorage.getItem("privelux-admin-token");
  });

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem("privelux-admin-token", newToken);
    } else {
      localStorage.removeItem("privelux-admin-token");
    }
    setTokenState(newToken);
  };

  const logout = () => {
    setToken(null);
  };

  return (
    <AdminAuthContext.Provider value={{ token, setToken, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
