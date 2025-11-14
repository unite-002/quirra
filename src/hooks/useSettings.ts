// src/hooks/useSettings.ts
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useSettings
 * - Centralized settings state
 * - Persists to localStorage (debounced)
 * - Exposes resetToDefaults, save (immediate), and syncWithServer (stub)
 *
 * NOTE: This is intentionally minimal and easy to adapt to a real backend later.
 */

// ---- Types ----
export type LanguageKey = "en" | "ar" | "fr" | "ja";

export type SettingsShape = {
  general: {
    theme: "system" | "dark" | "light";
    language: LanguageKey;
    tone: string; // tone name (depends on language)
    notifications: {
      email: boolean;
      productUpdates: boolean;
    };
  };
  accessibility: {
    textSize: "small" | "normal" | "large";
    highContrast: boolean;
    reduceMotion: boolean;
  };
  apps: {
    connected: string[]; // list of connected app ids, e.g. ["google", "notion"]
  };
  data: {
    improveModel: boolean;
  };
  security: {
    // placeholders for future values (re-auth, etc)
  };
};

const LS_KEY = "quirra:settings:v1";

// ---- Defaults ----
export const DEFAULTS: SettingsShape = {
  general: {
    theme: "system",
    language: "en",
    tone: "Friendly",
    notifications: {
      email: true,
      productUpdates: true,
    },
  },
  accessibility: {
    textSize: "normal",
    highContrast: false,
    reduceMotion: false,
  },
  apps: {
    connected: [],
  },
  data: {
    improveModel: true,
  },
  security: {},
};

function readFromLocalStorage(): SettingsShape | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SettingsShape;
  } catch (err) {
    console.warn("Failed to read settings from localStorage:", err);
    return null;
  }
}

function writeToLocalStorage(v: SettingsShape) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(v));
  } catch (err) {
    console.warn("Failed to write settings to localStorage:", err);
  }
}

// ---- Hook ----
export function useSettings() {
  const [settings, setSettings] = useState<SettingsShape>(() => {
    const persisted = readFromLocalStorage();
    return persisted ?? DEFAULTS;
  });

  // saved indicator (true for 2s when we saved)
  const [savedIndicator, setSavedIndicator] = useState(false);
  const saveTimerRef = useRef<number | null>(null);

  // debounce write to localStorage
  const debounceRef = useRef<number | null>(null);
  const DEBOUNCE_MS = 500;

  // Save (debounced)
  const persist = useCallback((next: SettingsShape) => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      writeToLocalStorage(next);
      setSavedIndicator(true);
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        setSavedIndicator(false);
        saveTimerRef.current = null;
      }, 2000);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
  }, []);

  // Helper: update nested settings
  const update = useCallback(
    (updater: (prev: SettingsShape) => SettingsShape) => {
      setSettings((prev) => {
        const next = updater(prev);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  // direct setters for common operations
  const setLanguage = useCallback(
    (language: LanguageKey, tone?: string) => {
      update((prev) => ({
        ...prev,
        general: {
          ...prev.general,
          language,
          tone: tone ?? prev.general.tone,
        },
      }));
    },
    [update]
  );

  const setTone = useCallback(
    (tone: string) => {
      update((prev) => ({
        ...prev,
        general: {
          ...prev.general,
          tone,
        },
      }));
    },
    [update]
  );

  const toggleImproveModel = useCallback(
    (value?: boolean) => {
      update((prev) => ({
        ...prev,
        data: { ...prev.data, improveModel: value ?? !prev.data.improveModel },
      }));
    },
    [update]
  );

  const connectApp = useCallback(
    (appId: string) => {
      update((prev) => {
        if (prev.apps.connected.includes(appId)) return prev;
        return { ...prev, apps: { connected: [...prev.apps.connected, appId] } };
      });
    },
    [update]
  );

  const disconnectApp = useCallback(
    (appId: string) => {
      update((prev) => ({
        ...prev,
        apps: { connected: prev.apps.connected.filter((a) => a !== appId) },
      }));
    },
    [update]
  );

  const disconnectAllApps = useCallback(() => {
    update((prev) => ({ ...prev, apps: { connected: [] } }));
  }, [update]);

  const resetToDefaults = useCallback((confirm = false) => {
    // caller should confirm if desired; we still apply defaults here
    setSettings(DEFAULTS);
    // immediately persist defaults (no debounce)
    writeToLocalStorage(DEFAULTS);
    setSavedIndicator(true);
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => setSavedIndicator(false), 2000);
  }, []);

  // immediate save (useful for explicit export or sync)
  const saveImmediate = useCallback(() => {
    writeToLocalStorage(settings);
    setSavedIndicator(true);
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => setSavedIndicator(false), 2000);
  }, [settings]);

  // stub - replace with real fetch to /api/user/settings
  const syncWithServer = useCallback(async () => {
    // Example: await fetch("/api/user/settings", { method: "PUT", body: JSON.stringify(settings) })
    // For now just simulate a short delay and resolve
    await new Promise((r) => setTimeout(r, 400));
    // In a real implementation, handle errors and reflect server state
    return { ok: true };
  }, [settings]);

  // On mount: listen to storage events (sync across tabs)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === LS_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as SettingsShape;
          // naive merge: prefer the fresh value
          setSettings(parsed);
        } catch {
          // ignore parse errors
        }
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  return {
    settings,
    setSettings,
    setLanguage,
    setTone,
    toggleImproveModel,
    connectApp,
    disconnectApp,
    disconnectAllApps,
    resetToDefaults,
    saveImmediate,
    syncWithServer,
    savedIndicator,
  } as const;
}
