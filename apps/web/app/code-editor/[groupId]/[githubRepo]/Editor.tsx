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
}

export default function Editor({ github, group }: CodeProps) {
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [originalContent, setOriginalContent] = useState(""); // Store the original content
  const [loading, setLoading] = useState(true);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isEdited, setIsEdited] = useState(false); // Track if any file is edited
  const router = useRouter();

  useEffect(() => {
    if (group && github) {
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
  }, [group, github]);

  const loadFileContent = async (name: string) => {
    const file = files.find((f) => f.name === name);
    if (file) {
      try {
        const res = await fetch(file.url);
        if (!res.ok) throw new Error("Failed to fetch file content");
        const data = await res.json();
        const content = atob(data.content);
        setFileContent(content);
        setOriginalContent(content); // Set the original content when the file is loaded
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
    if (newContent !== originalContent) {
      setIsEdited(true); // Mark as edited if content differs
    } else {
      setIsEdited(false); // Not edited if content matches original
    }
  };

  const handleFileClick = async (name: string) => {
    setFileName(name);
    await loadFileContent(name);
    setIsEdited(false); // Reset editing status when switching files
  };

  const getFileLanguage = (fileName: string) => {
    if (fileName.endsWith(".js")) return javascript();
    if (fileName.endsWith(".py")) return python();
    if (fileName.endsWith(".java")) return java();
    if (fileName.endsWith(".html")) return html();
    if (fileName.endsWith(".css")) return css();
    return javascript();
  };

  const handleSave = async () => {
    if (isEdited) {
      try {
        // Replace with your actual API endpoint to save the edited file
        const res = await fetch(`/api/save-file`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName,
            content: btoa(fileContent), // Convert content to base64 before saving
            group,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to save the file");
        }

        toast.success("File saved successfully!");
        setIsEdited(false); // Reset editing status after saving
        router.push(`/confirm-changes/${group}`);
      } catch (error) {
        console.error("Error saving file:", error);
        toast.error("Failed to save the file.");
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* File Navigation */}
      <div className="bg-gray-800 text-white p-4 md:order-1">
        <h2 className="font-bold mb-4">Files</h2>
        <ul className="flex flex-wrap md:flex-nowrap overflow-x-auto">
          {files.map((file) => (
            <li key={file.name} className="mb-2 mr-2">
              <button
                onClick={() => handleFileClick(file.name)}
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

      {/* Main Editor Area */}
      <div className="flex-grow flex flex-col bg-gray-900 md:order-2">
        {/* Header */}
        <div className="p-4 bg-gray-800 text-white flex justify-between items-center shadow-lg">
          <h1 className="text-lg md:text-xl font-bold truncate">{fileName}</h1>
        </div>
        {/* File Tabs */}
        <div className="flex bg-gray-800 p-2 overflow-x-auto">
          {openFiles.map((file) => (
            <button
              key={file}
              onClick={() => handleFileClick(file)}
              className={`p-2 px-4 whitespace-nowrap transition-all duration-300 ${
                fileName === file ? "bg-gray-700" : "hover:bg-gray-600"
              }`}
            >
              {file}
            </button>
          ))}
        </div>

        {/* Save Button */}
        <div className="p-4 bg-gray-800 flex justify-end">
          <button
            onClick={handleSave}
            disabled={!isEdited} // Disable the save button if no changes
            className={`${
              isEdited
                ? "bg-pink-500 hover:bg-pink-600"
                : "bg-gray-600 cursor-not-allowed"
            } text-white py-2 px-4 rounded-lg transition-all duration-300`}
          >
            Save
          </button>
        </div>
        {/* CodeMirror Editor */}
        <div className="flex-grow overflow-auto p-4 relative">
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
    </div>
  );
}
