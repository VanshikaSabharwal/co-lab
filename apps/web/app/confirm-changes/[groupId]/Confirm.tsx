"use client";

import { useState, useEffect } from "react";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { java } from "@codemirror/lang-java";
import { css } from "@codemirror/lang-css";
import CodeMirror from "@uiw/react-codemirror";
import toast from "react-hot-toast";
import React from "react";
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
}

export default function Confirm({ group }: GroupProps) {
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [modifiedContent, setModifiedContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [modifiedFiles, setModifiedFiles] = useState<File[]>([]);
  const [selectedSection, setSelectedSection] = useState<"github" | "modified">(
    "github"
  );
  const { data: session } = useSession();
  const userId = session?.user.id;

  useEffect(() => {
    if (group) {
      const fetchFileContent = async () => {
        try {
          const res = await fetch(`/api/files?group=${group}`);
          if (!res.ok) throw new Error("Failed to fetch file content");

          const data = await res.json();
          setFiles(data);
          if (data.length > 0) {
            setFileName(data[0].name);
            await loadFileContent(data[0].name);
          }
        } catch (error) {
          console.error("Error fetching file content:", error);
          toast.error("Failed to load the files.");
        } finally {
          setLoading(false);
        }
      };
      fetchFileContent();
    }
  }, [group]);

  useEffect(() => {
    const fetchModifiedFiles = async () => {
      try {
        const res = await fetch(
          `/api/save-coding-files?group=${group}&userId=${userId}`
        );
        if (!res.ok) throw new Error("Failed to fetch modified files");

        const data = await res.json();
        setModifiedFiles(data);
      } catch (error) {
        console.error("Error fetching modified files:", error);
        toast.error("Failed to load modified files.");
      }
    };
    fetchModifiedFiles();
  }, [group, userId]);

  const loadFileContent = async (name: string) => {
    const file = files.find((f) => f.name === name);
    if (file) {
      try {
        const res = await fetch(file.url);
        if (!res.ok) throw new Error("Failed to fetch file content");
        const data = await res.json();

        const content = atob(data.content);
        setFileContent(content);

        if (!openFiles.includes(name)) {
          setOpenFiles((prev) => [...prev, name]);
        }
      } catch (error) {
        console.error("Error fetching file content:", error);
        toast.error("Failed to load the file content.");
      }
    }
  };

  const loadModifiedContent = async (name: string) => {
    const file = modifiedFiles.find((f) => f.name === name);
    if (file) {
      try {
        if (file.content) {
          // If content is already available, decode it
          const decodedContent = atob(file.content);
          setModifiedContent(decodedContent);
        } else if (file.url) {
          // If content is not available but URL is, fetch the content
          const res = await fetch(file.url);
          if (!res.ok) throw new Error("Failed to fetch modified file content");
          const data = await res.json();
          const content = atob(data.content);
          setModifiedContent(content);
        } else {
          throw new Error("No content or URL available for modified file");
        }

        if (!openFiles.includes(name)) {
          setOpenFiles((prev) => [...prev, name]);
        }
      } catch (error) {
        console.error("Error loading modified file content:", error);
        toast.error("Failed to load the modified file content.");
        setModifiedContent("");
      }
    } else {
      setModifiedContent("");
    }
  };

  const handleFileClick = async (name: string) => {
    setFileName(name);
    await loadFileContent(name);
    await loadModifiedContent(name);
  };

  const getFileLanguage = (fileName: string) => {
    if (fileName.endsWith(".js")) return javascript();
    if (fileName.endsWith(".py")) return python();
    if (fileName.endsWith(".java")) return java();
    if (fileName.endsWith(".html")) return html();
    if (fileName.endsWith(".css")) return css();
    return javascript();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <div className="flex-none p-4 bg-gray-800">
        <h2 className="font-bold mb-4 text-white">Files</h2>
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
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-pink-500"></div>
            <p className="ml-4 text-pink-500">Loading...</p>
          </div>
        ) : (
          <div className="flex h-full space-x-4">
            <div className="w-1/2 h-full">
              <h3 className="font-bold text-white mb-2">Original Code</h3>
              <CodeMirror
                value={fileContent}
                height="calc(100% - 2rem)"
                extensions={[getFileLanguage(fileName)]}
                onChange={setFileContent}
                theme="dark"
                className="rounded-lg shadow-md overflow-auto"
              />
            </div>
            <div className="w-1/2 h-full">
              <h3 className="font-bold text-white mb-2">Modified Code</h3>
              <CodeMirror
                value={modifiedContent}
                height="calc(100% - 2rem)"
                extensions={[getFileLanguage(fileName)]}
                onChange={setModifiedContent}
                theme="dark"
                className="rounded-lg shadow-md overflow-auto"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
