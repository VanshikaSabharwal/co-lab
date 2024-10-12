"use client";

import { useState, useEffect } from "react";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { java } from "@codemirror/lang-java";
import { css } from "@codemirror/lang-css";
import CodeMirror from "@uiw/react-codemirror";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
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

const Confirm = ({ group }: GroupProps) => {
  const [fileName, setFileName] = useState("");
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
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<"github" | "modified">(
    "github"
  );

  const { data: session } = useSession();
  const userId = session?.user?.id;
  const userName = session?.user?.name;
  const [groupOwnerId, setGroupOwnerId] = useState("");
  const [groupOwnerName, setGroupOwnerName] = useState("");
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    if (group && userId) {
      const fetchFiles = async () => {
        try {
          const [githubRes, groupRes] = await Promise.all([
            fetch(`/api/files?group=${group}`),
            fetch(`/api/create-group-data?group=${group}`),
          ]);

          if (!githubRes.ok || !groupRes.ok)
            throw new Error("Failed to fetch file data");

          const githubData = await githubRes.json();
          const groupData = await groupRes.json();

          setFiles(Array.isArray(githubData) ? githubData : []);

          // Fetch modified files using the new GET endpoint
          const modifiedRes = await fetch(
            `/api/modified-files?group=${group}&userId=${userId}`,
            { method: "GET" }
          );
          if (!modifiedRes) throw new Error("Failed to fetch modified files: ");

          const modifiedData = await modifiedRes.json();

          setModifiedFiles(modifiedData ? [modifiedData] : []);
          setGroupOwnerId(groupData.ownerId);
          setGroupOwnerName(groupData.ownerName);
          setGroupName(groupData.groupName);

          if (githubData.length > 0) {
            await loadFileContent(githubData[0].name);
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

  const loadFileContent = async (name: string) => {
    const file = files.find((f) => f.name === name);
    const modifiedFile = modifiedFiles.find((f) => f.name === name);

    try {
      if (file) {
        const res = await fetch(file.url);
        if (!res.ok) throw new Error("Failed to fetch file content");
        const data = await res.json();
        const content = atob(data.content);
        setFileContent((prev) => ({ ...prev, original: content }));
      }

      if (modifiedFile) {
        const modifiedContent = modifiedFile.content
          ? atob(modifiedFile.content)
          : "";
        setFileContent((prev) => ({ ...prev, modified: modifiedContent }));
      }

      if (!openFiles.includes(name)) {
        setOpenFiles((prev) => [...prev, name]);
      }
    } catch (error) {
      console.error("Error loading content:", error);
      toast.error("Failed to load file content.");
    }
  };

  const handleFileClick = (name: string) => {
    setFileName(name);
    loadFileContent(name);
  };

  const raiseChangeRequest = async () => {
    const crId = uuidv4();
    setLoadingState((prev) => ({ ...prev, changeRequestLoading: true }));
    try {
      const response = await fetch(`/api/change-request?group=${group}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, userName, groupName: group }),
      });

      if (!response.ok) throw new Error("Failed to raise change request");

      toast.success("Change request raised successfully!");
    } catch (error) {
      console.error("Error while raising CR:", error);
      toast.error("Failed to raise change request.");
    } finally {
      setLoadingState((prev) => ({ ...prev, changeRequestLoading: false }));
    }
  };

  const getFileLanguage = (fileName: string) => {
    if (fileName.endsWith(".js")) return javascript();
    if (fileName.endsWith(".py")) return python();
    if (fileName.endsWith(".java")) return java();
    if (fileName.endsWith(".html")) return html();
    if (fileName.endsWith(".css")) return css();
    return javascript();
  };

  const handleApproveCr = async () => {
    setLoadingState((prev) => ({ ...prev, changeRequestLoading: true }));

    try {
      const modifiedFilesData = modifiedFiles.map((file) => ({
        path: file.path,
        content: file.content,
        sha: file.sha,
      }));

      const response = await fetch(`/api/commit-changes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          repoOwner: groupOwnerId,
          repoName: groupName,
          modifiedFiles: modifiedFilesData,
          groupId: group,
        }),
      });

      if (!response.ok) throw new Error("Failed to commit changes");

      toast.success("Changes committed successfully!");
    } catch (error) {
      console.error("Error while committing changes:", error);
      toast.error("Failed to commit changes.");
    } finally {
      setLoadingState((prev) => ({ ...prev, changeRequestLoading: false }));
    }
  };

  const handleApprove = async () => {
    setLoadingState((prev) => ({ ...prev, changeRequestLoading: true }));

    try {
      const modifiedFilesData = modifiedFiles.map((file) => ({
        path: file.path,
        content: file.content,
        sha: file.sha,
      }));

      const response = await fetch(`/api/commit-changes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId: group,
          userId,
          modifiedFiles: modifiedFilesData,
        }),
      });

      if (!response) throw new Error("Failed to commit changes");

      toast.success("Changes committed successfully!");
    } catch (error) {
      console.error("Error while committing changes:", error);
      toast.error("Failed to commit changes.");
    } finally {
      setLoadingState((prev) => ({ ...prev, changeRequestLoading: false }));
    }
  };

  const handleRejectCr = async () => {
    alert("Rejected CR");
  };

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
            <button
              className="mr-2 bg-green-500 p-2 rounded"
              onClick={async () => {
                await handleApprove();
              }}
            >
              Approve
            </button>

            <button
              className="bg-red-500 p-2 rounded"
              onClick={async () => {
                await handleRejectCr();
              }}
            >
              Reject
            </button>
          </div>
        ) : (
          <button
            onClick={raiseChangeRequest}
            disabled={loadingState.changeRequestLoading}
            className="bg-blue-500 p-2 rounded"
          >
            {loadingState.changeRequestLoading
              ? "Raising..."
              : "Raise Change Request"}
          </button>
        )}

        <div className="flex space-x-4">
          <div className="w-1/2">
            <h3 className="font-bold text-white mb-2">GitHub Files</h3>
            <ul className="flex flex-wrap overflow-x-auto">
              {files.map((file) => (
                <li key={file.name} className="mb-2 mr-2">
                  <button
                    onClick={() => {
                      setSelectedSection("github");
                      handleFileClick(file.name);
                    }}
                    className={`block w-full text-left p-2 rounded transition-all duration-300 ${
                      fileName === file.name && selectedSection === "github"
                        ? "bg-gray-700"
                        : "hover:bg-gray-600"
                    }`}
                  >
                    {file.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="w-1/2">
            <h3 className="font-bold text-white mb-2">Modified Files</h3>
            <ul className="flex flex-wrap overflow-x-auto">
              {modifiedFiles.map((file) => (
                <li key={file.name} className="mb-2 mr-2">
                  <button
                    onClick={() => {
                      setSelectedSection("modified");
                      handleFileClick(file.name);
                    }}
                    className={`block w-full text-left p-2 rounded transition-all duration-300 ${
                      fileName === file.name && selectedSection === "modified"
                        ? "bg-gray-700"
                        : "hover:bg-gray-600"
                    }`}
                  >
                    {file.name}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-bold text-white mb-2">Original File</h4>
              <CodeMirror
                value={fileContent.original}
                extensions={[getFileLanguage(fileName)]}
                theme="dark"
                height="400px"
                readOnly
              />
            </div>
            <div>
              <h4 className="font-bold text-white mb-2">Modified File</h4>
              <CodeMirror
                value={fileContent.modified}
                extensions={[getFileLanguage(fileName)]}
                theme="dark"
                height="400px"
                readOnly
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Confirm;
