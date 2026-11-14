import { NextResponse } from "next/server";

import {
  DjangoError,
  InvalidRequestError,
  forwardAuthHeaders,
  runAllocationThroughDjango,
  validateAjustes,
  validateAllocationValues,
} from "@/lib/django-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const values = validateAllocationValues(
      payload as Record<string, string>,
    );
    const ajustes = validateAjustes(payload.ajustes);
    const result = await runAllocationThroughDjango(
      values,
      forwardAuthHeaders(request),
      ajustes,
    );

    if (!result.html.trim()) {
      return NextResponse.json(
        { error: "Django retornou uma resposta vazia." },
        { status: 502 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const status =
      error instanceof DjangoError
        ? error.status
        : error instanceof InvalidRequestError
          ? 400
          : 502;
    return NextResponse.json({ error: getPublicError(error) }, { status });
  }
}

function getPublicError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Falha ao executar alocacao.";
  }

  if (
    error.message === "fetch failed" ||
    error.name === "AbortError" ||
    error.name === "TimeoutError"
  ) {
    return "Django indisponivel ou sem resposta.";
  }

  return error.message;
}
