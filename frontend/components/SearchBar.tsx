"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Upload, Link, Type, X } from "lucide-react";
import { useSession } from "@supabase/auth-helpers-react";

type InputMode = "text" | "url" | "file";

export default function SearchBar() {
  const [mode, setMode] = useState<InputMode>("text");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const session = useSession();

  // ✅ Keep backend logic from the new code
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      router.push("/auth/login");
      return;
    }
    if (!content.trim() && !file) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      const claimContent =
        mode === "file" && file ? `File submission: ${file.name}` : content;
      formData.append("content", claimContent);
      formData.append(
        "content_type",
        mode === "file"
          ? file?.type.startsWith("image/")
            ? "image"
            : "video"
          : mode
      );
      if (mode === "url") formData.append("original_url", content);
      if (file) formData.append("file", file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/claims/submit`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Failed to submit claim");
      const result = await response.json();
      router.push(`/claims/${result.id}`);
    } catch (error) {
      console.error("Error submitting claim:", error);
      alert("Failed to submit claim. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setContent(selectedFile.name);
    }
  };

  const clearFile = () => {
    setFile(null);
    setContent("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Mode Selector */}
      <div className="flex justify-center mb-5">
        <div className="inline-flex rounded-full border border-slate-200 bg-white/70 backdrop-blur-md p-1 shadow-sm hover:shadow-md transition-all duration-300">
          {[
            {
              id: "text",
              icon: <Type className="w-4 h-4 mr-2" />,
              label: "Text",
            },
            {
              id: "url",
              icon: <Link className="w-4 h-4 mr-2" />,
              label: "URL",
            },
            {
              id: "file",
              icon: <Upload className="w-4 h-4 mr-2" />,
              label: "File",
            },
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setMode(id as InputMode);
                clearFile();
              }}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                mode === id
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md scale-105"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex flex-col sm:flex-row rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-xl shadow-lg hover:shadow-2xl transition-all duration-500 focus-within:ring-2 focus-within:ring-blue-400">
          {mode === "file" ? (
            <div className="flex-1 p-5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center w-full min-h-[70px] border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 transition-all duration-300"
              >
                {file ? (
                  <div className="flex items-center space-x-3">
                    <div className="text-sm">
                      <span className="font-semibold text-slate-900">
                        {file.name}
                      </span>
                      <span className="text-slate-500 ml-2">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        clearFile();
                      }}
                      className="text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-700 font-medium">
                      Click to upload image or video
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Max 50MB • JPG, PNG, GIF, MP4, AVI
                    </p>
                  </div>
                )}
              </label>
            </div>
          ) : (
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                mode === "text"
                  ? "Enter a claim to fact-check..."
                  : "Enter a URL to analyze..."
              }
              className="flex-1 px-5 sm:px-6 py-4 sm:py-5 text-base sm:text-lg bg-transparent border-0 text-black placeholder-slate-500 focus:outline-none"
              disabled={isSubmitting}
            />
          )}

          <button
            type="submit"
            disabled={isSubmitting || (!content.trim() && !file)}
            className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-b-2xl sm:rounded-b-none sm:rounded-r-2xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-md hover:shadow-xl active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                Processing...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Search className="w-5 h-5 mr-2" />
                Fact-Check
              </div>
            )}
          </button>
        </div>

        {/* Helper Text */}
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-600">
            {mode === "text" &&
              "Paste any claim or statement you want to verify"}
            {mode === "url" &&
              "Submit news articles, social media posts, or any web content"}
            {mode === "file" &&
              "Upload images with text or videos with spoken content"}
          </p>
        </div>
      </form>
    </div>
  );
}
