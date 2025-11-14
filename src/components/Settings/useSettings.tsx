"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabaseClient";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export type SettingsData = {
  theme: "Dark" | "Light" | "System";
  language: string;
  toneInLanguage: string;
  interfaceDensity: "Compact" | "Comfortable" | "Expanded";
  defaultChatTone: string;
  notifications: {
    desktop: boolean;
    dailyReminder: boolean;
    reminderTime: string;
    emailUpdates: boolean;
    dndEnabled: boolean;
    dndDuration: string;
  };
  dataControl: {
    improveModel: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
  };
};

/* -------------------------------------------------------------------------- */
/*                              DEFAULT SETTINGS                              */
/* -------------------------------------------------------------------------- */

const defaultSettings: SettingsData = {
  theme: "Dark",
  language: "English",
  toneInLanguage: "Friendly",
  interfaceDensity: "Comfortable",
  defaultChatTone: "Playful",
  notifications: {
    desktop: true,
    dailyReminder: false,
    reminderTime: "Morning (9 AM)",
    emailUpdates: true,
    dndEnabled: false,
    dndDuration: "1 hour",
  },
  dataControl: {
    improveModel: true,
  },
  security: {
    twoFactorEnabled: false,
  },
};

/* -------------------------------------------------------------------------- */
/*                                   CONTEXT                                  */
/* -------------------------------------------------------------------------- */

type SettingsContextType = {
  settings: SettingsData;
  updateSetting: (path: string, value: any) => void;
  resetSettings: () => void;
  saveNow: () => Promise<void>;
  isLoaded: boolean;
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSetting: () => {},
  resetSettings: () => {},
  saveNow: async () => {},
  isLoaded: false,
});

/* -------------------------------------------------------------------------- */
/*                                 PROVIDER                                   */
/* -------------------------------------------------------------------------- */

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  /* ------------------------------ LOAD SETTINGS ----------------------------- */
  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        console.warn("⚠️ No authenticated user found — settings will not sync.");
        setIsLoaded(true);
        return;
      }

      setUserId(user.id);

      const { data: row, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching settings:", error);
      }

      if (row) {
        setSettings({
          theme: row.theme,
          language: row.language,
          toneInLanguage: row.tone_in_language,
          interfaceDensity: row.interface_density,
          defaultChatTone: row.default_chat_tone,
          notifications: {
            desktop: row.desktop_notifications,
            dailyReminder: row.daily_reminder,
            reminderTime: row.reminder_time,
            emailUpdates: row.email_updates,
            dndEnabled: row.dnd_enabled,
            dndDuration: row.dnd_duration,
          },
          dataControl: {
            improveModel: row.improve_model,
          },
          security: {
            twoFactorEnabled: row.two_factor_enabled,
          },
        });
      } else {
        await supabase.from("user_settings").insert({
          user_id: user.id,
          ...defaultSettings,
        });
      }

      setIsLoaded(true);
    };

    load();
  }, []);

  /* ------------------------------ SAVE SETTINGS ----------------------------- */
  const saveToServer = useCallback(
    async (updated: SettingsData, uid: string | null) => {
      if (!uid) return;

      const payload = {
        theme: updated.theme,
        language: updated.language,
        tone_in_language: updated.toneInLanguage,
        interface_density: updated.interfaceDensity,
        default_chat_tone: updated.defaultChatTone,
        desktop_notifications: updated.notifications.desktop,
        daily_reminder: updated.notifications.dailyReminder,
        reminder_time: updated.notifications.reminderTime,
        email_updates: updated.notifications.emailUpdates,
        dnd_enabled: updated.notifications.dndEnabled,
        dnd_duration: updated.notifications.dndDuration,
        improve_model: updated.dataControl.improveModel,
        two_factor_enabled: updated.security.twoFactorEnabled,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("user_settings")
        .upsert({ user_id: uid, ...payload });

      if (error) console.error("❌ Save error:", error);
    },
    []
  );

  /* ----------------------------- UPDATE SETTING ----------------------------- */
  const updateSetting = useCallback(
    (path: string, value: any) => {
      setSettings((prev) => {
        const next = structuredClone(prev);
        const keys = path.split(".");
        let obj: any = next;
        for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
        obj[keys[keys.length - 1]] = value;
        saveToServer(next, userId);
        return next;
      });
    },
    [userId, saveToServer]
  );

  /* --------------------------------- RESET --------------------------------- */
  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    if (userId) saveToServer(defaultSettings, userId);
  }, [userId, saveToServer]);

  /* --------------------------------- FLUSH --------------------------------- */
  const saveNow = useCallback(async () => {
    if (userId) await saveToServer(settings, userId);
  }, [userId, settings, saveToServer]);

  /* ----------------------------- REALTIME SYNC ----------------------------- */
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user_settings_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_settings",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row) {
            setSettings({
              theme: row.theme,
              language: row.language,
              toneInLanguage: row.tone_in_language,
              interfaceDensity: row.interface_density,
              defaultChatTone: row.default_chat_tone,
              notifications: {
                desktop: row.desktop_notifications,
                dailyReminder: row.daily_reminder,
                reminderTime: row.reminder_time,
                emailUpdates: row.email_updates,
                dndEnabled: row.dnd_enabled,
                dndDuration: row.dnd_duration,
              },
              dataControl: {
                improveModel: row.improve_model,
              },
              security: {
                twoFactorEnabled: row.two_factor_enabled,
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  /* ------------------------------- PROVIDER ------------------------------- */
  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSetting,
        resetSettings,
        saveNow,
        isLoaded,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   HOOK                                     */
/* -------------------------------------------------------------------------- */

export function useSettings() {
  return useContext(SettingsContext);
}
