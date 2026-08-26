"use client";

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  Filter,
  LoaderCircle,
  Play,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  FALLBACK_CSV_OPTIONS,
  type AllocationFormValues,
  type CsvOptionsResponse,
  fetchCsvOptions,
  requestAllocation,
} from "@/lib/allocation-client";

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

  useEffect(() => {
    let active = true;

    void fetchCsvOptions().then((response) => {
      if (!active) return;
      setCsvState(response);
      setValues(response.defaults);
      setStatus("idle");
    });

    return () => {
      active = false;
    };
  }, []);

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

  async function handleSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    setStatus("running");
    setError("");

    const result = await requestAllocation(values);

    if ("error" in result) {
      setStatus("error");
      setError(result.error);
      return;
    }

    setRawHtml(result.html);
    setCursos(result.cursos);
    setProfessores(result.professores);
    setConflitos(result.conflitos);
    setFilters(FILTER_DEFAULTS);
    setStatus("success");
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

          {filteredHtml ? (
            <iframe
              className="result-frame"
              sandbox=""
              srcDoc={filteredHtml}
              title="Grade horaria gerada"
            />
          ) : rawHtml && !filteredHtml ? (
            <div className="result-state">
              <Filter aria-hidden="true" size={28} />
              <strong>Nenhuma sala corresponde aos filtros</strong>
              <p>Ajuste os filtros para ver resultados.</p>
            </div>
          ) : null}

          {conflitos.length > 0 ? (
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
        </section>
      </div>
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
