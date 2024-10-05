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

const Editor: React.FC<CodeProps> = ({ github, group }) => {
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);

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
    <div className="flex flex-col md:flex-row h-screen transition-all duration-300">
      {/* Sidebar for File Navigation */}
      <div className="w-full md:w-64 bg-gray-800 text-white p-4 overflow-y-auto transition-all duration-300 fixed md:relative h-full z-10">
        <h2 className="font-bold mb-4">Files</h2>
        <ul>
          {files.map((file) => (
            <li key={file.name} className="mb-2">
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
      <div className="flex-grow flex flex-col w-1/5 md: ml-64 md:ml-0 bg-gray-900 transition-all duration-300 h-80vh">
        {/* Header */}
        <div className="p-4 bg-gray-800 text-white flex  justify-between items-center shadow-lg">
          <h1 className="text-lg md:text-xl font-bold truncate">{fileName}</h1>
        </div>

        {/* File Tabs */}
        <div className="flex bg-gray-800 w-4/5 p-2 overflow-x-auto transition-all duration-300">
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

        {/* CodeMirror Editor */}
        <div className="flex-grow overflow-auto p-4 transition-all duration-300 relative">
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
              className="rounded-lg h-screen shadow-md overflow-auto"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Editor;
