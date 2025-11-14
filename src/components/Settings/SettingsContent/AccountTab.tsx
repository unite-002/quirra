"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import SettingsConfirmModal from "../SettingsConfirmModal";

export default function AccountTab() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user + profile
  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email ?? null);
      setAccountCreated(
        new Date(user.created_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || "");
        setAvatarUrl(profile.avatar_url || null);
      } else {
        await supabase.from("profiles").insert({
          id: user.id,
          email: user.email,
          display_name: user.email?.split("@")[0],
        });
        setDisplayName(user.email?.split("@")[0] || "");
      }
    }

    loadProfile();
  }, []);

  // Update display name
  const handleNameChange = async (value: string) => {
    setDisplayName(value);
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      await supabase
        .from("profiles")
        .update({ display_name: value })
        .eq("id", user.user.id);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // Update profile
      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      setAvatarUrl(publicUrl);
    } catch (error) {
      console.error("Error uploading avatar:", error);
    } finally {
      setUploading(false);
    }
  };

  const sectionStyle =
    "flex items-start justify-between py-4 border-b border-[#1E293B] last:border-none";
  const labelStyle = "text-[15px] font-medium text-gray-100";
  const descStyle = "text-sm text-gray-400 mt-1";
  const inputStyle =
    "bg-[#16213A] text-gray-100 text-sm rounded-md px-3 py-1.5 w-64 outline-none focus:ring-1 focus:ring-[#2563EB]/40";
  const buttonStyle =
    "px-3 py-1.5 text-sm rounded-md bg-[#16213A] hover:bg-[#1E293B] text-gray-200 transition-colors duration-150";

  return (
    <motion.div
      key="account-tab"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="space-y-6"
    >
      {/* Display Name */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Display Name</div>
          <div className={descStyle}>Edit your name shown in QuirraAI.</div>
        </div>
        <input
          type="text"
          value={displayName}
          onChange={(e) => handleNameChange(e.target.value)}
          className={inputStyle}
        />
      </section>

      {/* Email */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Email Address</div>
          <div className={descStyle}>Your registered email address.</div>
        </div>
        <input
          type="text"
          value={email ?? "Loading..."}
          readOnly
          className={`${inputStyle} opacity-80 cursor-not-allowed`}
        />
      </section>

      {/* Avatar */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Profile Picture</div>
          <div className={descStyle}>Upload or change your avatar.</div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-16 h-16 rounded-full bg-[#16213A] flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition"
            onClick={() => fileInputRef.current?.click()}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : uploading ? (
              <span className="text-gray-400 text-xs">Uploading...</span>
            ) : (
              <span className="text-gray-400 text-sm">Upload</span>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
      </section>

      {/* Account Created */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Account Created</div>
          <div className={descStyle}>
            {accountCreated ? `Joined on ${accountCreated}` : "Loading..."}
          </div>
        </div>
      </section>

      {/* Delete Account */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Delete Account</div>
          <div className={descStyle}>
            Permanently remove your QuirraAI account and all associated data.
          </div>
        </div>
        <button onClick={() => setConfirmOpen(true)} className={buttonStyle}>
          Delete Account
        </button>
      </section>

      {/* Confirm Modal */}
      <SettingsConfirmModal
        open={confirmOpen}
        title="Delete your account?"
        message="This action cannot be undone. All your data will be permanently deleted."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => console.log("Account deletion confirmed")}
      />
    </motion.div>
  );
}
