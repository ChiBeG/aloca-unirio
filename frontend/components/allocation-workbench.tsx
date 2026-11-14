"use client";

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Filter,
  Hand,
  LayoutGrid,
  LoaderCircle,
  Play,
  RefreshCw,
  Search,
  Table2,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AllocationTimeline } from "@/components/allocation-timeline";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ManualAllocationDialog } from "@/components/manual-allocation-dialog";
import {
  FALLBACK_CSV_OPTIONS,
  type Ajuste,
  type AjusteIgnorado,
  type AlocacaoItem,
  type AllocationFormValues,
  type CsvOptionsResponse,
  type SalaInfo,
  fetchCsvOptions,
  requestAllocation,
} from "@/lib/allocation-client";
import { fetchCurrentUser } from "@/lib/auth-client";
import {
  carregarAjustes,
  ajusteRapido,
  descreverHorario,
  exportarAjustes,
  importarAjustes,
  ocupantes,
  rotuloSala,
  salvarAjustes,
} from "@/lib/manual-adjustments";

type Status = "idle" | "loading-options" | "running" | "success" | "error";

type FilterValues = {
  predio: string;
  curso: string;
  professor: string;
  dia: string;
  turno: string;
};

const FILTER_DEFAULTS: FilterValues = {
  predio: "todos",
  curso: "",
  professor: "",
  dia: "todos",
  turno: "todos",
};

const DIA_OPTIONS = [
  ["todos", "Todos"],
  ["2", "Segunda"],
  ["3", "Terca"],
  ["4", "Quarta"],
  ["5", "Quinta"],
  ["6", "Sexta"],
] as const;

const TURNO_OPTIONS = [
  ["todos", "Todos"],
  ["manha", "Manha"],
  ["tarde", "Tarde"],
  ["noite", "Noite"],
] as const;

function applyFilters(html: string, filters: FilterValues): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const body = doc.body;

  // Collect h2+table pairs (one per sala)
  const sections: Array<{ h2: Element; table: Element }> = [];
  let pendingH2: Element | null = null;
  for (const child of Array.from(body.children)) {
    if (child.tagName === "H2") {
      pendingH2 = child;
    } else if (child.tagName === "TABLE" && pendingH2) {
      sections.push({ h2: pendingH2, table: child });
      pendingH2 = null;
    }
  }

  const toRemove: Element[] = [];

  for (const { h2, table } of sections) {
    // Predio filter
    if (filters.predio !== "todos") {
      if (h2.getAttribute("data-predio") !== filters.predio) {
        toRemove.push(h2, table);
        continue;
      }
    }

    // Curso filter
    if (filters.curso) {
      const cells = table.querySelectorAll("td[data-curso]");
      const match = Array.from(cells).some(
        (c) => c.getAttribute("data-curso") === filters.curso,
      );
      if (!match) {
        toRemove.push(h2, table);
        continue;
      }
    }

    // Professor filter
    if (filters.professor) {
      const cells = table.querySelectorAll("td[data-professor]");
      const match = Array.from(cells).some(
        (c) => c.getAttribute("data-professor") === filters.professor,
      );
      if (!match) {
        toRemove.push(h2, table);
        continue;
      }
    }
  }

  toRemove.forEach((el) => el.remove());
  return doc.documentElement.outerHTML;
}

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function mesmosArquivos(a: AllocationFormValues, b: AllocationFormValues) {
  return (
    a.predios === b.predios &&
    a.salas === b.salas &&
    a.disciplinas === b.disciplinas
  );
}

export function AllocationWorkbench() {
  const [csvState, setCsvState] =
    useState<CsvOptionsResponse>(FALLBACK_CSV_OPTIONS);
  const [values, setValues] = useState<AllocationFormValues>(
    FALLBACK_CSV_OPTIONS.defaults,
  );
  const [filters, setFilters] = useState<FilterValues>(FILTER_DEFAULTS);
  const [status, setStatus] = useState<Status>("loading-options");
  const [rawHtml, setRawHtml] = useState("");
  const [cursos, setCursos] = useState<string[]>([]);
  const [professores, setProfessores] = useState<string[]>([]);
  const [conflitos, setConflitos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [alocacoes, setAlocacoes] = useState<AlocacaoItem[]>([]);
  const [salas, setSalas] = useState<SalaInfo[]>([]);
  const [ajustes, setAjustes] = useState<Ajuste[]>([]);
  const [ajustesIgnorados, setAjustesIgnorados] = useState<AjusteIgnorado[]>([]);
  const [runValues, setRunValues] = useState<AllocationFormValues | null>(null);
  const [podeAjustar, setPodeAjustar] = useState(false);
  const [dialogo, setDialogo] = useState<{ alvo: AlocacaoItem } | null>(null);
  const [confirmacao, setConfirmacao] = useState<{ ajuste: Ajuste; linhas: string[] } | null>(
    null,
  );
  const [visao, setVisao] = useState<"interativa" | "planilha">("interativa");
  const [busca, setBusca] = useState("");
  const [avisoAjustes, setAvisoAjustes] = useState("");
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    void fetchCsvOptions().then((response) => {
      if (!active) return;
      setCsvState(response);
      setValues(response.defaults);
      setStatus("idle");
    });

    void fetchCurrentUser().then((user) => {
      if (!active) return;
      setPodeAjustar(typeof user === "object" && user?.podeAjustar === true);
    });

    return () => {
      active = false;
    };
  }, []);

  const salaPorCodigo = useMemo(
    () => new Map(salas.map((s) => [s.codigo, s])),
    [salas],
  );

  const alocacaoPorId = useMemo(
    () => new Map(alocacoes.map((a) => [a.id, a])),
    [alocacoes],
  );

  const pendentes = useMemo(
    () => alocacoes.filter((a) => a.sala === null),
    [alocacoes],
  );

  const resultadosBusca = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (termo.length < 2) return [];
    return alocacoes
      .filter((a) =>
        normalizar(`${a.disciplina} ${a.curso} ${a.professor}`).includes(termo),
      )
      .slice(0, 8);
  }, [alocacoes, busca]);

  const temMarcacoes = alocacoes.some(
    (a) => a.manual || a.violacoes.length > 0,
  );

  const activeFilterCount = useMemo(
    () =>
      Object.values(filters).filter(
        (value) => value.trim() !== "" && value !== "todos",
      ).length,
    [filters],
  );

  const filteredHtml = useMemo(() => {
    if (!rawHtml) return "";
    return applyFilters(rawHtml, filters);
  }, [rawHtml, filters]);

  async function executar(
    valoresRodada: AllocationFormValues,
    listaAjustes: Ajuste[],
    resetFilters: boolean,
  ) {
    setStatus("running");
    setError("");

    const result = await requestAllocation(
      valoresRodada,
      podeAjustar ? listaAjustes : [],
    );

    if ("error" in result) {
      setStatus("error");
      setError(result.error);
      return;
    }

    setRawHtml(result.html);
    setCursos(result.cursos);
    setProfessores(result.professores);
    setConflitos(result.conflitos);
    setAlocacoes(result.alocacoes);
    setSalas(result.salas);
    setAjustesIgnorados(result.ajustesIgnorados);
    setRunValues(valoresRodada);
    if (resetFilters) setFilters(FILTER_DEFAULTS);
    setStatus("success");
  }

  async function handleSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    const salvos = carregarAjustes(values);
    setAjustes(salvos);
    setAvisoAjustes("");
    await executar(values, salvos, true);
  }

  /** Grava a nova lista de ajustes e refaz a rodada com ela. */
  function atualizarAjustes(novos: Ajuste[]) {
    if (!runValues) return;
    setAjustes(novos);
    salvarAjustes(runValues, novos);
    void executar(runValues, novos, false);
  }

  /** Soltou um bloco numa sala da grade interativa. */
  function moverPara(item: AlocacaoItem, sala: number) {
    if (item.sala === sala) return;
    if (ocupantes(alocacoes, sala, item).length === 0) {
      confirmarAjuste({ disciplina: item.id, sala, nome: item.disciplina, realocacoes: [] });
      return;
    }
    // Sala ocupada: quem estava la troca de sala quando possivel, senao fica sem sala.
    const ajuste = ajusteRapido(alocacoes, salas, item, sala);
    if (!ajuste) {
      setDialogo({ alvo: item });
      return;
    }
    setConfirmacao({ ajuste, linhas: descreverConfirmacao(item, ajuste) });
  }

  function descreverConfirmacao(item: AlocacaoItem, ajuste: Ajuste) {
    const nomeSala = (codigo: number) => rotuloSala(salaPorCodigo.get(codigo), codigo);
    const aviso = (vagas: number, codigo: number) => {
      const sala = salaPorCodigo.get(codigo);
      return sala && sala.capacidade < vagas
        ? ` (⚠ ${sala.capacidade} lugares para ${vagas} vagas)`
        : "";
    };
    return [
      `'${item.disciplina}' vai para ${nomeSala(ajuste.sala)}${aviso(item.vagas, ajuste.sala)}.`,
      ...ajuste.realocacoes.map((r) => {
        const d = alocacaoPorId.get(r.disciplina);
        const nome = d?.disciplina ?? `linha ${r.disciplina}`;
        return r.sala == null
          ? `'${nome}' fica sem sala.`
          : `'${nome}' vai para ${nomeSala(r.sala)}${aviso(d?.vagas ?? 0, r.sala)} (troca).`;
      }),
    ];
  }

  function confirmarAjuste(ajuste: Ajuste) {
    setDialogo(null);
    setBusca("");
    setAvisoAjustes("");
    atualizarAjustes([...ajustes, ajuste]);
  }

  function desfazerAjuste(indice: number) {
    setAvisoAjustes("");
    atualizarAjustes(ajustes.filter((_, i) => i !== indice));
  }

  function descartarAjustes() {
    if (!window.confirm("Descartar todos os ajustes manuais desta rodada?")) {
      return;
    }
    setAvisoAjustes("");
    atualizarAjustes([]);
  }

  function baixarAjustes() {
    if (!runValues) return;
    const blob = new Blob([exportarAjustes(runValues, ajustes)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ajustes-${runValues.disciplinas.replace(/\.csv$/, "")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function carregarArquivoAjustes(file: File | undefined) {
    if (!file || !runValues) return;
    try {
      const arquivo = importarAjustes(await file.text());
      setAvisoAjustes(
        mesmosArquivos(arquivo.arquivos, runValues)
          ? `${arquivo.ajustes.length} ajuste(s) importado(s).`
          : `${arquivo.ajustes.length} ajuste(s) importado(s) de outra combinacao de CSVs (${arquivo.arquivos.disciplinas || "desconhecida"}). Os que nao baterem com a rodada atual serao ignorados.`,
      );
      atualizarAjustes(arquivo.ajustes);
    } catch (err) {
      setAvisoAjustes(
        err instanceof Error ? err.message : "Nao foi possivel importar o arquivo.",
      );
    } finally {
      if (importInput.current) importInput.current.value = "";
    }
  }

  function descreverAjuste(ajuste: Ajuste) {
    const principal = `${ajuste.nome} → ${rotuloSala(salaPorCodigo.get(ajuste.sala), ajuste.sala)}`;
    if (ajuste.realocacoes.length === 0) return principal;
    const extras = ajuste.realocacoes
      .map(
        (r) =>
          `${alocacaoPorId.get(r.disciplina)?.disciplina ?? `linha ${r.disciplina}`} → ${rotuloSala(r.sala == null ? undefined : salaPorCodigo.get(r.sala), r.sala)}`,
      )
      .join("; ");
    return `${principal} (realoca: ${extras})`;
  }

  function updateValue(key: keyof AllocationFormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function updateFilter(key: keyof FilterValues, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearResult() {
    setRawHtml("");
    setCursos([]);
    setProfessores([]);
    setConflitos([]);
    setAlocacoes([]);
    setSalas([]);
    setAjustesIgnorados([]);
    setRunValues(null);
    setAvisoAjustes("");
    setFilters(FILTER_DEFAULTS);
  }

  const isRunning = status === "running";
  const canSubmit = !isRunning && status !== "loading-options";

  return (
    <div className="workspace">
      <header className="workbench-header">
        <div>
          <p className="page-eyebrow">Alocacao automatica</p>
          <h1 className="page-title">Rodada de alocacao</h1>
          <p className="page-description">
            Selecione os arquivos de predios, salas e disciplinas e execute
            a alocacao. O resultado e exibido como grade horaria por sala.
          </p>
        </div>
        <div className="connection-pill" data-source={csvState.source}>
          {csvState.source === "django" ? (
            <CheckCircle2 aria-hidden="true" size={18} />
          ) : (
            <AlertTriangle aria-hidden="true" size={18} />
          )}
          <span>{csvState.source === "django" ? "Django online" : "Fallback local"}</span>
        </div>
      </header>

      <section className="status-grid" aria-label="Resumo da operacao">
        <Metric label="Arquivos CSV" value={csvState.options.length.toString()} />
        <Metric label="Predios base" value="3" />
        <Metric label="Salas base" value="30" />
        <Metric label="Disciplinas base" value="405" />
      </section>

      <div className="work-grid">
        <aside className="control-panel" aria-label="Controles de alocacao">
          <form className="run-form" onSubmit={handleSubmit}>
            <div className="panel-heading">
              <FileSpreadsheet aria-hidden="true" size={20} />
              <h2>Rodada</h2>
            </div>

            {csvState.warning ? (
              <div className="inline-alert" role="status">
                <AlertTriangle aria-hidden="true" size={18} />
                <span>{csvState.warning}</span>
              </div>
            ) : null}

            <SelectField
              id="predios"
              label="Predios"
              value={values.predios}
              options={csvState.options}
              onChange={(value) => updateValue("predios", value)}
            />
            <SelectField
              id="salas"
              label="Salas"
              value={values.salas}
              options={csvState.options}
              onChange={(value) => updateValue("salas", value)}
            />
            <SelectField
              id="disciplinas"
              label="Disciplinas"
              value={values.disciplinas}
              options={csvState.options}
              onChange={(value) => updateValue("disciplinas", value)}
            />

            <button className="primary-action" disabled={!canSubmit} type="submit">
              {isRunning ? (
                <LoaderCircle className="spin" aria-hidden="true" size={18} />
              ) : (
                <Play aria-hidden="true" size={18} />
              )}
              <span>{isRunning ? "Gerando" : "Gerar alocacao"}</span>
            </button>
          </form>

          <section className="filter-panel" aria-label="Filtros de navegacao">
            <div className="panel-heading">
              <Filter aria-hidden="true" size={20} />
              <h2>Filtros</h2>
              <span className="counter">{activeFilterCount}</span>
              {activeFilterCount > 0 ? (
                <button
                  className="clear-filters"
                  onClick={() => setFilters(FILTER_DEFAULTS)}
                  type="button"
                >
                  Limpar
                </button>
              ) : null}
            </div>

            <label className="field">
              <span>Predio</span>
              <select
                value={filters.predio}
                onChange={(event) => updateFilter("predio", event.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="CCH">CCH</option>
                <option value="PJA">PJA</option>
                <option value="EEAP">EEAP</option>
                <option value="RU">RU</option>
              </select>
            </label>

            <label className="field">
              <span>Curso</span>
              <select
                value={filters.curso}
                onChange={(event) => updateFilter("curso", event.target.value)}
                disabled={cursos.length === 0}
              >
                <option value="">Todos</option>
                {cursos.map((curso) => (
                  <option key={curso} value={curso}>
                    {curso}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Professor</span>
              <select
                value={filters.professor}
                onChange={(event) =>
                  updateFilter("professor", event.target.value)
                }
                disabled={professores.length === 0}
              >
                <option value="">Todos</option>
                {professores.map((prof) => (
                  <option key={prof} value={prof}>
                    {prof}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Dia</span>
              <select
                value={filters.dia}
                onChange={(event) => updateFilter("dia", event.target.value)}
              >
                {DIA_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="segmented" aria-label="Turno">
              {TURNO_OPTIONS.map(([value, label]) => (
                <button
                  aria-pressed={filters.turno === value}
                  key={value}
                  onClick={() => updateFilter("turno", value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="result-panel" aria-label="Resultado da alocacao">
          <div className="result-toolbar">
            <div>
              <p className="eyebrow">Resultado</p>
              <h2>Grade horaria</h2>
            </div>
            <button
              className="ghost-action"
              disabled={!rawHtml || isRunning}
              onClick={clearResult}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={17} />
              <span>Limpar</span>
            </button>
          </div>

          {status === "error" ? (
            <div className="result-state error-state" role="alert">
              <AlertTriangle aria-hidden="true" size={24} />
              <strong>Falha na alocacao</strong>
              <p>{error}</p>
            </div>
          ) : null}

          {status !== "error" && !rawHtml ? (
            <div className="result-state">
              <Building2 aria-hidden="true" size={28} />
              <strong>Aguardando rodada</strong>
              <p>A grade horaria gerada pela alocacao aparece aqui.</p>
            </div>
          ) : null}

          {rawHtml && alocacoes.length > 0 ? (
            <div className="view-switch" role="group" aria-label="Visualizacao da grade">
              <button
                aria-pressed={visao === "interativa"}
                onClick={() => setVisao("interativa")}
                type="button"
              >
                <LayoutGrid aria-hidden="true" size={15} />
                <span>Grade interativa</span>
              </button>
              <button
                aria-pressed={visao === "planilha"}
                onClick={() => setVisao("planilha")}
                type="button"
              >
                <Table2 aria-hidden="true" size={15} />
                <span>Grade por sala</span>
              </button>
            </div>
          ) : null}

          {rawHtml && alocacoes.length > 0 && visao === "interativa" ? (
            <AllocationTimeline
              alocacoes={alocacoes}
              filtros={filters}
              ocupado={isRunning}
              onDetalhes={(item) => setDialogo({ alvo: item })}
              onMover={moverPara}
              podeAjustar={podeAjustar}
              salas={salas}
            />
          ) : filteredHtml ? (
            <iframe
              className="result-frame"
              sandbox=""
              srcDoc={filteredHtml}
              title="Grade horaria gerada"
            />
          ) : rawHtml && !filteredHtml && visao === "planilha" ? (
            <div className="result-state">
              <Filter aria-hidden="true" size={28} />
              <strong>Nenhuma sala corresponde aos filtros</strong>
              <p>Ajuste os filtros para ver resultados.</p>
            </div>
          ) : null}

          {filteredHtml && temMarcacoes && (visao === "planilha" || alocacoes.length === 0) ? (
            <div className="grade-legend" aria-label="Legenda da grade">
              <span className="legend-item legend-manual">Ajuste manual</span>
              <span className="legend-item legend-violacao">
                Sala menor que as vagas
              </span>
            </div>
          ) : null}

          {/* Na grade interativa a bandeja "Sem sala" ja cumpre esse papel. */}
          {alocacoes.length > 0 && pendentes.length > 0 && visao === "planilha" ? (
            <section className="conflicts-panel" aria-label="Disciplinas sem sala">
              <div className="conflicts-header">
                <AlertTriangle aria-hidden="true" size={16} />
                <strong>
                  {pendentes.length}{" "}
                  {pendentes.length === 1
                    ? "disciplina sem sala"
                    : "disciplinas sem sala"}
                </strong>
              </div>
              <ul className="conflicts-list">
                {pendentes.map((item) => (
                  <li className="pending-item" key={item.id}>
                    <span>
                      {item.disciplina} ({item.curso}) — {descreverHorario(item)} ·{" "}
                      {item.vagas} vagas
                      {item.manual ? (
                        <em className="adjustment-reason">Retirada manualmente da sala</em>
                      ) : null}
                    </span>
                    {podeAjustar ? (
                      <button
                        className="row-action"
                        disabled={isRunning}
                        onClick={() => setDialogo({ alvo: item })}
                        type="button"
                      >
                        Alocar manualmente
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : alocacoes.length === 0 && conflitos.length > 0 ? (
            <section className="conflicts-panel" aria-label="Disciplinas sem sala">
              <div className="conflicts-header">
                <AlertTriangle aria-hidden="true" size={16} />
                <strong>
                  {conflitos.length}{" "}
                  {conflitos.length === 1
                    ? "disciplina sem sala"
                    : "disciplinas sem sala"}
                </strong>
              </div>
              <ul className="conflicts-list">
                {conflitos.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {podeAjustar && alocacoes.length > 0 ? (
            <section className="adjustments-panel" aria-label="Ajustes manuais">
              <div className="adjustments-header">
                <Hand aria-hidden="true" size={16} />
                <strong>Ajustes manuais ({ajustes.length})</strong>
                <div className="adjustments-tools">
                  <button
                    className="row-action"
                    disabled={ajustes.length === 0}
                    onClick={baixarAjustes}
                    type="button"
                  >
                    <Download aria-hidden="true" size={14} />
                    <span>Exportar JSON</span>
                  </button>
                  <button
                    className="row-action"
                    disabled={isRunning}
                    onClick={() => importInput.current?.click()}
                    type="button"
                  >
                    <Upload aria-hidden="true" size={14} />
                    <span>Importar JSON</span>
                  </button>
                  <input
                    accept="application/json,.json"
                    aria-label="Arquivo de ajustes"
                    className="visually-hidden"
                    onChange={(event) =>
                      void carregarArquivoAjustes(event.target.files?.[0])
                    }
                    ref={importInput}
                    type="file"
                  />
                  <button
                    className="row-action danger"
                    disabled={ajustes.length === 0 || isRunning}
                    onClick={descartarAjustes}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={14} />
                    <span>Descartar todos</span>
                  </button>
                </div>
              </div>

              <div className="adjustments-body">
                <label className="field">
                  <span>Mover uma disciplina</span>
                  <div className="input-shell">
                    <Search aria-hidden="true" size={16} />
                    <input
                      onChange={(event) => setBusca(event.target.value)}
                      placeholder="Nome da disciplina, curso ou professor"
                      type="search"
                      value={busca}
                    />
                  </div>
                </label>

                {resultadosBusca.length > 0 ? (
                  <ul className="adjustments-list" aria-label="Resultados da busca">
                    {resultadosBusca.map((item) => (
                      <li key={item.id}>
                        <span>
                          {item.disciplina} ({item.curso}) — {descreverHorario(item)} ·{" "}
                          {rotuloSala(
                            item.sala == null ? undefined : salaPorCodigo.get(item.sala),
                            item.sala,
                          )}
                        </span>
                        <button
                          className="row-action"
                          disabled={isRunning}
                          onClick={() => setDialogo({ alvo: item })}
                          type="button"
                        >
                          {item.sala == null ? "Alocar" : "Mover"}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : busca.trim().length >= 2 ? (
                  <p className="adjustments-empty">Nenhuma disciplina encontrada.</p>
                ) : null}

                {avisoAjustes ? (
                  <div className="inline-alert" role="status">
                    <AlertTriangle aria-hidden="true" size={18} />
                    <span>{avisoAjustes}</span>
                  </div>
                ) : null}

                {ajustes.length > 0 ? (
                  <ol className="adjustments-list" aria-label="Ajustes aplicados">
                    {ajustes.map((ajuste, indice) => {
                      const ignorado = ajustesIgnorados.find(
                        (i) => i.indice === indice,
                      );
                      return (
                        <li
                          className={ignorado ? "ignored" : undefined}
                          key={`${indice}-${ajuste.disciplina}-${ajuste.sala}`}
                        >
                          <span>
                            {descreverAjuste(ajuste)}
                            {ignorado ? (
                              <em className="adjustment-reason">
                                Nao aplicado: {ignorado.motivo}
                              </em>
                            ) : null}
                          </span>
                          <button
                            className="row-action"
                            disabled={isRunning}
                            onClick={() => desfazerAjuste(indice)}
                            type="button"
                          >
                            <Undo2 aria-hidden="true" size={14} />
                            <span>Desfazer</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="adjustments-empty">
                    Nenhum ajuste manual. Arraste as disciplinas na grade interativa
                    ou busque uma disciplina para mover.
                  </p>
                )}
              </div>
            </section>
          ) : null}
        </section>
      </div>

      {dialogo ? (
        <ManualAllocationDialog
          alocacoes={alocacoes}
          alvo={dialogo.alvo}
          key={dialogo.alvo.id}
          onCancel={() => setDialogo(null)}
          onConfirm={confirmarAjuste}
          salas={salas}
        />
      ) : null}

      {confirmacao ? (
        <ConfirmDialog
          linhas={confirmacao.linhas}
          onCancel={() => setConfirmacao(null)}
          onConfirm={() => {
            const { ajuste } = confirmacao;
            setConfirmacao(null);
            confirmarAjuste(ajuste);
          }}
          titulo="Tem certeza?"
        />
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SelectField({
  id,
  label,
  onChange,
  options,
  value,
}: {
  id: keyof AllocationFormValues;
  label: string;
  onChange: (value: string) => void;
  options: CsvOptionsResponse["options"];
  value: string;
}) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        name={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={`${id}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
