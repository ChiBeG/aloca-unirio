"use client";

import { MousePointerClick, X } from "lucide-react";
import {
  type CSSProperties,
  type DragEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { classificarSala } from "@/components/sala-cards";
import type { AlocacaoItem, SalaInfo } from "@/lib/allocation-client";
import { DIAS, descreverHorario, ocupantes, rotuloSala } from "@/lib/manual-adjustments";

/**
 * Grade interativa: um dia por vez, uma linha por sala, disciplinas como blocos
 * posicionados pelo horario. Dia e horario sao fixos; mover um bloco para outra
 * linha troca a sala. Funciona arrastando ou clicando no bloco e depois na sala.
 */

export const TURNOS = {
  todos: { rotulo: "Dia todo", inicio: 7, fim: 22 },
  manha: { rotulo: "Manha", inicio: 7, fim: 12 },
  tarde: { rotulo: "Tarde", inicio: 12, fim: 18 },
  noite: { rotulo: "Noite", inicio: 18, fim: 22 },
} as const;

export type Turno = keyof typeof TURNOS;

const DIAS_UTEIS = [2, 3, 4, 5, 6];

/** Posicao horizontal (em %) de um intervalo dentro da janela visivel; null se fora. */
export function posicao(inicio: number, fim: number, janelaInicio: number, janelaFim: number) {
  const a = Math.max(inicio, janelaInicio);
  const b = Math.min(fim, janelaFim);
  if (b <= a) return null;
  const total = janelaFim - janelaInicio;
  return { left: ((a - janelaInicio) / total) * 100, width: ((b - a) / total) * 100 };
}

export type Filtros = { predio: string; curso: string; professor: string };

type Props = {
  alocacoes: AlocacaoItem[];
  salas: SalaInfo[];
  podeAjustar: boolean;
  ocupado: boolean;
  filtros: Filtros;
  onMover: (item: AlocacaoItem, sala: number) => void;
  onDetalhes: (item: AlocacaoItem) => void;
};

function diaComMaisPendentes(alocacoes: AlocacaoItem[]) {
  let melhor = DIAS_UTEIS[0];
  let maximo = -1;
  for (const dia of DIAS_UTEIS) {
    const n = alocacoes.filter((a) => a.sala === null && a.dia === dia).length;
    if (n > maximo) {
      melhor = dia;
      maximo = n;
    }
  }
  return melhor;
}

function resumo(item: AlocacaoItem, salas: Map<number, SalaInfo>) {
  const sala = item.sala == null ? "sem sala" : rotuloSala(salas.get(item.sala), item.sala);
  return `${item.disciplina} · ${item.curso} · ${item.professor || "sem professor"} · ${descreverHorario(item)} · ${item.vagas} vagas · ${sala}`;
}

export function AllocationTimeline({
  alocacoes,
  salas,
  podeAjustar,
  ocupado,
  filtros,
  onMover,
  onDetalhes,
}: Props) {
  const [dia, setDia] = useState(() => diaComMaisPendentes(alocacoes));
  const [turno, setTurno] = useState<Turno>("todos");
  const [selecionada, setSelecionada] = useState<AlocacaoItem | null>(null);
  const [arrastando, setArrastando] = useState<AlocacaoItem | null>(null);
  const [alvoDrop, setAlvoDrop] = useState<number | null>(null);

  const interativo = podeAjustar && !ocupado;
  const janela = TURNOS[turno];
  const ativa = arrastando ?? selecionada;

  // Depois de cada rodada os itens mudam: descarta a selecao antiga.
  useEffect(() => setSelecionada(null), [alocacoes]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setSelecionada(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const salaPorCodigo = useMemo(() => new Map(salas.map((s) => [s.codigo, s])), [salas]);
  const porId = useMemo(() => new Map(alocacoes.map((a) => [a.id, a])), [alocacoes]);

  const linhas = useMemo(
    () =>
      salas
        .filter((s) => filtros.predio === "todos" || s.predio === filtros.predio)
        .sort((a, b) => a.predio.localeCompare(b.predio) || a.nome.localeCompare(b.nome)),
    [salas, filtros.predio],
  );

  const doDia = useMemo(() => alocacoes.filter((a) => a.dia === dia), [alocacoes, dia]);

  const pendentesDoDia = useMemo(
    () =>
      doDia
        .filter((a) => a.sala === null && posicao(a.inicio, a.fim, janela.inicio, janela.fim))
        .sort((a, b) => a.inicio - b.inicio || b.vagas - a.vagas),
    [doDia, janela],
  );

  const pendentesPorDia = useMemo(() => {
    const contagem: Record<number, number> = {};
    for (const a of alocacoes) if (a.sala === null) contagem[a.dia] = (contagem[a.dia] ?? 0) + 1;
    return contagem;
  }, [alocacoes]);

  const horas = Array.from({ length: janela.fim - janela.inicio }, (_, i) => janela.inicio + i);

  function esmaecido(item: AlocacaoItem) {
    return (
      (filtros.curso !== "" && item.curso !== filtros.curso) ||
      (filtros.professor !== "" && item.professor !== filtros.professor)
    );
  }

  function soltar(item: AlocacaoItem | undefined, sala: number) {
    setArrastando(null);
    setAlvoDrop(null);
    setSelecionada(null);
    if (!item || item.sala === sala) return;
    onMover(item, sala);
  }

  function propsArrastavel(item: AlocacaoItem) {
    if (!interativo) return {};
    return {
      draggable: true,
      onDragStart: (event: DragEvent) => {
        event.dataTransfer.setData("text/plain", String(item.id));
        event.dataTransfer.effectAllowed = "move";
        setArrastando(item);
      },
      onDragEnd: () => {
        setArrastando(null);
        setAlvoDrop(null);
      },
      onClick: (event: MouseEvent) => {
        event.stopPropagation();
        // Com outra disciplina selecionada, clicar num bloco de outra sala move para ela
        // (salas lotadas nao tem espaco vazio para clicar).
        if (selecionada && selecionada.id !== item.id && item.sala != null && item.sala !== selecionada.sala) {
          soltar(selecionada, item.sala);
          return;
        }
        setSelecionada((atual) => (atual?.id === item.id ? null : item));
      },
      onDoubleClick: (event: MouseEvent) => {
        event.stopPropagation();
        setSelecionada(null);
        onDetalhes(item);
      },
    };
  }

  function propsLinha(sala: SalaInfo) {
    if (!interativo) return {};
    return {
      onDragOver: (event: DragEvent) => {
        if (!arrastando || arrastando.sala === sala.codigo) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setAlvoDrop(sala.codigo);
      },
      onDragLeave: () => setAlvoDrop((atual) => (atual === sala.codigo ? null : atual)),
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        const id = Number(event.dataTransfer.getData("text/plain"));
        soltar(porId.get(id) ?? arrastando ?? undefined, sala.codigo);
      },
      onClick: () => {
        if (selecionada) soltar(selecionada, sala.codigo);
      },
    };
  }

  return (
    <div className="timeline" data-ocupado={ocupado || undefined}>
      <div className="timeline-controls">
        <div className="timeline-days" role="group" aria-label="Dia da semana">
          {DIAS_UTEIS.map((d) => (
            <button aria-pressed={dia === d} key={d} onClick={() => setDia(d)} type="button">
              {DIAS[d]}
              {pendentesPorDia[d] ? (
                <span className="timeline-day-count" title="disciplinas sem sala">
                  {pendentesPorDia[d]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="timeline-days" role="group" aria-label="Turno">
          {(Object.keys(TURNOS) as Turno[]).map((t) => (
            <button aria-pressed={turno === t} key={t} onClick={() => setTurno(t)} type="button">
              {TURNOS[t].rotulo}
            </button>
          ))}
        </div>
      </div>

      {interativo ? (
        selecionada ? (
          <div className="timeline-hint" data-ativa>
            <MousePointerClick aria-hidden="true" size={16} />
            <span>
              <strong>{selecionada.disciplina}</strong> ({descreverHorario(selecionada)},{" "}
              {selecionada.vagas} vagas) selecionada. Clique numa sala para mover.
            </span>
            <button className="row-action" onClick={() => onDetalhes(selecionada)} type="button">
              Mais opcoes
            </button>
            <button
              aria-label="Cancelar selecao"
              className="icon-action"
              onClick={() => setSelecionada(null)}
              type="button"
            >
              <X aria-hidden="true" size={14} />
            </button>
          </div>
        ) : (
          <p className="timeline-hint">
            Arraste um bloco para outra sala, ou clique no bloco e depois na sala. Clique
            duas vezes para ver todas as opcoes.
          </p>
        )
      ) : null}

      <div className="timeline-body">
        <div className="timeline-scroll">
          <div className="timeline-grid" style={{ "--horas": horas.length } as CSSProperties}>
            <div className="timeline-corner">Sala</div>
            <div className="timeline-hours">
              {horas.map((h) => (
                <span key={h}>{h}h</span>
              ))}
            </div>

            {linhas.map((sala) => {
              const blocos = doDia.filter((a) => a.sala === sala.codigo);
              const banda =
                ativa && ativa.dia === dia ? posicao(ativa.inicio, ativa.fim, janela.inicio, janela.fim) : null;
              const estado =
                banda && ativa
                  ? classificarSala(sala, ativa.vagas, ocupantes(alocacoes, sala.codigo, ativa), ativa.sala)
                      .estado
                  : null;
              return (
                <div className="timeline-row" data-drop={alvoDrop === sala.codigo || undefined} key={sala.codigo}>
                  <div className="timeline-room">
                    <strong>{rotuloSala(sala)}</strong>
                    <span>{sala.capacidade} lugares</span>
                  </div>
                  <div
                    className="timeline-track"
                    data-sala={sala.codigo}
                    data-alvo={(interativo && selecionada && selecionada.sala !== sala.codigo) || undefined}
                    {...propsLinha(sala)}
                  >
                    {banda && estado ? (
                      <div
                        className="timeline-band"
                        data-estado={estado}
                        style={{ left: `${banda.left}%`, width: `${banda.width}%` }}
                      />
                    ) : null}
                    {blocos.map((item) => {
                      const pos = posicao(item.inicio, item.fim, janela.inicio, janela.fim);
                      if (!pos) return null;
                      return (
                        <div
                          className="timeline-block"
                          data-dim={esmaecido(item) || undefined}
                          data-manual={item.manual || undefined}
                          data-selecionada={selecionada?.id === item.id || undefined}
                          data-violacao={item.violacoes.length > 0 || undefined}
                          key={item.id}
                          style={{ left: `${pos.left}%`, width: `${pos.width}%` }}
                          title={resumo(item, salaPorCodigo)}
                          {...propsArrastavel(item)}
                        >
                          <span className="timeline-block-name">{item.disciplina}</span>
                          <span className="timeline-block-meta">
                            {item.inicio}–{item.fim}h · {item.vagas} vagas
                            {item.violacoes.length > 0 ? " · ⚠" : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="timeline-tray" aria-label="Disciplinas sem sala no dia">
          <strong>
            Sem sala · {DIAS[dia]} ({pendentesDoDia.length})
          </strong>
          {pendentesDoDia.length === 0 ? (
            <p className="adjustments-empty">Nenhuma disciplina sem sala neste dia e turno.</p>
          ) : (
            <ul>
              {pendentesDoDia.map((item) => (
                <li key={item.id}>
                  <div
                    className="timeline-chip"
                    data-dim={esmaecido(item) || undefined}
                    data-manual={item.manual || undefined}
                    data-selecionada={selecionada?.id === item.id || undefined}
                    title={resumo(item, salaPorCodigo)}
                    {...propsArrastavel(item)}
                  >
                    <span className="timeline-block-name">{item.disciplina}</span>
                    <span className="timeline-block-meta">
                      {item.inicio}–{item.fim}h · {item.vagas} vagas
                    </span>
                    {item.manual ? (
                      <span className="timeline-chip-tag">retirada manualmente</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <div className="grade-legend timeline-legend" aria-label="Legenda">
        <span className="legend-item legend-manual">Ajuste manual</span>
        <span className="legend-item legend-violacao">Sala menor que as vagas</span>
        {interativo ? (
          <>
            <span className="legend-item legend-livre">Livre no horario</span>
            <span className="legend-item legend-pequena">Livre, mas pequena</span>
            <span className="legend-item legend-ocupada">Ocupada (pede realocacao)</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
