import type {
  Ajuste,
  AjusteIgnorado,
  AlocacaoItem,
  AllocationFormValues,
  CsvOption,
  CsvOptionsResponse,
  Movimento,
  SalaInfo,
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
  alocacoes?: AlocacaoItem[];
  salas?: SalaInfo[];
  ajustes_ignorados?: AjusteIgnorado[];
  error?: string;
};

const MAX_AJUSTES = 1000;

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

/** Entrada recebida do navegador em formato invalido (responde 400). */
export class InvalidRequestError extends Error {}

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
      throw new InvalidRequestError(`Arquivo invalido em ${key}.`);
    }
  }

  return parsed;
}

function parseMovimento(value: unknown): Movimento | null {
  if (typeof value !== "object" || value === null) return null;
  const { disciplina, sala } = value as Record<string, unknown>;
  if (!Number.isInteger(disciplina) || !Number.isInteger(sala)) return null;
  return { disciplina: disciplina as number, sala: sala as number };
}

/** Valida a lista de ajustes manuais antes de repassar ao Django. */
export function validateAjustes(value: unknown): Ajuste[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_AJUSTES) {
    throw new InvalidRequestError("Lista de ajustes manuais invalida.");
  }

  return value.map((item) => {
    const movimento = parseMovimento(item);
    const { nome, realocacoes } = (item ?? {}) as Record<string, unknown>;
    const parsedRealocacoes = Array.isArray(realocacoes)
      ? realocacoes.map(parseMovimento)
      : realocacoes === undefined
        ? []
        : [null];

    if (
      !movimento ||
      typeof nome !== "string" ||
      parsedRealocacoes.some((r) => r === null)
    ) {
      throw new InvalidRequestError("Ajuste manual em formato invalido.");
    }

    return {
      ...movimento,
      nome,
      realocacoes: parsedRealocacoes as Movimento[],
    };
  });
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
  alocacoes: AlocacaoItem[];
  salas: SalaInfo[];
  ajustesIgnorados: AjusteIgnorado[];
};

export async function runAllocationThroughDjango(
  values: AllocationFormValues,
  authHeaders: Record<string, string> = {},
  ajustes: Ajuste[] = [],
): Promise<AllocationPayload> {
  const response = await fetch(`${getDjangoBaseUrl()}/alocar/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ ...values, ajustes }),
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
    alocacoes: data.alocacoes ?? [],
    salas: data.salas ?? [],
    ajustesIgnorados: data.ajustes_ignorados ?? [],
  };
}
