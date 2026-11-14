import { describe, expect, test } from "vitest";

import type { AlocacaoItem, SalaInfo } from "@/lib/allocation-client";

import { classificarSala, ordenarOpcoes } from "./sala-cards";

const sala = (codigo: number, capacidade: number): SalaInfo => ({
  codigo,
  nome: String(codigo),
  predio: "CCH",
  capacidade,
});

const ocupante = { id: 9, disciplina: "Z" } as AlocacaoItem;

describe("classificarSala", () => {
  test.each([
    ["livre", sala(1, 40), [], null],
    ["pequena", sala(1, 20), [], null],
    ["ocupada", sala(1, 40), [ocupante], null],
    ["atual", sala(1, 40), [], 1],
  ] as const)("%s", (estado, s, ocupantes, atual) => {
    expect(classificarSala(s, 30, [...ocupantes], atual).estado).toBe(estado);
  });
});

describe("ordenarOpcoes", () => {
  test("livres (menor que serve primeiro), pequenas (maior primeiro), ocupadas, atual", () => {
    const opcoes = [
      classificarSala(sala(1, 60), 30, [ocupante], null),
      classificarSala(sala(2, 20), 30, [], null),
      classificarSala(sala(3, 50), 30, [], null),
      classificarSala(sala(4, 40), 30, [], 4),
      classificarSala(sala(5, 25), 30, [], null),
      classificarSala(sala(6, 35), 30, [], null),
    ];
    expect(ordenarOpcoes(opcoes).map((o) => o.sala.codigo)).toEqual([6, 3, 5, 2, 1, 4]);
  });
});
