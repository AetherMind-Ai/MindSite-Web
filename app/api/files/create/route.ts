import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  const { filePath } = await req.json();
  const fullPath = path.join(process.cwd(), filePath);

  try {
    fs.writeFileSync(fullPath, "");
    return NextResponse.json({ message: "File created successfully" });
  } catch (error) {
    return NextResponse.json(
      { message: "Error creating file", error },
      { status: 500 }
    );
  }
}
