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
import { useSession } from "next-auth/react";

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
  const [originalContent, setOriginalContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isEdited, setIsEdited] = useState(false);
  const { data: session } = useSession();
  const userId = session?.user.id;
  const [filePath, setFilePath] = useState<string>("");

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
      setFilePath(file.path);
      try {
        const res = await fetch(file.url);
        if (!res.ok) throw new Error("Failed to fetch file content");
        const data = await res.json();
        const content = atob(data.content);
        setFileContent(content);
        setOriginalContent(content);
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
    const originalLines = originalContent.split("\n");
    const newLines = newContent.split("\n");

    const changes: { type: string; lineNumber: number; content: string }[] = [];

    // Track added and modified lines in the new content
    newLines.forEach((line, index) => {
      if (index >= originalLines.length) {
        // New line added
        changes.push({ type: "added", lineNumber: index + 1, content: line });
      } else if (line !== originalLines[index]) {
        // Line modified
        changes.push({
          type: "modified",
          lineNumber: index + 1,
          content: line,
        });
      }
    });

    // Track removed lines from the original content
    originalLines.forEach((line, index) => {
      if (index >= newLines.length) {
        // Line removed
        changes.push({ type: "removed", lineNumber: index + 1, content: line });
      }
    });

    // Log the detected changes
    console.log("Detected Changes:", changes);

    // If any changes, mark as edited
    if (changes.length > 0) {
      setIsEdited(true);
    } else {
      setIsEdited(false);
    }

    // Update the file content
    setFileContent(newContent);
  };

  const handleFileClick = async (name: string) => {
    setFileName(name);
    await loadFileContent(name);
    setIsEdited(false);
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
        const data = res.json()
        console.log(data)

        if (!res.ok) {
          throw new Error("Failed to save the file");
        }

        toast.success("File saved successfully!");
        setIsEdited(false);
        router.push(`/confirm-changes/${group}`);
      } catch (error) {
        console.error("Error saving file:", error);
        toast.error("Failed to save the file.");
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
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
              className={`mr-2 p-2 text-sm md:text-base ${
                fileName === file ? "bg-gray-700" : "hover:bg-gray-600"
              } rounded`}
            >
              {file}
            </button>
          ))}
        </div>
        {/* Code Editor */}
        <div className="flex-grow overflow-auto">
          {loading ? (
            <p className="text-white">Loading...</p>
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

      {/* Save Button */}
      <div className="p-4 bg-gray-800 text-white md:order-3">
        <button
          onClick={handleSave}
          disabled={!isEdited}
          className={`p-2 rounded ${
            isEdited
              ? "bg-blue-500 hover:bg-blue-400"
              : "bg-gray-500 cursor-not-allowed"
          }`}
        >
          {isEdited ? "Save Changes" : "No Changes"}
        </button>
      </div>
    </div>
  );
}
