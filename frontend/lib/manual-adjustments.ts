/**
 * Regras e persistencia dos ajustes manuais, sem React.
 *
 * Um ajuste manual pode deixar uma disciplina em sala menor que as vagas
 * (fica marcado), mas nunca deixa duas disciplinas no mesmo horario da mesma
 * sala: quem ocupava a sala de destino precisa ir para outra sala livre, e o
 * usuario escolhe qual. O backend revalida tudo.
 */
import type {
  Ajuste,
  AlocacaoItem,
  AllocationFormValues,
  Movimento,
  Realocacao,
  SalaInfo,
} from "./allocation-client";

/**
 * Escolha "deixar sem sala" para uma disciplina deslocada. Codigos de sala sao
 * positivos, entao -1 nunca colide; vira `sala: null` no ajuste.
 */
export const SEM_SALA = -1;

function destinoDaEscolha(escolha: number | undefined): number | null {
  return escolha == null || escolha === SEM_SALA ? null : escolha;
}

export const DIAS: Record<number, string> = {
  2: "Segunda",
  3: "Terca",
  4: "Quarta",
  5: "Quinta",
  6: "Sexta",
  7: "Sabado",
};

export function descreverHorario(item: Pick<AlocacaoItem, "dia" | "inicio" | "fim">) {
  return `${DIAS[item.dia] ?? item.dia}, ${item.inicio}h–${item.fim}h`;
}

export function rotuloSala(sala: SalaInfo | undefined, codigo?: number | null) {
  if (sala) return `${sala.predio}-${sala.nome}`;
  return codigo == null ? "sem sala" : `sala ${codigo}`;
}

export function sobrepoe(
  a: Pick<AlocacaoItem, "dia" | "inicio" | "fim">,
  b: Pick<AlocacaoItem, "dia" | "inicio" | "fim">,
) {
  return a.dia === b.dia && a.inicio < b.fim && b.inicio < a.fim;
}

/** Disciplinas que ocupam a sala em algum horario da disciplina alvo. */
export function ocupantes(
  alocacoes: AlocacaoItem[],
  sala: number,
  alvo: AlocacaoItem,
): AlocacaoItem[] {
  return alocacoes.filter(
    (a) => a.sala === sala && a.id !== alvo.id && sobrepoe(a, alvo),
  );
}

/** Estado das alocacoes depois de aplicar os movimentos (sem validar). */
export function simular(
  alocacoes: AlocacaoItem[],
  movimentos: Array<{ disciplina: number; sala: number | null }>,
): AlocacaoItem[] {
  const destino = new Map(movimentos.map((m) => [m.disciplina, m.sala]));
  return alocacoes.map((a) =>
    destino.has(a.id) ? { ...a, sala: destino.get(a.id) ?? null } : a,
  );
}

/**
 * Salas livres para uma disciplina deslocada, considerando a operacao em
 * andamento: o alvo ja esta na sala de destino e as outras deslocadas estao
 * nas salas escolhidas para elas (ou sem sala, se ainda nao escolhidas).
 */
export function salasLivresParaDeslocada(
  alocacoes: AlocacaoItem[],
  salas: SalaInfo[],
  alvo: AlocacaoItem,
  salaDestino: number,
  deslocada: AlocacaoItem,
  escolhas: Record<number, number | undefined>,
  deslocadas: AlocacaoItem[],
): SalaInfo[] {
  const estado = simular(alocacoes, [
    { disciplina: alvo.id, sala: salaDestino },
    ...deslocadas
      .filter((d) => d.id !== deslocada.id)
      .map((d) => ({ disciplina: d.id, sala: destinoDaEscolha(escolhas[d.id]) })),
    { disciplina: deslocada.id, sala: null },
  ]);

  return salas.filter((s) => ocupantes(estado, s.codigo, deslocada).length === 0);
}

/**
 * Escolhas iniciais ao soltar o alvo numa sala ocupada: cada deslocada vai para
 * a sala de onde o alvo saiu (troca), se ela estiver livre no horario dela.
 */
export function escolhasDeTroca(
  alocacoes: AlocacaoItem[],
  salas: SalaInfo[],
  alvo: AlocacaoItem,
  salaDestino: number,
): Record<number, number | undefined> {
  const escolhas: Record<number, number | undefined> = {};
  if (alvo.sala == null) return escolhas;

  const deslocadas = ocupantes(alocacoes, salaDestino, alvo);
  for (const d of deslocadas) {
    const livres = salasLivresParaDeslocada(
      alocacoes,
      salas,
      alvo,
      salaDestino,
      d,
      escolhas,
      deslocadas,
    );
    if (livres.some((s) => s.codigo === alvo.sala)) escolhas[d.id] = alvo.sala;
  }
  return escolhas;
}

/** Monta o ajuste se a operacao for valida; senao devolve o motivo. */
export function montarAjuste(
  alocacoes: AlocacaoItem[],
  salas: SalaInfo[],
  alvo: AlocacaoItem,
  salaDestino: number | null,
  escolhas: Record<number, number | undefined>,
): { ajuste: Ajuste } | { motivo: string } {
  if (salaDestino == null) return { motivo: "Escolha a sala de destino." };
  if (salaDestino === alvo.sala) {
    return { motivo: "A disciplina ja esta nessa sala." };
  }

  const deslocadas = ocupantes(alocacoes, salaDestino, alvo);
  const realocacoes: Realocacao[] = [];

  for (const d of deslocadas) {
    const escolhida = escolhas[d.id];
    if (escolhida == null) {
      return { motivo: `Escolha uma sala para '${d.disciplina}' ou deixe-a sem sala.` };
    }
    if (escolhida === SEM_SALA) {
      realocacoes.push({ disciplina: d.id, sala: null });
      continue;
    }

    const livres = salasLivresParaDeslocada(
      alocacoes,
      salas,
      alvo,
      salaDestino,
      d,
      escolhas,
      deslocadas,
    );
    if (!livres.some((s) => s.codigo === escolhida)) {
      return {
        motivo: `A sala escolhida para '${d.disciplina}' nao esta livre no horario dela.`,
      };
    }

    realocacoes.push({ disciplina: d.id, sala: escolhida });
  }

  return {
    ajuste: {
      disciplina: alvo.id,
      sala: salaDestino,
      nome: alvo.disciplina,
      realocacoes,
    },
  };
}

// ---------------------------------------------------------------------------
// Persistencia no navegador e exportacao/importacao
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = "aloca:ajustes:";

export function storageKey(values: AllocationFormValues) {
  return `${STORAGE_PREFIX}${values.predios}|${values.salas}|${values.disciplinas}`;
}

function isMovimento(value: unknown): value is Movimento {
  if (typeof value !== "object" || value === null) return false;
  const { disciplina, sala } = value as Record<string, unknown>;
  return Number.isInteger(disciplina) && Number.isInteger(sala);
}

function isRealocacao(value: unknown): value is Realocacao {
  if (typeof value !== "object" || value === null) return false;
  const { disciplina, sala } = value as Record<string, unknown>;
  return Number.isInteger(disciplina) && (sala === null || Number.isInteger(sala));
}

export function isAjuste(value: unknown): value is Ajuste {
  if (!isMovimento(value)) return false;
  const { nome, realocacoes } = value as unknown as Record<string, unknown>;
  return (
    typeof nome === "string" &&
    Array.isArray(realocacoes) &&
    realocacoes.every(isRealocacao)
  );
}

export function carregarAjustes(values: AllocationFormValues): Ajuste[] {
  try {
    const bruto = window.localStorage.getItem(storageKey(values));
    if (!bruto) return [];
    const lista: unknown = JSON.parse(bruto);
    return Array.isArray(lista) ? lista.filter(isAjuste) : [];
  } catch {
    return [];
  }
}

export function salvarAjustes(values: AllocationFormValues, ajustes: Ajuste[]) {
  try {
    const chave = storageKey(values);
    if (ajustes.length === 0) {
      window.localStorage.removeItem(chave);
    } else {
      window.localStorage.setItem(chave, JSON.stringify(ajustes));
    }
  } catch {
    // Sem localStorage (aba privada, bloqueio): os ajustes valem so nesta sessao.
  }
}

export type ArquivoAjustes = {
  versao: 1;
  arquivos: AllocationFormValues;
  ajustes: Ajuste[];
};

export function exportarAjustes(
  values: AllocationFormValues,
  ajustes: Ajuste[],
): string {
  const arquivo: ArquivoAjustes = { versao: 1, arquivos: values, ajustes };
  return JSON.stringify(arquivo, null, 2);
}

/** Le um arquivo exportado. Lanca Error com mensagem legivel se for invalido. */
export function importarAjustes(texto: string): ArquivoAjustes {
  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error("O arquivo nao e um JSON valido.");
  }

  const { versao, arquivos, ajustes } = (dados ?? {}) as Record<string, unknown>;
  if (versao !== 1 || !Array.isArray(ajustes)) {
    throw new Error("O arquivo nao e uma exportacao de ajustes do Aloca.");
  }
  if (!ajustes.every(isAjuste)) {
    throw new Error("O arquivo tem ajustes em formato invalido.");
  }

  const a = (arquivos ?? {}) as Partial<AllocationFormValues>;
  return {
    versao: 1,
    arquivos: {
      predios: String(a.predios ?? ""),
      salas: String(a.salas ?? ""),
      disciplinas: String(a.disciplinas ?? ""),
    },
    ajustes,
  };
}
