import { createContext } from "preact";
import { useState, useContext, useCallback } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { Site } from "../types";

const STORAGE_KEY = "selected_site";
const PAGE_STATE_KEY = "page_state";

interface SiteContextValue {
  site: Site | null;
  setSite: (s: Site | null) => void;
  pageState: Record<string, any>;
  setPageState: (pageName: string, state: any) => void;
  getPageState: (pageName: string) => any;
}

const SiteContext = createContext<SiteContextValue>({
  site: null,
  setSite: () => {},
  pageState: {},
  setPageState: () => {},
  getPageState: () => null,
});

export function SiteProvider({ children }: { children: ComponentChildren }) {
  const [site, setSiteRaw] = useState<Site | null>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [pageState, setPageStateRaw] = useState(() => {
    try {
      const raw = localStorage.getItem(PAGE_STATE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const setSite = useCallback((s: Site | null) => {
    setSiteRaw(s);
    if (s) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const setPageState = useCallback((pageName: string, state: any) => {
    setPageStateRaw((prev: any) => {
      const updated = { ...prev, [pageName]: state };
      localStorage.setItem(PAGE_STATE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getPageState = useCallback(
    (pageName: string) => {
      return pageState[pageName] || null;
    },
    [pageState]
  );

  return (
    <SiteContext.Provider value={{ site, setSite, pageState, setPageState, getPageState }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  return useContext(SiteContext);
}
