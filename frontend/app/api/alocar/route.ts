import { NextResponse } from "next/server";

import {
  runAllocationThroughDjango,
  validateAllocationValues,
} from "@/lib/django-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, string>;
    const values = validateAllocationValues(payload);
    const { html, cursos, professores, conflitos } = await runAllocationThroughDjango(values);

    if (!html.trim()) {
      return NextResponse.json(
        { error: "Django retornou uma resposta vazia." },
        { status: 502 },
      );
    }

    return NextResponse.json({ html, cursos, professores, conflitos });
  } catch (error) {
    return NextResponse.json({ error: getPublicError(error) }, { status: 502 });
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
