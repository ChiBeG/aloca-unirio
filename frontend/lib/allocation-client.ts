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

export type AllocationSuccess = {
  html: string;
  cursos: string[];
  professores: string[];
  conflitos: string[];
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
): Promise<AllocationResponse> {
  const response = await fetch("/api/alocar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  });

  const payload = (await response.json()) as AllocationResponse;

  if (!response.ok && !("error" in payload)) {
    return { error: "Falha ao solicitar alocacao." };
  }

  return payload;
}
