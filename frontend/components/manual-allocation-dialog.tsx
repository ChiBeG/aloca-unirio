"use client";

import { AlertTriangle, ArrowRightLeft, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { Ajuste, AlocacaoItem, SalaInfo } from "@/lib/allocation-client";
import {
  descreverHorario,
  montarAjuste,
  ocupantes,
  rotuloSala,
  salasLivresParaDeslocada,
} from "@/lib/manual-adjustments";

type Props = {
  alvo: AlocacaoItem;
  alocacoes: AlocacaoItem[];
  salas: SalaInfo[];
  onCancel: () => void;
  onConfirm: (ajuste: Ajuste) => void;
};

function porPredio(salas: SalaInfo[]) {
  const grupos = new Map<string, SalaInfo[]>();
  for (const sala of salas) {
    grupos.set(sala.predio, [...(grupos.get(sala.predio) ?? []), sala]);
  }
  return Array.from(grupos.entries());
}

function avisoCapacidade(sala: SalaInfo | undefined, vagas: number) {
  return sala && sala.capacidade < vagas
    ? ` · ⚠ ${sala.capacidade} lugares para ${vagas} vagas`
    : "";
}

export function ManualAllocationDialog({
  alvo,
  alocacoes,
  salas,
  onCancel,
  onConfirm,
}: Props) {
  const tituloId = useId();
  const primeiroCampo = useRef<HTMLSelectElement>(null);
  const [salaDestino, setSalaDestino] = useState<number | null>(null);
  const [escolhas, setEscolhas] = useState<Record<number, number | undefined>>({});

  const salaPorCodigo = useMemo(
    () => new Map(salas.map((s) => [s.codigo, s])),
    [salas],
  );

  useEffect(() => {
    primeiroCampo.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const deslocadas = useMemo(
    () => (salaDestino == null ? [] : ocupantes(alocacoes, salaDestino, alvo)),
    [alocacoes, alvo, salaDestino],
  );

  const resultado = montarAjuste(alocacoes, salas, alvo, salaDestino, escolhas);

  const violacoes = [
    { item: alvo, sala: salaDestino },
    ...deslocadas.map((d) => ({ item: d, sala: escolhas[d.id] ?? null })),
  ].flatMap(({ item, sala }) => {
    const info = sala == null ? undefined : salaPorCodigo.get(sala);
    return info && info.capacidade < item.vagas
      ? [`'${item.disciplina}' em ${rotuloSala(info)}: ${info.capacidade} lugares para ${item.vagas} vagas.`]
      : [];
  });

  function escolherDestino(valor: string) {
    setSalaDestino(valor ? Number(valor) : null);
    setEscolhas({});
  }

  function confirmar(event: { preventDefault(): void }) {
    event.preventDefault();
    if ("ajuste" in resultado) onConfirm(resultado.ajuste);
  }

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        aria-labelledby={tituloId}
        aria-modal="true"
        className="manual-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <form onSubmit={confirmar}>
          <header className="manual-dialog-header">
            <div>
              <p className="eyebrow">Alocacao manual</p>
              <h2 id={tituloId}>{alvo.disciplina}</h2>
            </div>
            <button
              aria-label="Fechar"
              className="icon-action"
              onClick={onCancel}
              type="button"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </header>

          <dl className="manual-dialog-facts">
            <div>
              <dt>Curso</dt>
              <dd>{alvo.curso}</dd>
            </div>
            <div>
              <dt>Professor</dt>
              <dd>{alvo.professor || "—"}</dd>
            </div>
            <div>
              <dt>Horario</dt>
              <dd>{descreverHorario(alvo)}</dd>
            </div>
            <div>
              <dt>Vagas</dt>
              <dd>{alvo.vagas}</dd>
            </div>
            <div>
              <dt>Sala atual</dt>
              <dd>{rotuloSala(salaPorCodigo.get(alvo.sala ?? -1), alvo.sala)}</dd>
            </div>
          </dl>

          <label className="field">
            <span>Sala de destino</span>
            <select
              onChange={(event) => escolherDestino(event.target.value)}
              ref={primeiroCampo}
              value={salaDestino ?? ""}
            >
              <option value="">Escolha uma sala</option>
              {porPredio(salas).map(([predio, lista]) => (
                <optgroup key={predio} label={predio}>
                  {lista.map((sala) => {
                    const ocupada = ocupantes(alocacoes, sala.codigo, alvo);
                    const atual = sala.codigo === alvo.sala;
                    return (
                      <option disabled={atual} key={sala.codigo} value={sala.codigo}>
                        {rotuloSala(sala)} · {sala.capacidade} lugares
                        {avisoCapacidade(sala, alvo.vagas)}
                        {atual
                          ? " · sala atual"
                          : ocupada.length > 0
                            ? ` · ocupada por ${ocupada.map((o) => o.disciplina).join(", ")}`
                            : " · livre"}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
          </label>

          {deslocadas.length > 0 ? (
            <section className="manual-dialog-section" aria-label="Disciplinas deslocadas">
              <div className="manual-dialog-section-title">
                <ArrowRightLeft aria-hidden="true" size={16} />
                <strong>
                  {deslocadas.length === 1
                    ? "1 disciplina precisa sair desta sala"
                    : `${deslocadas.length} disciplinas precisam sair desta sala`}
                </strong>
              </div>
              <p className="manual-dialog-hint">
                Duas disciplinas nao podem ocupar a mesma sala no mesmo horario.
                Escolha para onde vai cada uma. So aparecem salas livres no
                horario dela.
              </p>

              {deslocadas.map((d) => {
                const livres = salasLivresParaDeslocada(
                  alocacoes,
                  salas,
                  alvo,
                  salaDestino as number,
                  d,
                  escolhas,
                  deslocadas,
                );
                return (
                  <div className="manual-dialog-displaced" key={d.id}>
                    {livres.length === 0 ? (
                      <div className="inline-alert" role="alert">
                        <AlertTriangle aria-hidden="true" size={18} />
                        <span>
                          Nao ha sala livre para &apos;{d.disciplina}&apos; em{" "}
                          {descreverHorario(d)}. Escolha outra sala de destino.
                        </span>
                      </div>
                    ) : (
                      <label className="field">
                        <span>
                          {d.disciplina} ({d.curso}) · {descreverHorario(d)} ·{" "}
                          {d.vagas} vagas
                        </span>
                        <select
                          onChange={(event) =>
                            setEscolhas((atual) => ({
                              ...atual,
                              [d.id]: event.target.value
                                ? Number(event.target.value)
                                : undefined,
                            }))
                          }
                          value={escolhas[d.id] ?? ""}
                        >
                          <option value="">Escolha a nova sala</option>
                          {porPredio(livres).map(([predio, lista]) => (
                            <optgroup key={predio} label={predio}>
                              {lista.map((sala) => (
                                <option key={sala.codigo} value={sala.codigo}>
                                  {rotuloSala(sala)} · {sala.capacidade} lugares
                                  {avisoCapacidade(sala, d.vagas)}
                                  {sala.codigo === alvo.sala ? " · troca" : ""}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                );
              })}
            </section>
          ) : null}

          {violacoes.length > 0 ? (
            <div className="inline-alert" role="status">
              <AlertTriangle aria-hidden="true" size={18} />
              <div>
                <strong>Capacidade insuficiente (sera marcada na grade)</strong>
                <ul className="manual-dialog-violations">
                  {violacoes.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          <footer className="manual-dialog-actions">
            {"motivo" in resultado && salaDestino != null ? (
              <span className="manual-dialog-reason">{resultado.motivo}</span>
            ) : null}
            <button className="ghost-action" onClick={onCancel} type="button">
              Cancelar
            </button>
            <button
              className="primary-action"
              disabled={!("ajuste" in resultado)}
              type="submit"
            >
              Confirmar ajuste
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
