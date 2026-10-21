import { NextResponse } from "next/server";

import { forwardAuthHeaders, getDjangoBaseUrl } from "@/lib/django-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const response = await fetch(`${getDjangoBaseUrl()}/api/me/`, {
      headers: forwardAuthHeaders(request),
      cache: "no-store",
      signal: AbortSignal.timeout(2_500),
    });

    const result = NextResponse.json(await response.json(), {
      status: response.status,
    });

    // Repassa o cookie csrftoken emitido pelo Django para o navegador.
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
