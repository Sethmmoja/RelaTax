"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { apiFetch } from "./api-client";
import { useAuth } from "./auth-context";

export interface ClientBusiness {
  id: string;
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  status: string;
}

interface BusinessContextValue {
  businesses: ClientBusiness[];
  activeBusinessId: string | null;
  activeBusiness: ClientBusiness | null;
  setActiveBusinessId: (id: string) => void;
}

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

/**
 * Staff: fetches the (staff-assignment-filtered, see BusinessMemberGuard)
 * admin business list from the API, letting them switch which client they're
 * viewing/acting on behalf of. Clients: derives the list from their own
 * businessMemberships — no API call, and never sees another client's businesses.
 */
export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [staffBusinesses, setStaffBusinesses] = useState<ClientBusiness[]>([]);
  const [activeBusinessId, setActiveBusinessIdState] = useState<string | null>(null);

  const isStaff = !!user?.isStaff;
  const storageKey = isStaff ? "relatax_admin_active_business" : "relatax_active_business";

  const businesses: ClientBusiness[] = isStaff
    ? staffBusinesses
    : (user?.businessMemberships.map((m) => m.business) ?? []);

  useEffect(() => {
    if (!user) return;

    if (isStaff) {
      apiFetch<ClientBusiness[]>("/admin/businesses").then((list) => {
        setStaffBusinesses(list);
        const stored = window.localStorage.getItem(storageKey);
        setActiveBusinessIdState(stored && list.some((b) => b.id === stored) ? stored : (list[0]?.id ?? null));
      });
    } else {
      const list = user.businessMemberships.map((m) => m.business);
      const stored = window.localStorage.getItem(storageKey);
      setActiveBusinessIdState(stored && list.some((b) => b.id === stored) ? stored : (list[0]?.id ?? null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isStaff]);

  function setActiveBusinessId(id: string) {
    window.localStorage.setItem(storageKey, id);
    setActiveBusinessIdState(id);
  }

  const activeBusiness = businesses.find((b) => b.id === activeBusinessId) ?? null;

  return (
    <BusinessContext.Provider value={{ businesses, activeBusinessId, activeBusiness, setActiveBusinessId }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used within BusinessProvider");
  return ctx;
}
