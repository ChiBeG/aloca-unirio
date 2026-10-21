import { NextResponse } from "next/server";

import { getDjangoPublicUrl } from "@/lib/django-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Inicia o login Google no Django (allauth). O Django volta para o frontend ao final. */
export function GET() {
  return NextResponse.redirect(
    `${getDjangoPublicUrl()}/accounts/google/login/`,
  );
}
