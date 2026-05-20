"use client";

import { useState, useEffect } from "react";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { java } from "@codemirror/lang-java";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { rust } from "@codemirror/lang-rust";
import { php } from "@codemirror/lang-php";
import { sql } from "@codemirror/lang-sql";
import { cpp } from "@codemirror/lang-cpp";
import { type Extension } from "@codemirror/state";
import CodeMirror from "@uiw/react-codemirror";
import toast from "react-hot-toast";
import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Globe,
  ExternalLink,
  Settings,
  FileText,
  Sparkles,
  X,
  Check,
} from "lucide-react";

interface CodeProps {
  github: string;
  group: string;
}

interface File {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  content?: string;
  _generated?: boolean;
}

const EXTENSION_MAP: Record<string, () => Extension> = {
  ".js": javascript,
  ".jsx": () => javascript({ jsx: true }),
  ".ts": () => javascript({ typescript: true }),
  ".tsx": () => javascript({ jsx: true, typescript: true }),
  ".mjs": javascript,
  ".cjs": javascript,
  ".py": python,
  ".pyw": python,
  ".java": java,
  ".html": html,
  ".htm": html,
  ".css": css,
  ".scss": css,
  ".sass": css,
  ".less": css,
  ".json": json,
  ".jsonc": json,
  ".md": markdown,
  ".mdx": markdown,
  ".xml": xml,
  ".svg": xml,
  ".yaml": yaml,
  ".yml": yaml,
  ".rs": rust,
  ".php": php,
  ".phtml": php,
  ".sql": sql,
  ".c": cpp,
  ".cpp": cpp,
  ".h": cpp,
  ".hpp": cpp,
  ".cs": cpp,
  ".go": () => javascript({ typescript: true }),
  ".rb": python,
  ".vue": html,
  ".svelte": html,
  ".astro": html,
};

function getFileLanguage(fileName: string) {
  const ext = "." + fileName.split(".").pop()?.toLowerCase();
  const lang = EXTENSION_MAP[ext];
  return lang ? lang() : javascript();
}

export default function Editor({ github, group }: CodeProps) {
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isEdited, setIsEdited] = useState(false);
  const { data: session } = useSession();
  const userId = session?.user.id;
  const userName = session?.user?.name;
  const [filePath, setFilePath] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [liveUrl, setLiveUrl] = useState<string>("");
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [generatingReadme, setGeneratingReadme] = useState(false);
  const isOwner = session?.user?.id
    ? session.user.id === (files as any).ownerId
    : false;

  const router = useRouter();

  useEffect(() => {
    if (group && github) {
      const init = async () => {
        try {
          const [filesRes, urlRes] = await Promise.all([
            fetch(`/api/files?group=${group}`),
            fetch(`/api/group-live-url?groupId=${group}`),
          ]);

          if (filesRes.ok) {
            const data = await filesRes.json();
            setFiles(data);
            if (data.length > 0) {
              setFileName(data[0].name);
              setFilePath(data[0].path);
              await loadFileContent(data[0]);
            }
          } else {
            toast.error("Failed to load the files.");
          }

          if (urlRes.ok) {
            const urlData = await urlRes.json();
            if (urlData.liveUrl) {
              setLiveUrl(urlData.liveUrl);
            }
          }
        } catch {
          toast.error("Failed to load the files.");
        } finally {
          setLoading(false);
        }
      };
      init();
    }
  }, [group, github]);

  const loadFileContent = async (file: File) => {
    if (!file) return;
    setFilePath(file.path);
    setFileName(file.name);

    if (file._generated && file.content) {
      setFileContent(file.content);
      setOriginalContent(file.content);
      setIsEdited(true);
      if (!openFiles.includes(file.path)) {
        setOpenFiles((prev) => [...prev, file.path]);
      }
      return;
    }

    try {
      const res = await fetch(file.url);
      if (!res.ok) throw new Error("Failed to fetch file content");
      const data = await res.json();
      const content =
        data.encoding === "base64" ? atob(data.content) : data.content;
      setFileContent(content);
      setOriginalContent(content);
      if (!openFiles.includes(file.path)) {
        setOpenFiles((prev) => [...prev, file.path]);
      }
    } catch (error) {
      toast.error("Failed to load the file content.");
    }
  };

  const handleFileChange = (newContent: string) => {
    const originalLines = originalContent.split("\n");
    const newLines = newContent.split("\n");

    const changes: {
      type: string;
      lineNumber: number;
      content: string;
    }[] = [];

    newLines.forEach((line, index) => {
      if (index >= originalLines.length) {
        changes.push({ type: "added", lineNumber: index + 1, content: line });
      } else if (line !== originalLines[index]) {
        changes.push({
          type: "modified",
          lineNumber: index + 1,
          content: line,
        });
      }
    });

    originalLines.forEach((line, index) => {
      if (index >= newLines.length) {
        changes.push({
          type: "removed",
          lineNumber: index + 1,
          content: line,
        });
      }
    });

    setIsEdited(changes.length > 0);
    setFileContent(newContent);
  };

  const handleFileClick = async (file: File) => {
    setFileName(file.name);
    setFilePath(file.path);
    await loadFileContent(file);
    if (!file._generated) {
      setIsEdited(false);
    }
  };

  const handleSave = async () => {
    if (!isEdited) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/modified-files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fileName,
          path: filePath,
          userId,
          content: btoa(fileContent),
          group,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save the file");
      }

      toast.success("File saved successfully!");
      setIsEdited(false);
      router.push(`/confirm-changes/${group}`);
    } catch (error) {
      toast.error("Failed to save the file.");
    } finally {
      setSaving(false);
    }
  };

  const handleRaiseChangeRequest = async () => {
    if (!isEdited) {
      toast.error("No changes to raise.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/modified-files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fileName,
          path: filePath,
          userId,
          content: btoa(fileContent),
          group,
        }),
      });

      if (!res.ok) throw new Error("Failed to save the file");

      toast.success("Changes saved! Review them before raising.");
      setIsEdited(false);
      router.push(`/confirm-changes/${group}`);
    } catch (error) {
      toast.error("Failed to save the file.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLiveUrl = async () => {
    try {
      const res = await fetch("/api/group-live-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: group,
          liveUrl: urlInput,
          userId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save URL");
      }

      setLiveUrl(urlInput);
      setEditingUrl(false);
      toast.success(urlInput ? "Live URL saved!" : "Live URL removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save URL",
      );
    }
  };

  const handleGenerateReadme = async () => {
    setGeneratingReadme(true);
    try {
      const res = await fetch("/api/generate-readme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: group }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate README");
      }

      const data = await res.json();

      const virtualFile: File = {
        name: data.fileName || "README.md",
        path: data.path || "README.md",
        sha: "",
        size: data.content.length,
        url: "",
        content: data.content,
        _generated: true,
      };

      const exists = files.find((f) => f.path === virtualFile.path);
      if (exists) {
        setFiles((prev) =>
          prev.map((f) =>
            f.path === virtualFile.path ? virtualFile : f,
          ),
        );
      } else {
        setFiles((prev) => [...prev, virtualFile]);
      }

      setFileName(virtualFile.name);
      setFilePath(virtualFile.path);
      setFileContent(virtualFile.content || "");
      setOriginalContent(virtualFile.content || "");
      setIsEdited(true);
      if (!openFiles.includes(virtualFile.path)) {
        setOpenFiles((prev) => [...prev, virtualFile.path]);
      }

      toast.success("README generated successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate README",
      );
    } finally {
      setGeneratingReadme(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <div className="bg-gray-800 text-white p-4 md:order-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Files</h2>
        </div>
        <ul className="flex flex-wrap md:flex-nowrap overflow-x-auto">
          {files.map((file) => (
            <li key={file.path} className="mb-2 mr-2">
              <button
                onClick={() => handleFileClick(file)}
                className={`block w-full text-left p-2 rounded transition-all duration-300 ${
                  filePath === file.path ? "bg-gray-700" : "hover:bg-gray-600"
                }`}
              >
                {file.path}
                {file._generated && (
                  <Sparkles className="inline w-3 h-3 ml-1 text-yellow-400" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-grow flex flex-col bg-gray-900 md:order-2">
        <div className="p-4 bg-gray-800 text-white shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-lg md:text-xl font-bold truncate">
              {filePath || fileName}
            </h1>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              {editingUrl ? (
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://your-site.vercel.app"
                    className="px-2 py-1 text-sm text-black rounded bg-white w-64"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveLiveUrl}
                    className="p-1 rounded bg-green-600 hover:bg-green-500"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingUrl(false)}
                    className="p-1 rounded bg-gray-600 hover:bg-gray-500"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : liveUrl ? (
                <div className="flex items-center gap-2">
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                  >
                    {liveUrl}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => {
                      setUrlInput(liveUrl);
                      setEditingUrl(true);
                    }}
                    className="p-1 rounded hover:bg-gray-700"
                    title="Edit URL"
                  >
                    <Settings className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setUrlInput("");
                    setEditingUrl(true);
                  }}
                  className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Set Live URL
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateReadme}
                disabled={generatingReadme}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-3.5 h-3.5" />
                {generatingReadme ? "Generating..." : "Generate AI README"}
              </button>
            </div>
          </div>
        </div>
        <div className="flex bg-gray-800 p-2 overflow-x-auto">
          {openFiles.map((path) => {
            const f = files.find((fl) => fl.path === path);
            return (
              <button
                key={path}
                onClick={() => f && handleFileClick(f)}
                className={`mr-2 p-2 text-sm md:text-base ${
                  filePath === path ? "bg-gray-700" : "hover:bg-gray-600"
                } rounded`}
              >
                {f?.name || path}
              </button>
            );
          })}
        </div>
        <div className="flex-grow overflow-auto">
          {loading ? (
            <p className="text-white p-4">Loading...</p>
          ) : (
            <CodeMirror
              value={fileContent}
              height="100%"
              theme="dark"
              extensions={[getFileLanguage(fileName)]}
              onChange={handleFileChange}
            />
          )}
        </div>
      </div>

      <div className="p-4 bg-gray-800 text-white md:order-3 flex gap-3">
        <button
          onClick={handleSave}
          disabled={!isEdited || saving}
          className={`p-2 rounded ${
            isEdited
              ? "bg-blue-500 hover:bg-blue-400"
              : "bg-gray-500 cursor-not-allowed"
          }`}
        >
          {saving ? "Saving..." : isEdited ? "Save Changes" : "No Changes"}
        </button>
        <button
          onClick={handleRaiseChangeRequest}
          disabled={!isEdited || saving}
          className={`p-2 rounded ${
            isEdited
              ? "bg-green-600 hover:bg-green-500"
              : "bg-gray-500 cursor-not-allowed"
          }`}
        >
          {saving ? "Processing..." : "Raise Change Request"}
        </button>
      </div>
    </div>
  );
}
