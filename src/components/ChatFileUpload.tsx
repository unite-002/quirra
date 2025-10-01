// src/components/ChatFileUpload.tsx
import React from "react";
import { Upload, XCircle } from "lucide-react";
import { supabase } from "@/utils/supabase"; // adjust if your path differs

// ---------------------- Types ----------------------
export type PendingFile = {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
};

export type UploadedAttachment = {
  id: string;
  name: string;
  url: string;
  isImage: boolean;
  size: number;
};

// ---------------------- Helpers ----------------------
function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// ---------------------- API / Upload functions ----------------------
export async function handleFileSelect(
  e: React.ChangeEvent<HTMLInputElement> | FileList | null,
  setPendingFiles: (fn: (prev: PendingFile[]) => PendingFile[] | void) => void
) {
  const files: File[] = [];
  if (!e) return;
  if (e instanceof FileList) {
    for (const f of Array.from(e)) files.push(f);
  } else if (e.target && e.target.files) {
    for (const f of Array.from(e.target.files)) files.push(f);
  }

  if (files.length === 0) return;

  const pending: PendingFile[] = await Promise.all(
    files.map(async (file) => {
      const isImage = file.type.startsWith("image/");
      let previewUrl: string | undefined;
      if (isImage) {
        previewUrl = await readFileAsDataUrl(file);
      }
      return {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl,
      } as PendingFile;
    })
  );

  setPendingFiles((prev: PendingFile[]) => [...prev, ...pending]);

  // clear input (if this was an <input /> event)
  try {
    if ((e as any).target) (e as any).target.value = "";
  } catch (err) {}
}

export async function uploadPendingFiles(pendingFiles: PendingFile[]): Promise<UploadedAttachment[]> {
  if (!pendingFiles || pendingFiles.length === 0) return [];

  const results: UploadedAttachment[] = [];

  for (const p of pendingFiles) {
    try {
      const path = `user-uploads/${Date.now()}-${p.name}`;
      const { data, error } = await supabase.storage.from("uploads").upload(path, p.file);
      if (error) throw error;

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("uploads")
        .createSignedUrl(data.path, 60 * 60);
      if (signedUrlError) throw signedUrlError;

      results.push({
        id: p.id,
        name: p.name,
        url: signedUrlData.signedUrl,
        isImage: p.type.startsWith("image/"),
        size: p.size,
      });
    } catch (err: any) {
      console.error("Upload failed for", p.name, err?.message || err);
      // optionally rethrow or continue; here we continue
    }
  }

  return results;
}

export async function uploadPendingFilesAndCreateMessages(
  pendingFiles: PendingFile[],
  opts: {
    setMessages: (fn: (prev: any[]) => any[]) => void;
    activeChatSessionId: string | null;
  }
): Promise<UploadedAttachment[]> {
  const attachments = await uploadPendingFiles(pendingFiles);

  for (const at of attachments) {
    const msgId = crypto.randomUUID();
    const message = {
      role: "user",
      content: `__file__:${at.id}`,
      id: msgId,
      created_at: new Date().toISOString(),
      chat_session_id: opts.activeChatSessionId || "temp-session",
    };
    opts.setMessages((prev) => [...prev, message]);
  }

  return attachments;
}

// ---------------------- UI Component ----------------------
export function FileAttachmentsPreview({
  files,
  onRemove,
}: {
  files: PendingFile[];
  onRemove: (id: string) => void;
}) {
  if (!files || files.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {files.map((f) => (
        <div key={f.id} className="relative bg-[#0f1724] border border-gray-700 rounded-lg p-2 flex items-center gap-2">
          {f.previewUrl ? (
            <img src={f.previewUrl} alt={f.name} className="w-20 h-12 object-cover rounded-md" />
          ) : (
            <div className="flex items-center gap-2 min-w-[160px]">
              <Upload size={18} />
              <div className="flex flex-col text-left">
                <span className="text-sm font-medium truncate max-w-[160px]">{f.name}</span>
                <span className="text-xs text-gray-400">{formatBytes(f.size)}</span>
              </div>
            </div>
          )}

          <button
            onClick={() => onRemove(f.id)}
            aria-label={`Remove ${f.name}`}
            className="absolute -top-2 -right-2 bg-[#11131a] hover:bg-red-600 rounded-full p-1 border border-gray-700 text-gray-300"
            title="Remove"
          >
            <XCircle size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default FileAttachmentsPreview;
