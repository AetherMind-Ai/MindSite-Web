import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { defaultHTML, defaultCSS, defaultJS } from "@/lib/consts";

interface FileNode {
  name: string;
  children?: FileNode[];
}

const getFileStructure = (dir: string): FileNode[] => {
  const dirents = fs.readdirSync(dir, { withFileTypes: true });
  const files = dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory()
      ? { name: dirent.name, children: getFileStructure(res) }
      : { name: dirent.name };
  });
  return files;
};

export async function GET() {
  const dir = process.cwd();
  if (!fs.existsSync(path.join(dir, "index.html"))) {
    fs.writeFileSync(path.join(dir, "index.html"), defaultHTML);
    fs.writeFileSync(path.join(dir, "style.css"), defaultCSS);
    fs.writeFileSync(path.join(dir, "script.js"), defaultJS);
  }
  const structure = getFileStructure(dir);
  return NextResponse.json(structure);
}
