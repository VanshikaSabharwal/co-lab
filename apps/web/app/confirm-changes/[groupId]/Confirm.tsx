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
import { useRouter } from "next/navigation";

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

const Confirm: React.FC<GroupProps> = ({ group }) => {
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [modifiedFiles, setModifiedFiles] = useState<File[]>([]); // For files saved in the DB
  const [selectedSection, setSelectedSection] = useState<"github" | "modified">(
    "github"
  );

  // Fetch GitHub files
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

  // Fetch modified files from DB
  useEffect(() => {
    const fetchModifiedFiles = async () => {
      try {
        const res = await fetch(`/api/modified-files?group=${group}`);
        if (!res.ok) throw new Error("Failed to fetch modified files");

        const data = await res.json();
        setModifiedFiles(data);
      } catch (error) {
        console.error("Error fetching modified files:", error);
        toast.error("Failed to load modified files.");
      }
    };
    fetchModifiedFiles();
  }, [group]);

  const loadFileContent = async (name: string) => {
    const file = files.find((f) => f.name === name);
    if (file) {
      try {
        const res = await fetch(file.url);
        if (!res.ok) throw new Error("Failed to fetch file content");
        const data = await res.json();
        setFileContent(atob(data.content));
        if (!openFiles.includes(name)) {
          setOpenFiles((prev) => [...prev, name]);
        }
      } catch (error) {
        console.error("Error fetching file content:", error);
        toast.error("Failed to load the file content.");
      }
    }
  };

  const handleFileChange = (newContent: string) => {
    setFileContent(newContent);
  };

  const handleFileClick = async (name: string) => {
    setFileName(name);
    await loadFileContent(name);
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
    <div className="flex h-screen bg-gray-900">
      {/* Left Column - GitHub Files */}
      <div className="w-1/2 bg-gray-800 p-4">
        <h2 className="font-bold mb-4 text-white">GitHub Files</h2>
        <ul className="flex flex-wrap md:flex-nowrap overflow-x-auto">
          {files.map((file) => (
            <li key={file.name} className="mb-2 mr-2">
              <button
                onClick={() => {
                  setSelectedSection("github");
                  handleFileClick(file.name);
                }}
                className={`block w-full text-left p-2 rounded transition-all duration-300 ${
                  fileName === file.name ? "bg-gray-700" : "hover:bg-gray-600"
                }`}
              >
                {file.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Right Column - Modified Files */}
      <div className="w-1/2 bg-gray-900 p-4">
        <h2 className="font-bold mb-4 text-white">Modified Files</h2>
        <ul className="flex flex-wrap md:flex-nowrap overflow-x-auto">
          {modifiedFiles.map((file) => (
            <li key={file.name} className="mb-2 mr-2">
              <button
                onClick={() => {
                  setSelectedSection("modified");
                  setFileName(file.name);
                  setFileContent(file.content || "");
                }}
                className={`block w-full text-left p-2 rounded transition-all duration-300 ${
                  fileName === file.name ? "bg-gray-700" : "hover:bg-gray-600"
                }`}
              >
                {file.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Code Editor Section */}
      <div className="w-full flex-grow p-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-pink-500"></div>
            <p className="ml-4 text-pink-500">Loading...</p>
          </div>
        ) : (
          <CodeMirror
            value={fileContent}
            height="100%"
            extensions={[getFileLanguage(fileName)]}
            onChange={handleFileChange}
            theme="dark"
            className="rounded-lg h-full shadow-md overflow-auto"
          />
        )}
      </div>
    </div>
  );
};

export default Confirm;
