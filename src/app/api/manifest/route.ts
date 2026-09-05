// Manifesto da entidade para o Core Orchestrator da GTA7 Lab.
// GET /api/manifest
import { NextRequest, NextResponse } from "next/server";
import manifest from "../../../../manifest.json";

export function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  return NextResponse.json({
    ...manifest,
    base_url: origin,
    mcp: { ...manifest.mcp, url: `${origin}${manifest.mcp.endpoint}` },
  });
}
