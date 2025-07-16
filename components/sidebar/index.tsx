"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react"; // Import the X icon
import { FaHtml5 } from "react-icons/fa";
import { FaCss3Alt } from "react-icons/fa";
import { RiJavascriptFill } from "react-icons/ri";
import { api } from "@/lib/api"; // Import the api utility

interface FileNode {
  name: string;
  children?: FileNode[];
}

// A simple component to render a single file item
interface FileItemProps {
  name: string;
  path: string;
  icon: React.ReactNode;
  onSelectFile: (filePath: string, content: string) => void;
  content: string;
}

const FileItem = ({
  name,
  path,
  icon,
  onSelectFile,
  content,
}: FileItemProps) => {
  return (
    <div
      onClick={() => onSelectFile(path, content)}
      className="flex cursor-pointer items-center rounded-md p-2 transition-colors hover:bg-neutral-800"
    >
      {/* The colored icon is passed in as a prop */}
      {icon}
      <span className="ml-3">{name}</span>
    </div>
  );
};

interface FileData {
  name: string;
  content: string;
}

interface SidebarProps {
  onSelectFile: (filePath: string, content: string) => void;
  onClose: () => void;
}

export const Sidebar = ({ onSelectFile, onClose }: SidebarProps) => {
  const [files, setFiles] = useState<FileData[]>([]);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await api.get("/files");
        const filePromises = response.data
          .filter(
            (file: FileNode) =>
              file.name.endsWith(".html") ||
              file.name.endsWith(".css") ||
              file.name.endsWith(".js")
          )
          .map(async (file: FileNode) => {
            const contentResponse = await api.post("/files/read", {
              filePath: file.name,
            });
            return {
              name: file.name,
              content: contentResponse.data.content,
            };
          });
        const fileData = await Promise.all(filePromises);
        setFiles(fileData);
      } catch (error) {
        console.error("Error fetching files:", error);
      }
    };
    fetchFiles();
  }, []);

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith(".html")) {
      return <FaHtml5 className="h-5 w-5 text-orange-500" />;
    } else if (fileName.endsWith(".css")) {
      return <FaCss3Alt className="h-5 w-5 text-blue-500" />;
    } else if (fileName.endsWith(".js")) {
      return <RiJavascriptFill className="h-5 w-5 text-yellow-400" />;
    }
    return null;
  };

  return (
    <div className="flex h-full w-64 flex-col p-4 text-white" style={{ backgroundColor: "rgb(31,31,31)" }}>
      <div className="mb-4 flex items-center justify-between pb-4 border-b border-neutral-700">
        <h2 className="text-lg font-bold">Files</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg transition-all duration-200 hover:bg-red-500/20 group"
        >
          <X className="h-5 w-5 text-neutral-400 group-hover:text-red-500 transition-colors duration-200" />
        </button>
      </div>
      <div className="flex-grow pt-4">
        {files.map((file) => (
          <FileItem
            key={file.name}
            name={file.name}
            path={file.name}
            icon={getFileIcon(file.name)}
            onSelectFile={onSelectFile}
            content={file.content}
          />
        ))}
      </div>
    </div>
  );
};
