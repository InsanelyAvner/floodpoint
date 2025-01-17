// app/api/spam/start/route.ts
import { NextResponse } from "next/server";
import { startScanIfNotRunning } from "@/src/scanner";

export async function POST(request: Request) {
  try {
    const { start, end } = await request.json();

    // Validate input
    const scanStart = typeof start === "number" ? start : 10000;
    const scanEnd = typeof end === "number" ? end : 99999;

    // Start scanning in the background
    startScanIfNotRunning(scanStart, scanEnd);

    return NextResponse.json({ started: true, message: "Scan initiated." });
  } catch (error) {
    return NextResponse.json({ started: false, message: "Failed to start scan." }, { status: 500 });
  }
}