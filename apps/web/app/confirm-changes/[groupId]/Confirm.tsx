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
import { useSession } from "next-auth/react";

interface GroupProps {
  group: string;
}

interface File {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  content?: string;
  userId?: string;
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

const Confirm = ({ group }: GroupProps) => {
  const [selectedPath, setSelectedPath] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [modifiedFiles, setModifiedFiles] = useState<File[]>([]);
  const [loadingState, setLoadingState] = useState({
    loading: true,
    changeRequestLoading: false,
  });
  const [fileContent, setFileContent] = useState({
    original: "",
    modified: "",
  });
  const [selectedSection, setSelectedSection] = useState<"github" | "modified">(
    "github",
  );

  const { data: session } = useSession();
  const userId = session?.user?.id;
  const userName = session?.user?.name;
  const [groupOwnerId, setGroupOwnerId] = useState("");
  const [groupOwnerName, setGroupOwnerName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [commitLink, setCommitLink] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [crMessage, setCrMessage] = useState("");

  useEffect(() => {
    if (group && userId) {
      const fetchFiles = async () => {
        try {
          const [githubRes, groupRes, modifiedRes] = await Promise.all([
            fetch(`/api/files?group=${group}`),
            fetch(`/api/create-group-data?group=${group}`),
            fetch(`/api/modified-files?group=${group}&userId=${userId}`),
          ]);

          if (!githubRes.ok || !groupRes.ok)
            throw new Error("Failed to fetch file data");

          const githubData = await githubRes.json();
          const groupData = await groupRes.json();

          setFiles(Array.isArray(githubData) ? githubData : []);

          let modifiedData: any[] = [];
          if (modifiedRes.ok) {
            modifiedData = await modifiedRes.json();
            setModifiedFiles(Array.isArray(modifiedData) ? modifiedData : []);
          }

          setGroupOwnerId(groupData.ownerId);
          setGroupOwnerName(groupData.ownerName);
          setGroupName(groupData.githubRepo);

          const allFiles = [
            ...(Array.isArray(githubData) ? githubData : []),
            ...(Array.isArray(modifiedData) ? modifiedData : []),
          ];

          if (allFiles.length > 0) {
            const firstPath = allFiles[0].path || allFiles[0].name;
            await loadFileContent(firstPath);
          }
        } catch (error) {
          console.error("Error fetching files:", error);
          toast.error("Failed to load files.");
        } finally {
          setLoadingState((prev) => ({ ...prev, loading: false }));
        }
      };

      fetchFiles();
    }
  }, [group, userId]);

  const loadFileContent = async (path: string) => {
    setSelectedPath(path);

    const file = files.find((f) => f.path === path);
    const modifiedFile = modifiedFiles.find((f) => f.path === path);

    try {
      if (file && file.url) {
        const res = await fetch(file.url);
        if (res.ok) {
          const data = await res.json();
          const content =
            data.encoding === "base64" ? atob(data.content) : data.content;
          setFileContent((prev) => ({ ...prev, original: content }));
        } else {
          setFileContent((prev) => ({ ...prev, original: "" }));
        }
      } else {
        setFileContent((prev) => ({ ...prev, original: "" }));
      }

      if (modifiedFile) {
        const modifiedContent = modifiedFile.content
          ? atob(modifiedFile.content)
          : "";
        setFileContent((prev) => ({ ...prev, modified: modifiedContent }));
      } else {
        setFileContent((prev) => ({ ...prev, modified: "" }));
      }
    } catch (error) {
      setFileContent((prev) => ({
        ...prev,
        original: "",
      }));
    }
  };

  const handleFileClick = (path: string) => {
    loadFileContent(path);
  };

  const raiseChangeRequest = async () => {
    if (!crMessage.trim()) {
      toast.error("Please enter a description of your changes.");
      return;
    }

    setLoadingState((prev) => ({ ...prev, changeRequestLoading: true }));
    try {
      const response = await fetch(`/api/change-request?group=${group}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          userName,
          message: crMessage,
        }),
      });

      if (!response.ok) throw new Error("Failed to raise change request");

      toast.success("Change request raised successfully!");
      setCrMessage("");
    } catch (error) {
      console.error("Error while raising CR:", error);
      toast.error("Failed to raise change request.");
    } finally {
      setLoadingState((prev) => ({ ...prev, changeRequestLoading: false }));
    }
  };

  const getFileLanguage = (fileName: string) => {
    const ext = "." + fileName.split(".").pop()?.toLowerCase();
    const lang = EXTENSION_MAP[ext];
    return lang ? lang() : javascript();
  };

  const handleApproveCr = async () => {
    if (!commitMessage.trim()) {
      toast.error("Please enter a commit message.");
      return;
    }

    setLoadingState((prev) => ({ ...prev, changeRequestLoading: true }));

    try {
      const modifiedFilesData = modifiedFiles.map((file) => ({
        path: file.path,
        content: file.content,
        sha: file.sha,
      }));

      const response = await fetch("/api/commit-changes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          modifiedFiles: modifiedFilesData,
          groupId: group,
          message: commitMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to commit changes");
      }

      const responseData = await response.json();
      setCommitLink(responseData.commitUrl);
      toast.success("Changes committed successfully!");
      setCommitMessage("");
    } catch (error) {
      console.error("Error while committing changes:", error);
      toast.error("Failed to commit changes.");
    } finally {
      setLoadingState((prev) => ({ ...prev, changeRequestLoading: false }));
    }
  };

  const handleRejectCr = async () => {
    toast.success("Change request rejected.");
  };

  const selectedFile = [...files, ...modifiedFiles].find(
    (f) => f.path === selectedPath,
  );
  const isNewFile = selectedFile && !files.find((f) => f.path === selectedPath);

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <div className="flex-none p-4 bg-gray-800">
        <h2 className="font-bold mb-4 text-white">
          Files for Group: {groupName}
        </h2>

        {userId === groupOwnerId ? (
          <div>
            <p className="text-white mb-4">
              Hello, {groupOwnerName}! You are the owner of this group.
            </p>

            <div className="commitContainer mb-4">
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Enter commit message"
                className="p-2 mb-2 rounded text-black w-full"
              />
              <div className="flex gap-2">
                <button
                  className="bg-green-600 hover:bg-green-700 text-white p-2 rounded disabled:opacity-50"
                  onClick={handleApproveCr}
                  disabled={
                    loadingState.changeRequestLoading || !commitMessage.trim()
                  }
                >
                  {loadingState.changeRequestLoading
                    ? "Approving..."
                    : "Approve"}
                </button>
                <button
                  className="bg-red-600 hover:bg-red-700 text-white p-2 rounded"
                  onClick={handleRejectCr}
                >
                  Reject
                </button>
              </div>
            </div>

            {commitLink && (
              <p className="mt-4 text-pink-400">
                Your changes have been committed. You can view them{" "}
                <a
                  href={commitLink}
                  target="_blank"
                  className="underline hover:text-pink-600"
                >
                  here
                </a>
                .
              </p>
            )}
          </div>
        ) : (
          <div className="mb-4">
            <input
              type="text"
              value={crMessage}
              onChange={(e) => setCrMessage(e.target.value)}
              placeholder="Describe what changes you made..."
              className="p-2 mb-2 rounded text-black w-full"
            />
            <button
              onClick={raiseChangeRequest}
              disabled={
                loadingState.changeRequestLoading || !crMessage.trim()
              }
              className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded disabled:opacity-50"
            >
              {loadingState.changeRequestLoading
                ? "Raising..."
                : "Raise Change Request"}
            </button>
          </div>
        )}

        <div className="flex space-x-4">
          <div className="w-1/2">
            <h3 className="font-bold text-white mb-2">GitHub Files</h3>
            <ul className="flex flex-wrap overflow-x-auto">
              {files.map((file) => (
                <li key={file.path} className="mb-2 mr-2">
                  <button
                    onClick={() => {
                      setSelectedSection("github");
                      handleFileClick(file.path);
                    }}
                    className={`block w-full text-left p-2 rounded transition-all duration-300 ${
                      selectedPath === file.path &&
                      selectedSection === "github"
                        ? "bg-gray-700"
                        : "hover:bg-gray-600"
                    }`}
                  >
                    {file.path}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="w-1/2">
            <h3 className="font-bold text-white mb-2">Modified Files</h3>
            <ul className="flex flex-wrap overflow-x-auto">
              {modifiedFiles.map((file) => (
                <li key={file.path} className="mb-2 mr-2">
                  <button
                    onClick={() => {
                      setSelectedSection("modified");
                      handleFileClick(file.path);
                    }}
                    className={`block w-full text-left p-2 rounded transition-all duration-300 ${
                      selectedPath === file.path &&
                      selectedSection === "modified"
                        ? "bg-gray-700"
                        : "hover:bg-gray-600"
                    }`}
                  >
                    {file.path}
                    {!files.find((f) => f.path === file.path) && (
                      <span className="ml-1 text-xs text-green-400">[NEW]</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex-grow p-4 overflow-hidden">
        {loadingState.loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-pink-500"></div>
            <p className="ml-4 text-pink-500">Loading...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="flex flex-col">
              <h4 className="font-bold text-white mb-2">
                {isNewFile ? "Original (new file)" : "Original File"}
              </h4>
              <div className="flex-grow overflow-auto">
                <CodeMirror
                  value={
                    isNewFile
                      ? "// This is a new file — no original on GitHub"
                      : fileContent.original
                  }
                  extensions={[
                    getFileLanguage(selectedFile?.name || "file.js"),
                  ]}
                  theme="dark"
                  height="100%"
                  readOnly
                />
              </div>
            </div>
            <div className="flex flex-col">
              <h4 className="font-bold text-white mb-2">Modified File</h4>
              <div className="flex-grow overflow-auto">
                <CodeMirror
                  value={fileContent.modified || "// No changes"}
                  extensions={[
                    getFileLanguage(selectedFile?.name || "file.js"),
                  ]}
                  theme="dark"
                  height="100%"
                  readOnly
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Confirm;
