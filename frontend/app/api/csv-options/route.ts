import { NextResponse } from "next/server";

import { loadCsvOptionsFromDjango } from "@/lib/django-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const options = await loadCsvOptionsFromDjango();

  return NextResponse.json(options);
}
