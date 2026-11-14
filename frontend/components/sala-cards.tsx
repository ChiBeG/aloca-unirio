"use client";

import { useMemo, useState } from "react";

import type { AlocacaoItem, SalaInfo } from "@/lib/allocation-client";
import { SEM_SALA, rotuloSala } from "@/lib/manual-adjustments";

export type EstadoSala = "livre" | "pequena" | "ocupada" | "atual";

export type OpcaoSala = {
  sala: SalaInfo;
  estado: EstadoSala;
  /** Disciplinas que ocupam a sala no horario (so para "ocupada"). */
  ocupantes: AlocacaoItem[];
};

const ORDEM: Record<EstadoSala, number> = { livre: 0, pequena: 1, ocupada: 2, atual: 3 };

const ROTULO_ESTADO: Record<EstadoSala, string> = {
  livre: "Livre",
  pequena: "Livre, mas pequena",
  ocupada: "Ocupada · exige realocar",
  atual: "Sala atual",
};

/** Classifica uma sala para uma disciplina com `vagas` vagas. */
export function classificarSala(
  sala: SalaInfo,
  vagas: number,
  ocupantes: AlocacaoItem[],
  salaAtual: number | null,
): OpcaoSala {
  const estado: EstadoSala =
    sala.codigo === salaAtual
      ? "atual"
      : ocupantes.length > 0
        ? "ocupada"
        : sala.capacidade < vagas
          ? "pequena"
          : "livre";
  return { sala, estado, ocupantes };
}

/** Livres primeiro (a que sobra menos lugar antes), depois pequenas, ocupadas e a atual. */
export function ordenarOpcoes(opcoes: OpcaoSala[]): OpcaoSala[] {
  return [...opcoes].sort((a, b) => {
    if (a.estado !== b.estado) return ORDEM[a.estado] - ORDEM[b.estado];
    return a.estado === "livre"
      ? a.sala.capacidade - b.sala.capacidade
      : b.sala.capacidade - a.sala.capacidade;
  });
}

type Props = {
  /** Texto do <legend>; tambem e o nome acessivel do grupo. */
  legenda: string;
  /** Nome do grupo de radios (unico no dialogo). */
  nome: string;
  opcoes: OpcaoSala[];
  vagas: number;
  selecionada: number | null;
  onSelect: (codigo: number) => void;
  /** Mostra o cartao "Deixar sem sala" (valor SEM_SALA), usado para deslocadas. */
  semSala?: boolean;
};

export function SalaCards({
  legenda,
  nome,
  opcoes,
  vagas,
  selecionada,
  onSelect,
  semSala = false,
}: Props) {
  const predios = useMemo(
    () => Array.from(new Set(opcoes.map((o) => o.sala.predio))).sort(),
    [opcoes],
  );
  const [predio, setPredio] = useState("todos");

  const visiveis = ordenarOpcoes(
    predio === "todos" ? opcoes : opcoes.filter((o) => o.sala.predio === predio),
  );

  const contagem = (estado: EstadoSala) => opcoes.filter((o) => o.estado === estado).length;

  return (
    <fieldset className="sala-cards">
      <legend>{legenda}</legend>

      <div className="sala-cards-toolbar">
        <p className="sala-cards-summary">
          <span data-estado="livre">{contagem("livre")} livres</span>
          {contagem("pequena") > 0 ? (
            <span data-estado="pequena">{contagem("pequena")} pequenas</span>
          ) : null}
          {contagem("ocupada") > 0 ? (
            <span data-estado="ocupada">{contagem("ocupada")} ocupadas</span>
          ) : null}
        </p>

        {predios.length > 1 ? (
          <div className="sala-cards-filter" role="group" aria-label={`Filtrar ${legenda.toLowerCase()} por predio`}>
            {["todos", ...predios].map((p) => (
              <button
                aria-pressed={predio === p}
                key={p}
                onClick={() => setPredio(p)}
                type="button"
              >
                {p === "todos" ? "Todos" : p}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="sala-cards-grid">
        {visiveis.map(({ sala, estado, ocupantes }) => {
          const falta = vagas - sala.capacidade;
          return (
            <label
              className="sala-card"
              data-estado={estado}
              data-selecionada={selecionada === sala.codigo || undefined}
              key={sala.codigo}
            >
              <input
                checked={selecionada === sala.codigo}
                className="visually-hidden"
                disabled={estado === "atual"}
                name={nome}
                onChange={() => onSelect(sala.codigo)}
                type="radio"
                value={sala.codigo}
              />
              <span className="sala-card-head">
                <strong>{rotuloSala(sala)}</strong>
                <span className="sala-card-badge">{ROTULO_ESTADO[estado]}</span>
              </span>
              <span className="sala-card-capacity">
                {sala.capacidade} lugares
                {falta > 0 && estado !== "atual" ? (
                  <span className="sala-card-warning"> · ⚠ faltam {falta}</span>
                ) : null}
              </span>
              {estado === "ocupada" ? (
                <span
                  className="sala-card-occupants"
                  title={ocupantes.map((o) => o.disciplina).join(", ")}
                >
                  {ocupantes.map((o) => o.disciplina).join(", ")}
                </span>
              ) : null}
            </label>
          );
        })}

        {semSala ? (
          <label
            className="sala-card"
            data-estado="sem-sala"
            data-selecionada={selecionada === SEM_SALA || undefined}
          >
            <input
              checked={selecionada === SEM_SALA}
              className="visually-hidden"
              name={nome}
              onChange={() => onSelect(SEM_SALA)}
              type="radio"
              value={SEM_SALA}
            />
            <span className="sala-card-head">
              <strong>Deixar sem sala</strong>
              <span className="sala-card-badge">Volta para pendentes</span>
            </span>
            <span className="sala-card-capacity">
              Fica na lista de sem sala para resolver depois.
            </span>
          </label>
        ) : null}
      </div>

      {visiveis.length === 0 && !semSala ? (
        <p className="adjustments-empty">Nenhuma sala neste predio.</p>
      ) : null}
    </fieldset>
  );
}
