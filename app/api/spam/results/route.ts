// app/api/spam/results/route.ts
import { NextResponse } from "next/server";
import { getFoundCodes, ValidClassCode } from "@/src/scanner";

export async function GET() {
  const validClassCodes: ValidClassCode[] = getFoundCodes();
  return NextResponse.json({ validClassCodes });
}