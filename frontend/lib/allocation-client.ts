import { getCsrfToken } from "./auth-client";

export type AllocationFormValues = {
  predios: string;
  salas: string;
  disciplinas: string;
};

export type CsvOption = {
  label: string;
  value: string;
};

export type CsvOptionsResponse = {
  defaults: AllocationFormValues;
  options: CsvOption[];
  source: "django" | "fallback";
  warning?: string;
};

/** Leva uma disciplina (linha do CSV) para uma sala (codigo). */
export type Movimento = {
  disciplina: number;
  sala: number;
};

/**
 * Ajuste manual: move uma disciplina e realoca quem ela desloca. Pode violar a
 * capacidade, mas nunca deixa duas disciplinas no mesmo horario da mesma sala.
 */
export type Ajuste = Movimento & {
  /** Nome da disciplina, para detectar que o CSV mudou desde o ajuste. */
  nome: string;
  realocacoes: Realocacao[];
};

/** Para onde vai uma disciplina deslocada; sala null = fica sem sala. */
export type Realocacao = {
  disciplina: number;
  sala: number | null;
};

export type AlocacaoItem = {
  id: number;
  disciplina: string;
  curso: string;
  professor: string;
  vagas: number;
  dia: number;
  inicio: number;
  fim: number;
  sala: number | null;
  manual: boolean;
  violacoes: string[];
};

export type SalaInfo = {
  codigo: number;
  nome: string;
  predio: string;
  capacidade: number;
};

export type AjusteIgnorado = {
  indice: number;
  motivo: string;
};

export type AllocationSuccess = {
  html: string;
  cursos: string[];
  professores: string[];
  conflitos: string[];
  alocacoes: AlocacaoItem[];
  salas: SalaInfo[];
  ajustesIgnorados: AjusteIgnorado[];
};

export type AllocationFailure = {
  error: string;
};

export type AllocationResponse = AllocationSuccess | AllocationFailure;

export const FALLBACK_CSV_OPTIONS: CsvOptionsResponse = {
  defaults: {
    predios: "unirio-predios.csv",
    salas: "unirio-salas.csv",
    disciplinas: "unirio-disciplinas-20252.csv",
  },
  options: [
    { label: "unirio-predios.csv", value: "unirio-predios.csv" },
    { label: "unirio-salas.csv", value: "unirio-salas.csv" },
    {
      label: "unirio-disciplinas-20252.csv",
      value: "unirio-disciplinas-20252.csv",
    },
  ],
  source: "fallback",
};

export async function fetchCsvOptions(): Promise<CsvOptionsResponse> {
  try {
    const response = await fetch("/api/csv-options", {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ...FALLBACK_CSV_OPTIONS,
        warning: "Django indisponivel. Usando nomes padrao.",
      };
    }

    return (await response.json()) as CsvOptionsResponse;
  } catch {
    return {
      ...FALLBACK_CSV_OPTIONS,
      warning: "Django indisponivel. Usando nomes padrao.",
    };
  }
}

export async function requestAllocation(
  values: AllocationFormValues,
  ajustes: Ajuste[] = [],
): Promise<AllocationResponse> {
  const response = await fetch("/api/alocar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCsrfToken(),
    },
    body: JSON.stringify({ ...values, ajustes }),
  });

  const payload = (await response.json()) as Partial<AllocationSuccess> &
    Partial<AllocationFailure>;

  if (!response.ok || payload.error) {
    return { error: payload.error ?? "Falha ao solicitar alocacao." };
  }

  return {
    html: payload.html ?? "",
    cursos: payload.cursos ?? [],
    professores: payload.professores ?? [],
    conflitos: payload.conflitos ?? [],
    alocacoes: payload.alocacoes ?? [],
    salas: payload.salas ?? [],
    ajustesIgnorados: payload.ajustesIgnorados ?? [],
  };
}
