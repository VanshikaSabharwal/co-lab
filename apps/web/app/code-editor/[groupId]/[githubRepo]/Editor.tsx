"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  ChevronRight,
  ChevronDown,
  File,
  GitBranch,
} from "lucide-react";

interface CodeProps {
  github: string;
  group: string;
}

interface CodeFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  content?: string;
  _generated?: boolean;
}

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children: TreeNode[];
  file?: CodeFile;
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

const FILE_ICON_MAP: Record<
  string,
  { icon: React.ReactNode; color: string }
> = {
  ".js": { icon: <FileCode size={15} />, color: "text-yellow-400" },
  ".jsx": { icon: <FileCode size={15} />, color: "text-cyan-400" },
  ".ts": { icon: <FileCode size={15} />, color: "text-blue-400" },
  ".tsx": { icon: <FileCode size={15} />, color: "text-blue-500" },
  ".mjs": { icon: <FileCode size={15} />, color: "text-yellow-400" },
  ".cjs": { icon: <FileCode size={15} />, color: "text-yellow-400" },
  ".py": { icon: <FileCode size={15} />, color: "text-blue-300" },
  ".pyw": { icon: <FileCode size={15} />, color: "text-blue-300" },
  ".java": { icon: <FileCode size={15} />, color: "text-orange-400" },
  ".html": { icon: <FileCode size={15} />, color: "text-orange-500" },
  ".htm": { icon: <FileCode size={15} />, color: "text-orange-500" },
  ".css": { icon: <FileCode size={15} />, color: "text-pink-400" },
  ".scss": { icon: <FileCode size={15} />, color: "text-pink-400" },
  ".sass": { icon: <FileCode size={15} />, color: "text-pink-400" },
  ".less": { icon: <FileCode size={15} />, color: "text-pink-400" },
  ".json": { icon: <FileJson size={15} />, color: "text-yellow-300" },
  ".jsonc": { icon: <FileJson size={15} />, color: "text-yellow-300" },
  ".md": { icon: <FileText size={15} />, color: "text-gray-400" },
  ".mdx": { icon: <FileText size={15} />, color: "text-gray-400" },
  ".xml": { icon: <FileCode size={15} />, color: "text-purple-400" },
  ".yaml": { icon: <FileCode size={15} />, color: "text-red-400" },
  ".yml": { icon: <FileCode size={15} />, color: "text-red-400" },
  ".rs": { icon: <FileCode size={15} />, color: "text-orange-500" },
  ".php": { icon: <FileCode size={15} />, color: "text-indigo-400" },
  ".phtml": { icon: <FileCode size={15} />, color: "text-indigo-400" },
  ".sql": { icon: <FileCode size={15} />, color: "text-orange-300" },
  ".c": { icon: <FileCode size={15} />, color: "text-blue-400" },
  ".cpp": { icon: <FileCode size={15} />, color: "text-blue-400" },
  ".h": { icon: <FileCode size={15} />, color: "text-blue-300" },
  ".hpp": { icon: <FileCode size={15} />, color: "text-blue-300" },
  ".cs": { icon: <FileCode size={15} />, color: "text-green-400" },
  ".go": { icon: <FileCode size={15} />, color: "text-cyan-400" },
  ".rb": { icon: <FileCode size={15} />, color: "text-red-400" },
  ".vue": { icon: <FileCode size={15} />, color: "text-green-500" },
  ".svelte": { icon: <FileCode size={15} />, color: "text-orange-400" },
  ".astro": { icon: <FileCode size={15} />, color: "text-purple-500" },
  ".svg": { icon: <FileCode size={15} />, color: "text-yellow-300" },
  ".png": { icon: <FileCode size={15} />, color: "text-purple-400" },
  ".jpg": { icon: <FileCode size={15} />, color: "text-purple-400" },
  ".jpeg": { icon: <FileCode size={15} />, color: "text-purple-400" },
  ".gif": { icon: <FileCode size={15} />, color: "text-purple-400" },
  ".ico": { icon: <FileCode size={15} />, color: "text-purple-400" },
  ".webp": { icon: <FileCode size={15} />, color: "text-purple-400" },
};

function getFileLanguage(fileName: string) {
  const ext = "." + fileName.split(".").pop()?.toLowerCase();
  const lang = EXTENSION_MAP[ext];
  return lang ? lang() : javascript();
}

function getFileIcon(fileName: string) {
  const ext = "." + fileName.split(".").pop()?.toLowerCase();
  const match = FILE_ICON_MAP[ext];
  if (match) return match;
  const name = fileName.toLowerCase();
  if (name === "dockerfile")
    return { icon: <FileCode size={15} />, color: "text-blue-400" };
  if (name === "makefile")
    return { icon: <FileCode size={15} />, color: "text-orange-400" };
  if (name.startsWith(".env"))
    return { icon: <FileCode size={15} />, color: "text-yellow-300" };
  if (name === ".gitignore" || name === ".dockerignore")
    return { icon: <FileCode size={15} />, color: "text-gray-500" };
  return { icon: <File size={15} />, color: "text-gray-400" };
}

function buildFileTree(files: CodeFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  const map = new Map<string, TreeNode>();

  for (const file of files) {
    const parts = file.path.split("/");
    let currentPath = "";
    let currentLevel: (TreeNode[] | TreeNode)[] = root;

    parts.forEach((part, i) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      let existing = map.get(currentPath);
      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          type: i === parts.length - 1 ? "file" : "folder",
          children: [],
          file: i === parts.length - 1 ? file : undefined,
        };
        map.set(currentPath, existing);
        (currentLevel as TreeNode[]).push(existing);
      }
      currentLevel = existing.children;
    });
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(root);

  return root;
}

function findFileInTree(nodes: TreeNode[], path: string): CodeFile | undefined {
  for (const node of nodes) {
    if (node.type === "file" && node.path === path) return node.file;
    if (node.type === "folder") {
      const found = findFileInTree(node.children, path);
      if (found) return found;
    }
  }
  return undefined;
}

export default function Editor({ github, group }: CodeProps) {
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [isEdited, setIsEdited] = useState(false);
  const { data: session } = useSession();
  const userId = session?.user.id;
  const [filePath, setFilePath] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [liveUrl, setLiveUrl] = useState<string>("");
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [generatingReadme, setGeneratingReadme] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  // Code access: editing is gated on accepted GitHub collaborator status.
  const [codeAccess, setCodeAccess] = useState<
    "NONE" | "PENDING_GITHUB" | "INVITED" | "ACTIVE" | "loading"
  >("loading");
  // Commit sha the selected branch is at — stamped onto drafts so a CR branch
  // is cut from what the author saw.
  const [baseSha, setBaseSha] = useState<string | null>(null);
  const canEdit = codeAccess === "ACTIVE";

  // Branch selection (auto-fetched from GitHub)
  const [branches, setBranches] = useState<
    { name: string; sha: string; isDefault: boolean; isChangeRequest: boolean }[]
  >([]);
  const [currentBranch, setCurrentBranch] = useState<string>("");
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [branchQuery, setBranchQuery] = useState("");
  // The group's stored GitHub token expired/was revoked (GitHub App tokens
  // expire ~8h) — show a reconnect banner.
  const [authExpired, setAuthExpired] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const handleReconnectGithub = async () => {
    setReconnecting(true);
    try {
      const res = await fetch("/api/vcs/reconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: group }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("GitHub reconnected");
        window.location.reload();
      } else if (data.needsRelink) {
        // The owner's own GitHub sign-in is also stale — re-authorize, then retry
        toast("Re-authorizing GitHub…", { icon: "🔑" });
        window.location.href = "/api/github/link";
      } else if (res.status === 403) {
        toast.error("Only the group owner can reconnect GitHub.");
      } else {
        toast.error(data.error ?? "Reconnect failed");
      }
    } catch {
      toast.error("Reconnect failed");
    } finally {
      setReconnecting(false);
    }
  };

  // Cache loaded file bodies so switching files/tabs is instant. Keyed by
  // `${branch}:${path}` since content differs per branch.
  const contentCache = useRef<Map<string, string>>(new Map());

  const router = useRouter();

  const fileTree = useMemo(() => buildFileTree(files), [files]);

  const loadFileContent = useCallback(
    async (file: CodeFile) => {
      if (!file) return;
      setFilePath(file.path);
      setFileName(file.name);

      if (file._generated) {
        setFileContent(file.content || "");
        setOriginalContent(file.content || "");
        setIsEdited(true);
        setOpenFiles((prev) =>
          prev.includes(file.path) ? prev : [...prev, file.path],
        );
        return;
      }

      // Serve from cache for instant tab/file switching
      const cacheKey = `${currentBranch}:${file.path}`;
      const cached = contentCache.current.get(cacheKey);
      if (cached !== undefined) {
        setFileContent(cached);
        setOriginalContent(cached);
        setOpenFiles((prev) =>
          prev.includes(file.path) ? prev : [...prev, file.path],
        );
        return;
      }

      try {
        const res = await fetch("/api/file-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId: group,
            filePath: file.path,
            ref: currentBranch || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to fetch file content");
        }
        const data = await res.json();
        contentCache.current.set(cacheKey, data.content);
        setFileContent(data.content);
        setOriginalContent(data.content);
        setOpenFiles((prev) =>
          prev.includes(file.path) ? prev : [...prev, file.path],
        );
      } catch {
        toast.error("Failed to load the file content.");
      }
    },
    [group, currentBranch],
  );

  useEffect(() => {
    if (group && github) {
      const init = async () => {
        try {
          const [filesRes, urlRes] = await Promise.all([
            fetch(`/api/files?group=${group}`),
            fetch(`/api/group-live-url?groupId=${group}`),
          ]);

          if (filesRes.ok) {
            const data: CodeFile[] = await filesRes.json();
            setFiles(data);
            if (data.length > 0) {
              const firstFile = data[0]!;
              setFileName(firstFile.name);
              setFilePath(firstFile.path);
              await loadFileContent(firstFile);
            }
          } else {
            const errBody = await filesRes.json().catch(() => ({}));
            if (errBody.code === "GITHUB_AUTH_EXPIRED") {
              setAuthExpired(true);
            } else {
              toast.error("Failed to load the files.");
            }
          }

          if (urlRes.ok) {
            const urlData = await urlRes.json();
            if (urlData.liveUrl) {
              setLiveUrl(urlData.liveUrl);
            }
          }

          // Code-access (best-effort; don't block file loading)
          fetch(`/api/github/collaborator?groupId=${group}&self=1`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => setCodeAccess(d?.codeAccess ?? "NONE"))
            .catch(() => setCodeAccess("NONE"));

          // Branches (auto-fetched); sets the current branch + baseSha
          fetch(`/api/vcs/branches?groupId=${group}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (!d?.branches) return;
              setBranches(d.branches);
              const def =
                d.branches.find((b: any) => b.isDefault) ?? d.branches[0];
              if (def) {
                setCurrentBranch(def.name);
                setBaseSha(def.sha);
              }
            })
            .catch(() => {});
        } catch {
          toast.error("Failed to load the files.");
        } finally {
          setLoading(false);
        }
      };
      init();
    }
    // Run once per repo — must NOT depend on loadFileContent, which changes
    // with currentBranch and would re-run init and reset the selected branch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, github]);

  const handleFileChange = (newContent: string) => {
    if (!canEdit) return; // editing gated on accepted code access
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

  const expandToFile = (path: string) => {
    const parts = path.split("/");
    const toExpand = new Set(expandedFolders);
    let currentPath = "";
    parts.slice(0, -1).forEach((part) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      toExpand.add(currentPath);
    });
    setExpandedFolders(toExpand);
  };

  const handleFileClick = async (file: CodeFile) => {
    expandToFile(file.path);
    setFileName(file.name);
    setFilePath(file.path);
    await loadFileContent(file);
    if (!file._generated) {
      setIsEdited(false);
    }
  };

  // Switch the branch being viewed/edited: refetch its tree, reset caches,
  // and re-anchor baseSha to that branch's head.
  const switchBranch = async (name: string) => {
    if (name === currentBranch) {
      setBranchMenuOpen(false);
      return;
    }
    setBranchMenuOpen(false);
    setLoading(true);
    setCurrentBranch(name);
    setBaseSha(branches.find((b) => b.name === name)?.sha ?? baseSha);
    contentCache.current.clear();
    setOpenFiles([]);
    setIsEdited(false);
    try {
      const res = await fetch(`/api/files?group=${group}&ref=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data: CodeFile[] = await res.json();
        setFiles(data);
        if (data.length > 0) {
          await loadFileContentFor(data[0]!, name);
        } else {
          setFileContent("");
          setOriginalContent("");
          setFilePath("");
          setFileName("");
        }
      } else {
        toast.error("Failed to load that branch.");
      }
    } catch {
      toast.error("Failed to load that branch.");
    } finally {
      setLoading(false);
    }
  };

  // Load content for a file on a specific branch (used right after switching,
  // before the currentBranch state has propagated to loadFileContent).
  const loadFileContentFor = async (file: CodeFile, branch: string) => {
    setFilePath(file.path);
    setFileName(file.name);
    const cacheKey = `${branch}:${file.path}`;
    const cached = contentCache.current.get(cacheKey);
    if (cached !== undefined) {
      setFileContent(cached);
      setOriginalContent(cached);
      setOpenFiles([file.path]);
      return;
    }
    try {
      const res = await fetch("/api/file-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: group, filePath: file.path, ref: branch }),
      });
      if (res.ok) {
        const data = await res.json();
        contentCache.current.set(cacheKey, data.content);
        setFileContent(data.content);
        setOriginalContent(data.content);
        setOpenFiles([file.path]);
      }
    } catch {
      toast.error("Failed to load the file content.");
    }
  };

  // Save just the current file's changes to your draft — stays in the editor.
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
          baseSha,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save the file");
      }

      // Keep the cache in sync so switching away and back shows saved content
      contentCache.current.set(`${currentBranch}:${filePath}`, fileContent);
      setOriginalContent(fileContent);
      toast.success(`Saved ${fileName}`);
      setIsEdited(false);
    } catch {
      toast.error("Failed to save the file.");
    } finally {
      setSaving(false);
    }
  };

  // Go to the change-request page. Save the current file first if it's dirty.
  const handleRaiseChangeRequest = async () => {
    if (isEdited) await handleSave();
    router.push(`/confirm-changes/${group}`);
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

      const virtualFile: CodeFile = {
        name: data.fileName || "README.md",
        path: data.path || "README.md",
        sha: "",
        size: (data.content || "").length,
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

      expandToFile(virtualFile.path);
      setFileName(virtualFile.name);
      setFilePath(virtualFile.path);
      setFileContent(virtualFile.content || "");
      setOriginalContent(virtualFile.content || "");
      setIsEdited(true);
      setOpenFiles((prev) =>
        prev.includes(virtualFile.path) ? prev : [...prev, virtualFile.path],
      );

      toast.success("README generated successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate README",
      );
    } finally {
      setGeneratingReadme(false);
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const closeTab = (path: string) => {
    setOpenFiles((prev) => prev.filter((p) => p !== path));
    if (filePath === path && openFiles.length > 0) {
      const remaining = openFiles.filter((p) => p !== path);
      if (remaining.length > 0) {
        const last = remaining[remaining.length - 1]!;
        const f =
          files.find((fl) => fl.path === last) ||
          findFileInTree(fileTree, last);
        if (f) handleFileClick(f);
      }
    }
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = node.path === filePath;

    if (node.type === "folder") {
      return (
        <div key={node.path}>
          <button
            onClick={() => toggleFolder(node.path)}
            className={`w-full flex items-center gap-1 px-2 py-1 text-left text-sm transition-colors duration-150 hover:bg-gray-800 rounded-sm ${
              isSelected ? "bg-gray-700" : ""
            }`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            <span className="w-4 h-4 flex items-center justify-center text-gray-500">
              {isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </span>
            <span className="w-4 h-4 flex items-center justify-center text-gray-400">
              {isExpanded ? <FolderOpen size={15} /> : <Folder size={15} />}
            </span>
            <span className="truncate text-gray-300">{node.name}</span>
          </button>
          {isExpanded && (
            <div>
              {node.children.map((child) => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const { icon, color } = getFileIcon(node.name);
    return (
      <button
        key={node.path}
        onClick={() => node.file && handleFileClick(node.file)}
        className={`w-full flex items-center gap-1 px-2 py-1 text-left text-sm transition-colors duration-150 rounded-sm ${
          isSelected
            ? "bg-gray-700 text-white"
            : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
        }`}
        style={{ paddingLeft: `${28 + depth * 16}px` }}
      >
        <span className={`w-4 h-4 flex items-center justify-center shrink-0 ${color}`}>
          {icon}
        </span>
        <span className="truncate">{node.name}</span>
        {node.file?._generated && (
          <Sparkles className="w-3 h-3 ml-1 text-yellow-400 shrink-0" />
        )}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left Sidebar - File Explorer */}
      <div className="w-64 flex flex-col bg-gray-900 border-r border-gray-700/50 shrink-0">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Files
          </h2>
          <span className="text-xs text-gray-500">{files.length}</span>
        </div>

        {/* Branch selector */}
        <div className="relative border-b border-gray-700/50 px-3 py-2">
          <button
            onClick={() => setBranchMenuOpen((o) => !o)}
            className="flex w-full items-center gap-2 rounded border border-gray-700 bg-gray-800/60 px-2.5 py-1.5 text-xs text-gray-200 hover:border-gray-600"
            title="Switch branch"
          >
            <GitBranch size={13} className="shrink-0 text-gray-400" />
            <span className="truncate">{currentBranch || "loading…"}</span>
            <ChevronDown size={13} className="ml-auto shrink-0 text-gray-500" />
          </button>

          {branchMenuOpen && (
            <div className="absolute left-3 right-3 z-20 mt-1 max-h-72 overflow-y-auto rounded-md border border-gray-700 bg-gray-800 shadow-xl">
              <input
                autoFocus
                value={branchQuery}
                onChange={(e) => setBranchQuery(e.target.value)}
                placeholder="Find a branch…"
                className="w-full border-b border-gray-700 bg-gray-900 px-2.5 py-2 text-xs text-gray-200 outline-none"
              />
              {(() => {
                const q = branchQuery.toLowerCase();
                const filtered = branches.filter((b) => b.name.toLowerCase().includes(q));
                const ordered = [
                  ...filtered.filter((b) => b.isDefault),
                  ...filtered.filter((b) => b.isChangeRequest && !b.isDefault),
                  ...filtered.filter((b) => !b.isDefault && !b.isChangeRequest),
                ];
                if (ordered.length === 0)
                  return <p className="px-2.5 py-3 text-xs text-gray-500">No branches</p>;
                return ordered.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => switchBranch(b.name)}
                    className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs hover:bg-gray-700/60"
                  >
                    <GitBranch size={12} className="shrink-0 text-gray-500" />
                    <span className="truncate text-gray-200">{b.name}</span>
                    {b.isDefault && (
                      <span className="ml-auto rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-300">
                        default
                      </span>
                    )}
                    {b.isChangeRequest && !b.isDefault && (
                      <span className="ml-auto rounded bg-blue-900/60 px-1.5 py-0.5 text-[10px] text-blue-300">
                        CR
                      </span>
                    )}
                    {b.name === currentBranch && <Check size={12} className="shrink-0 text-green-400" />}
                  </button>
                ));
              })()}
            </div>
          )}
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                Loading files...
              </div>
            </div>
          ) : fileTree.length === 0 ? (
            <p className="text-gray-500 text-sm px-4 py-8 text-center">
              No files found
            </p>
          ) : (
            fileTree.map((node) => renderTreeNode(node, 0))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-gray-700/50 space-y-2">
          <button
            onClick={handleGenerateReadme}
            disabled={generatingReadme}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded bg-purple-600/80 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FileText size={14} />
            {generatingReadme ? "Generating..." : "Generate AI README"}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-gray-700/50">
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="w-4 h-4 text-gray-500 shrink-0" />
            {editingUrl ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://your-site.vercel.app"
                  className="px-2 py-1 text-xs text-gray-900 rounded bg-gray-100 w-56 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveLiveUrl}
                  className="p-1 rounded bg-green-600 hover:bg-green-500"
                  title="Save"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setEditingUrl(false)}
                  className="p-1 rounded bg-gray-600 hover:bg-gray-500"
                  title="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
            ) : liveUrl ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 underline truncate flex items-center gap-1"
                >
                  {liveUrl}
                  <ExternalLink size={12} />
                </a>
                <button
                  onClick={() => {
                    setUrlInput(liveUrl);
                    setEditingUrl(true);
                  }}
                  className="p-1 rounded hover:bg-gray-700 shrink-0"
                  title="Edit URL"
                >
                  <Settings size={13} className="text-gray-400" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setUrlInput("");
                  setEditingUrl(true);
                }}
                className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
              >
                <Settings size={13} />
                Set Live URL
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-500">
              {isEdited && (
                <span className="text-yellow-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                  Edited
                </span>
              )}
            </span>
            <button
              onClick={handleSave}
              disabled={!isEdited || saving}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-colors ${
                isEdited
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              {saving ? "Saving..." : isEdited ? "Save Changes" : "No Changes"}
            </button>
            <button
              onClick={handleRaiseChangeRequest}
              disabled={saving}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-colors bg-green-700 hover:bg-green-600 text-white disabled:opacity-50"
            >
              {saving ? "Processing..." : "Change Request"}
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex bg-gray-800/40 border-b border-gray-700/50 overflow-x-auto">
          {openFiles.length === 0 ? (
            <div className="px-4 py-2 text-xs text-gray-600">
              Select a file to open
            </div>
          ) : (
            openFiles.map((path) => {
              const f =
                files.find((fl) => fl.path === path) ||
                findFileInTree(fileTree, path);
              const { color } = f ? getFileIcon(f.name) : { color: "text-gray-400" };
              return (
                <div
                  key={path}
                  className={`group flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer border-r border-gray-700/50 transition-colors ${
                    filePath === path
                      ? "bg-gray-800 text-white border-t-2 border-t-blue-500"
                      : "bg-gray-900/50 text-gray-400 hover:bg-gray-800/50 hover:text-gray-300"
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 flex items-center justify-center shrink-0 ${color}`}
                  >
                    {f ? getFileIcon(f.name).icon : <File size={13} />}
                  </span>
                  <span className="truncate max-w-32">{f?.name || path}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(path);
                    }}
                    className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-700 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Code Editor */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* GitHub token expired — offer a one-click reconnect */}
          {authExpired && (
            <div className="flex items-center justify-between gap-3 border-b border-red-800/60 bg-red-950/50 px-4 py-2.5 text-xs text-red-200">
              <span className="flex items-center gap-2">
                <span>⚠️</span>
                GitHub access for this repo has expired. Reconnect to load files again.
              </span>
              <button
                onClick={handleReconnectGithub}
                disabled={reconnecting}
                className="shrink-0 rounded-md bg-white px-3 py-1 font-medium text-gray-900 hover:bg-gray-100 disabled:opacity-60"
              >
                {reconnecting ? "Reconnecting…" : "Reconnect GitHub"}
              </button>
            </div>
          )}

          {/* Locked banner when the member hasn't accepted code access */}
          {!loading && codeAccess !== "loading" && !canEdit && (
            <div className="flex items-center gap-2 border-b border-amber-800/60 bg-amber-950/40 px-4 py-2 text-xs text-amber-300">
              <span>🔒</span>
              {codeAccess === "INVITED" ? (
                <span>
                  You have a pending GitHub invite for this repo.{" "}
                  <a href="/profile" className="underline hover:text-amber-200">
                    Accept it on your profile
                  </a>{" "}
                  to edit code.
                </span>
              ) : codeAccess === "PENDING_GITHUB" ? (
                <span>
                  Connect GitHub on your{" "}
                  <a href="/profile" className="underline hover:text-amber-200">
                    profile
                  </a>{" "}
                  — the owner has queued a collaborator invite for you.
                </span>
              ) : (
                <span>Read-only. Ask the group owner to invite you as a code collaborator.</span>
              )}
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                  Loading editor...
                </div>
              </div>
            ) : (
              <CodeMirror
                value={fileContent}
                height="100%"
                theme="dark"
                editable={canEdit}
                readOnly={!canEdit}
                extensions={[getFileLanguage(fileName)]}
                onChange={handleFileChange}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLineGutter: true,
                  highlightActiveLine: true,
                  foldGutter: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  indentOnInput: true,
                  tabSize: 2,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
