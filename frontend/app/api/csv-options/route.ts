import { NextResponse } from "next/server";

import {
  forwardAuthHeaders,
  loadCsvOptionsFromDjango,
} from "@/lib/django-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const options = await loadCsvOptionsFromDjango(forwardAuthHeaders(request));

  return NextResponse.json(options);
}
