import type {
  AllocationFormValues,
  CsvOption,
  CsvOptionsResponse,
} from "./allocation-client";
import { FALLBACK_CSV_OPTIONS } from "./allocation-client";

const DEFAULT_DJANGO_BASE_URL = "http://127.0.0.1:8000";
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

export async function loadCsvOptionsFromDjango(): Promise<CsvOptionsResponse> {
  try {
    const response = await fetch(`${getDjangoBaseUrl()}/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2_500),
    });

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
): Promise<AllocationPayload> {
  const response = await fetch(`${getDjangoBaseUrl()}/alocar/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

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
