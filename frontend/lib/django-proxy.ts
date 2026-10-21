import type {
  AllocationFormValues,
  CsvOption,
  CsvOptionsResponse,
} from "./allocation-client";
import { FALLBACK_CSV_OPTIONS } from "./allocation-client";

const DEFAULT_DJANGO_BASE_URL = "http://127.0.0.1:8000";
const DEFAULT_DJANGO_PUBLIC_URL = "http://localhost:8000";
const CSV_NAME_PATTERN = /^[A-Za-z0-9._-]+\.csv$/;

type DjangoIndexResponse = {
  csvs: string[];
  defaults: Partial<AllocationFormValues>;
};

type DjangoAlocarResponse = {
  html?: string;
  cursos?: string[];
  professores?: string[];
  conflitos?: string[];
  error?: string;
};

export function getDjangoBaseUrl() {
  return (process.env.DJANGO_BASE_URL ?? DEFAULT_DJANGO_BASE_URL).replace(
    /\/$/,
    "",
  );
}

/** Endereco do Django acessado pelo navegador (login via Google). */
export function getDjangoPublicUrl() {
  return (
    process.env.DJANGO_PUBLIC_URL ?? DEFAULT_DJANGO_PUBLIC_URL
  ).replace(/\/$/, "");
}

/** Erro do Django que preserva o status HTTP (ex.: 401/403 de autenticacao). */
export class DjangoError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Credenciais do navegador repassadas ao Django: o cookie de sessao e,
 * em metodos que alteram estado, o token CSRF enviado pelo cliente.
 */
export function forwardAuthHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  const cookie = request.headers.get("cookie");
  const csrfToken = request.headers.get("x-csrftoken");

  if (cookie) {
    headers.cookie = cookie;
  }

  if (csrfToken) {
    headers["x-csrftoken"] = csrfToken;
  }

  return headers;
}

export function validateAllocationValues(
  values: Partial<AllocationFormValues>,
): AllocationFormValues {
  const parsed = {
    predios: values.predios ?? "",
    salas: values.salas ?? "",
    disciplinas: values.disciplinas ?? "",
  };

  for (const [key, value] of Object.entries(parsed)) {
    if (!CSV_NAME_PATTERN.test(value)) {
      throw new Error(`Arquivo invalido em ${key}.`);
    }
  }

  return parsed;
}

export async function loadCsvOptionsFromDjango(
  authHeaders: Record<string, string> = {},
): Promise<CsvOptionsResponse> {
  try {
    const response = await fetch(`${getDjangoBaseUrl()}/`, {
      headers: authHeaders,
      cache: "no-store",
      signal: AbortSignal.timeout(2_500),
    });

    if (response.status === 401 || response.status === 403) {
      const data = (await response.json()) as { error?: string };
      return {
        ...FALLBACK_CSV_OPTIONS,
        warning: data.error ?? "Acesso negado pelo Django.",
      };
    }

    if (!response.ok) {
      return { ...FALLBACK_CSV_OPTIONS, warning: "Django indisponivel." };
    }

    const data = (await response.json()) as DjangoIndexResponse;
    const options: CsvOption[] = (data.csvs ?? []).map((name) => ({
      label: name,
      value: name,
    }));

    if (options.length === 0) {
      return {
        ...FALLBACK_CSV_OPTIONS,
        warning: "Django respondeu sem lista de CSVs.",
      };
    }

    return {
      defaults: { ...FALLBACK_CSV_OPTIONS.defaults, ...data.defaults },
      options,
      source: "django",
    };
  } catch {
    return {
      ...FALLBACK_CSV_OPTIONS,
      warning: "Django indisponivel. Usando nomes padrao.",
    };
  }
}

export type AllocationPayload = {
  html: string;
  cursos: string[];
  professores: string[];
  conflitos: string[];
};

export async function runAllocationThroughDjango(
  values: AllocationFormValues,
  authHeaders: Record<string, string> = {},
): Promise<AllocationPayload> {
  const response = await fetch(`${getDjangoBaseUrl()}/alocar/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(values),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (response.status === 401 || response.status === 403) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new DjangoError(
      data.error ?? "Sessao expirada ou acesso negado.",
      response.status,
    );
  }

  const data = (await response.json()) as DjangoAlocarResponse;

  if (!response.ok || data.error) {
    throw new Error(data.error ?? "Django recusou a solicitacao.");
  }

  if (!data.html) {
    throw new Error("Django retornou resposta sem HTML.");
  }

  return {
    html: data.html,
    cursos: data.cursos ?? [],
    professores: data.professores ?? [],
    conflitos: data.conflitos ?? [],
  };
}
