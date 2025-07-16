import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  const { filePath } = await req.json();
  const fullPath = path.join(process.cwd(), filePath);

  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json(
      { message: "Error reading file", error },
      { status: 500 }
    );
  }
}
