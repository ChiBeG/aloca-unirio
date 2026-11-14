import { describe, expect, test } from "vitest";

import type { AlocacaoItem, SalaInfo } from "./allocation-client";
import {
  ajusteRapido,
  escolhasDeTroca,
  exportarAjustes,
  importarAjustes,
  montarAjuste,
  ocupantes,
  SEM_SALA,
  salasLivresParaDeslocada,
} from "./manual-adjustments";

function item(
  id: number,
  disciplina: string,
  sala: number | null,
  inicio: number,
  fim: number,
  vagas = 10,
): AlocacaoItem {
  return {
    id,
    disciplina,
    curso: "Curso",
    professor: `Prof ${disciplina}`,
    vagas,
    dia: 2,
    inicio,
    fim,
    sala,
    manual: false,
    violacoes: [],
  };
}

const A = 101;
const B = 102;
const C = 103;

const salas: SalaInfo[] = [
  { codigo: A, nome: "A", predio: "CCH", capacidade: 40 },
  { codigo: B, nome: "B", predio: "CCH", capacidade: 30 },
  { codigo: C, nome: "C", predio: "CCH", capacidade: 20 },
];

// Mesmo cenario dos testes do backend: P e Q em A, R em B, Y sem sala.
const P = item(3, "P", A, 8, 10);
const Q = item(4, "Q", A, 10, 12);
const R = item(5, "R", B, 8, 12);
const Y = item(2, "Y", null, 18, 22, 35);
const alocacoes = [P, Q, R, Y];

describe("ocupantes", () => {
  test("lista quem se sobrepoe ao horario na sala", () => {
    expect(ocupantes(alocacoes, A, R).map((a) => a.disciplina)).toEqual(["P", "Q"]);
  });

  test("horarios encostados nao se sobrepoem", () => {
    expect(ocupantes(alocacoes, A, item(9, "Z", null, 12, 14))).toEqual([]);
  });

  test("ignora a propria disciplina", () => {
    expect(ocupantes(alocacoes, A, P).map((a) => a.disciplina)).toEqual([]);
  });
});

describe("salasLivresParaDeslocada", () => {
  test("a sala liberada pelo alvo conta como livre (troca)", () => {
    const livres = salasLivresParaDeslocada(alocacoes, salas, R, A, P, {}, [P, Q]);
    expect(livres.map((s) => s.codigo)).toEqual([B, C]);
  });

  test("sala ocupada no horario da deslocada nao aparece", () => {
    const outra = item(10, "Outra", C, 9, 10);
    const livres = salasLivresParaDeslocada([...alocacoes, outra], salas, R, A, P, {}, [P, Q]);
    expect(livres.map((s) => s.codigo)).toEqual([B]);
  });
});

describe("montarAjuste", () => {
  test("sala livre gera ajuste sem realocacoes", () => {
    expect(montarAjuste(alocacoes, salas, Y, C, {})).toEqual({
      ajuste: { disciplina: Y.id, sala: C, nome: "Y", realocacoes: [] },
    });
  });

  test("sala ocupada exige escolher destino para cada deslocada", () => {
    expect(montarAjuste(alocacoes, salas, R, A, { [P.id]: B })).toEqual({
      motivo: "Escolha uma sala para 'Q' ou deixe-a sem sala.",
    });
  });

  test("deslocada pode ficar sem sala", () => {
    expect(montarAjuste(alocacoes, salas, R, A, { [P.id]: SEM_SALA, [Q.id]: C })).toEqual({
      ajuste: {
        disciplina: R.id,
        sala: A,
        nome: "R",
        realocacoes: [
          { disciplina: P.id, sala: null },
          { disciplina: Q.id, sala: C },
        ],
      },
    });
  });

  test("monta a troca com as realocacoes", () => {
    expect(montarAjuste(alocacoes, salas, R, A, { [P.id]: B, [Q.id]: C })).toEqual({
      ajuste: {
        disciplina: R.id,
        sala: A,
        nome: "R",
        realocacoes: [
          { disciplina: P.id, sala: B },
          { disciplina: Q.id, sala: C },
        ],
      },
    });
  });

  test("recusa destino ocupado para a deslocada", () => {
    const outra = item(10, "Outra", C, 8, 9);
    const resultado = montarAjuste([...alocacoes, outra], salas, R, A, {
      [P.id]: C,
      [Q.id]: B,
    });
    expect(resultado).toHaveProperty("motivo");
  });

  test("recusa a sala atual", () => {
    expect(montarAjuste(alocacoes, salas, R, B, {})).toHaveProperty("motivo");
  });
});

describe("exportar e importar", () => {
  const values = {
    predios: "p.csv",
    salas: "s.csv",
    disciplinas: "d.csv",
  };
  const ajustes = [
    { disciplina: 2, sala: C, nome: "Y", realocacoes: [{ disciplina: 3, sala: null }] },
  ];

  test("ida e volta preserva os ajustes", () => {
    expect(importarAjustes(exportarAjustes(values, ajustes))).toEqual({
      versao: 1,
      arquivos: values,
      ajustes,
    });
  });

  test.each([
    ["nao e json", "O arquivo nao e um JSON valido."],
    [JSON.stringify({ ajustes: [] }), "O arquivo nao e uma exportacao de ajustes do Aloca."],
    [
      JSON.stringify({ versao: 1, ajustes: [{ disciplina: "2", sala: 1, nome: "x", realocacoes: [] }] }),
      "O arquivo tem ajustes em formato invalido.",
    ],
  ])("rejeita arquivo invalido: %s", (texto, mensagem) => {
    expect(() => importarAjustes(texto)).toThrow(mensagem);
  });
});

describe("escolhasDeTroca", () => {
  test("pre-seleciona a sala de origem quando ela fica livre para a deslocada", () => {
    // R sai de B para A: P e Q (em A) podem ir para B.
    expect(escolhasDeTroca(alocacoes, salas, R, A)).toEqual({ [P.id]: B, [Q.id]: B });
  });

  test("disciplina sem sala nao tem troca", () => {
    expect(escolhasDeTroca(alocacoes, salas, { ...Y, inicio: 8, fim: 10 }, A)).toEqual({});
  });
});

describe("ajusteRapido", () => {
  test("troca quando a sala de origem fica livre", () => {
    expect(ajusteRapido(alocacoes, salas, R, A)?.realocacoes).toEqual([
      { disciplina: P.id, sala: B },
      { disciplina: Q.id, sala: B },
    ]);
  });

  test("sem sala de origem, quem estava la fica sem sala", () => {
    const Z = item(11, "Z", null, 8, 10);
    expect(ajusteRapido(alocacoes, salas, Z, A)?.realocacoes).toEqual([
      { disciplina: P.id, sala: null },
    ]);
  });
});

