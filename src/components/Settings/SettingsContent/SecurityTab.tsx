"use client";

import React, { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { useSettings } from "../useSettings";

export default function SecurityTab() {
  const { settings, updateSetting, saveNow } = useSettings();

  // ✅ Fix typing issue
  const security = settings.security as {
    twoFactorEnabled?: boolean;
    twoFactorMethod?: string | null;
    recoveryEmail?: string | null;
  };

  // === State ===
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(
    !!security.twoFactorEnabled
  );
  const [method, setMethod] = useState<string | null>(
    security.twoFactorEnabled ? security.twoFactorMethod ?? "email" : null
  );

  const [recoveryEmail, setRecoveryEmail] = useState<string>(
    security.recoveryEmail ?? ""
  );
  const [recoveryStep, setRecoveryStep] = useState<
    "idle" | "sent" | "verify" | "verified"
  >("idle");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [sendingRecovery, setSendingRecovery] = useState(false);
  const [verifyingRecovery, setVerifyingRecovery] = useState(false);

  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [codesGeneratedAt, setCodesGeneratedAt] = useState<string | null>(null);

  const [devices, setDevices] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordForRegen, setPasswordForRegen] = useState("");
  const [regenLoading, setRegenLoading] = useState(false);

  // === Helpers ===
  const getBearer = async (): Promise<string | null> => {
    const s = await supabase.auth.getSession();
    return s.data?.session?.access_token ?? null;
  };

  // === Sync from settings ===
  useEffect(() => {
    setTwoFactorEnabled(!!security.twoFactorEnabled);
    setMethod(
      security.twoFactorEnabled ? security.twoFactorMethod || "email" : null
    );
    setRecoveryEmail(security.recoveryEmail ?? "");
  }, [security.twoFactorEnabled, security.twoFactorMethod, security.recoveryEmail]);

  // === Styles ===
  const section =
    "flex items-start justify-between py-4 border-b border-[#1E293B] last:border-none";
  const label = "text-[15px] font-medium text-white";
  const desc = "text-sm text-gray-400 mt-1";
  const button =
    "text-sm px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-200 transition-all";
  const primaryButton =
    "text-sm px-3 py-1.5 rounded-md bg-[#2563EB] hover:bg-[#1E50C0] text-white transition-all";
  const dangerButton =
    "text-sm px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white transition-all";
  const input =
    "bg-[#0F172A] border border-[#1E293B] text-gray-100 text-sm rounded-md px-3 py-1.5 outline-none focus:ring-1 focus:ring-[#2563EB]/50 w-full";
  const selectStyle =
    "bg-[#0F172A] border border-[#1E293B] text-gray-100 text-sm rounded-md px-3 py-1.5 outline-none focus:ring-1 focus:ring-[#2563EB]/50";

  // === Toggle 2FA ===
  const handleToggle2FA = async (on: boolean) => {
    setTwoFactorEnabled(on);
    await updateSetting("security.twoFactorEnabled", on);
    if (!on) {
      await updateSetting("security.twoFactorMethod", null);
      await updateSetting("security.recoveryEmail", null);
    }
    await saveNow();
  };

  // === Recovery Email ===
  async function sendRecoveryEmail() {
    if (!recoveryEmail || !recoveryEmail.includes("@")) {
      alert("Enter a valid email.");
      return;
    }
    setSendingRecovery(true);
    try {
      const token = await getBearer();
      const res = await fetch("/api/security/recovery/send", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: recoveryEmail }),
      });
      const body = await res.json();
      if (body?.success) {
        setRecoveryStep("sent");
      } else alert("Failed to send verification email.");
    } catch (err) {
      console.error("Send recovery email error", err);
    } finally {
      setSendingRecovery(false);
    }
  }

  async function verifyRecoveryCode() {
    if (!recoveryCode) {
      alert("Enter verification code.");
      return;
    }
    setVerifyingRecovery(true);
    try {
      const token = await getBearer();
      const res = await fetch("/api/security/recovery/verify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: recoveryEmail, code: recoveryCode }),
      });
      const body = await res.json();
      if (body?.success) {
        setRecoveryStep("verified");
        await updateSetting("security.recoveryEmail", recoveryEmail);
        await saveNow();
      } else alert("Verification failed.");
    } catch (err) {
      console.error("Verify error", err);
    } finally {
      setVerifyingRecovery(false);
      setRecoveryCode("");
    }
  }

  // === UI ===
  return (
    <div className="space-y-6 relative">
      {/* 2FA */}
      <section className={`${section} items-center`}>
        <div>
          <div className={label}>Two-Factor Authentication (2FA)</div>
          <div className={desc}>
            Add an extra layer of protection to your QuirraAI account.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`text-sm font-medium ${
              twoFactorEnabled ? "text-[#2563EB]" : "text-gray-400"
            }`}
          >
            {twoFactorEnabled ? "Enabled" : "Disabled"}
          </div>
          <Switch
            checked={twoFactorEnabled}
            onCheckedChange={(v) => handleToggle2FA(!!v)}
            className={`transition-all duration-300
              data-[state=checked]:bg-[#2563EB]
              data-[state=unchecked]:bg-gray-600
              relative inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer rounded-full
              before:content-[''] before:inline-block before:h-[14px] before:w-[14px]
              before:transform before:rounded-full before:bg-white before:transition-transform
              data-[state=checked]:before:translate-x-[16px]
              data-[state=unchecked]:before:translate-x-0`}
          />
        </div>
      </section>

      <AnimatePresence>
        {twoFactorEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div>
              <div className={label}>Verification Method</div>
              <div className={desc}>Choose how you verify your identity.</div>
              <select
                value={method ?? ""}
                onChange={(e) => setMethod(e.target.value)}
                className={`${selectStyle} mt-2 w-[220px]`}
              >
                <option value="email">Email Verification</option>
                <option value="backup_codes">Backup Codes</option>
              </select>
            </div>

            {method === "email" && (
              <div>
                <div className={label}>Recovery Email</div>
                <div className={desc}>
                  Add a backup email for recovery purposes.
                </div>

                <div className="flex gap-2 mt-2 max-w-[420px]">
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className={input}
                    placeholder="Enter recovery email"
                  />
                  <button
                    onClick={sendRecoveryEmail}
                    disabled={sendingRecovery}
                    className={primaryButton}
                  >
                    {sendingRecovery ? "Sending..." : "Send Code"}
                  </button>
                </div>

                {recoveryStep === "sent" && (
                  <div className="flex gap-2 mt-2">
                    <input
                      placeholder="Verification code"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      className={input}
                    />
                    <button
                      onClick={verifyRecoveryCode}
                      disabled={verifyingRecovery}
                      className={primaryButton}
                    >
                      {verifyingRecovery ? "Verifying..." : "Verify"}
                    </button>
                  </div>
                )}

                {recoveryStep === "verified" && (
                  <div className="text-sm text-green-400 mt-2">
                    ✅ Recovery email verified and saved.
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trusted Devices */}
      <section className={section}>
        <div>
          <div className={label}>Trusted Devices</div>
          <div className={desc}>
            Manage devices that have recently accessed your account.
          </div>
        </div>
        <button className={button}>Manage</button>
      </section>

      {/* Password */}
      <section className={section}>
        <div>
          <div className={label}>Password</div>
          <div className={desc}>
            Update your password to keep your account secure.
          </div>
        </div>
        <button onClick={() => setShowPasswordPrompt(true)} className={button}>
          Change
        </button>
      </section>

      {/* Active Sessions */}
      <section className={section}>
        <div>
          <div className={label}>Active Sessions</div>
          <div className={desc}>View and log out from other sessions.</div>
        </div>
        <div className="flex items-center gap-3">
          <button className={button}>Manage</button>
          <button className={dangerButton}>Revoke All</button>
        </div>
      </section>
    </div>
  );
}
