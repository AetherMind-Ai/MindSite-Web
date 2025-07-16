import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  const { filePath, content } = await req.json();
  const fullPath = path.join(process.cwd(), filePath);

  try {
    fs.writeFileSync(fullPath, content);
    return NextResponse.json({ message: "File updated successfully" });
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating file", error },
      { status: 500 }
    );
  }
}
