import { NextResponse } from "next/server";

import { forwardAuthHeaders, getDjangoBaseUrl } from "@/lib/django-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const response = await fetch(`${getDjangoBaseUrl()}/api/logout/`, {
      method: "POST",
      headers: forwardAuthHeaders(request),
      cache: "no-store",
      signal: AbortSignal.timeout(2_500),
    });

    const result = NextResponse.json(
      { ok: response.ok },
      { status: response.status },
    );

    // O Django expira o cookie de sessao; repassa isso ao navegador.
    for (const cookie of response.headers.getSetCookie()) {
      result.headers.append("set-cookie", cookie);
    }

    return result;
  } catch {
    return NextResponse.json(
      { error: "Django indisponivel." },
      { status: 502 },
    );
  }
}
