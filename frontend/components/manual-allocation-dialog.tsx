"use client";

import { AlertTriangle, ArrowRightLeft, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { SalaCards, classificarSala } from "@/components/sala-cards";
import type { Ajuste, AlocacaoItem, SalaInfo } from "@/lib/allocation-client";
import {
  SEM_SALA,
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

export function ManualAllocationDialog({
  alvo,
  alocacoes,
  salas,
  onCancel,
  onConfirm,
}: Props) {
  const tituloId = useId();
  const corpo = useRef<HTMLFormElement>(null);
  const [salaDestino, setSalaDestino] = useState<number | null>(null);
  const [escolhas, setEscolhas] = useState<Record<number, number | undefined>>({});

  const salaPorCodigo = useMemo(
    () => new Map(salas.map((s) => [s.codigo, s])),
    [salas],
  );

  useEffect(() => {
    corpo.current?.querySelector<HTMLInputElement>("input[type=radio]:not(:disabled)")?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const opcoesDestino = useMemo(
    () =>
      salas.map((sala) =>
        classificarSala(sala, alvo.vagas, ocupantes(alocacoes, sala.codigo, alvo), alvo.sala),
      ),
    [alocacoes, alvo, salas],
  );

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

  const semSala = deslocadas.filter((d) => escolhas[d.id] === SEM_SALA);

  function escolherDestino(codigo: number) {
    setSalaDestino(codigo);
    setEscolhas({});
  }

  function confirmar(event: { preventDefault(): void }) {
    event.preventDefault();
    if ("ajuste" in resultado) onConfirm(resultado.ajuste);
  }

  // Portal no <body>: o conteudo da pagina tem stacking context proprio, abaixo da navbar.
  return createPortal(
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        aria-labelledby={tituloId}
        aria-modal="true"
        className="manual-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <form onSubmit={confirmar} ref={corpo}>
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

          <SalaCards
            legenda="Sala de destino"
            nome={`destino-${alvo.id}`}
            onSelect={escolherDestino}
            opcoes={opcoesDestino}
            selecionada={salaDestino}
            vagas={alvo.vagas}
          />

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
                Escolha para onde vai cada uma (so aparecem salas livres no
                horario dela) ou deixe-a sem sala.
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
                      <p className="manual-dialog-hint">
                        Nao ha sala livre para &apos;{d.disciplina}&apos; em{" "}
                        {descreverHorario(d)}. A unica opcao e deixa-la sem sala.
                      </p>
                    ) : null}
                    <SalaCards
                      legenda={`${d.disciplina} (${d.curso}) · ${descreverHorario(d)} · ${d.vagas} vagas`}
                      nome={`deslocada-${d.id}`}
                      onSelect={(codigo) =>
                        setEscolhas((atual) => ({ ...atual, [d.id]: codigo }))
                      }
                      opcoes={livres.map((sala) => classificarSala(sala, d.vagas, [], null))}
                      selecionada={escolhas[d.id] ?? null}
                      semSala
                      vagas={d.vagas}
                    />
                  </div>
                );
              })}
            </section>
          ) : null}

          {semSala.length > 0 ? (
            <div className="inline-alert" role="status">
              <AlertTriangle aria-hidden="true" size={18} />
              <div>
                <strong>Ficarao sem sala (voltam para pendentes)</strong>
                <ul className="manual-dialog-violations">
                  {semSala.map((d) => (
                    <li key={d.id}>
                      &apos;{d.disciplina}&apos; · {descreverHorario(d)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
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
    </div>,
    document.body,
  );
}
