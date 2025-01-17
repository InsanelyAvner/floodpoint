import { NextResponse } from "next/server";
import { stopScan, isScanning } from "@/src/scanner";

export async function POST() {
  if (!isScanning()) {
    return NextResponse.json({ stopped: false, message: "No scan is currently running." }, { status: 400 });
  }

  stopScan();
  return NextResponse.json({ stopped: true, message: "Scan has been stopped." });
}