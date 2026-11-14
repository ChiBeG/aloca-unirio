import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { AllocationWorkbench } from "./allocation-workbench";

const csvOptionsPayload = {
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
  source: "django",
};

describe("AllocationWorkbench", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();

        if (url.endsWith("/api/csv-options")) {
          return Response.json(csvOptionsPayload);
        }

        if (url.endsWith("/api/alocar")) {
          return Response.json({
            html: "<html><body><h2>Sala CCH-202</h2><table><tbody><tr><td>Arquivologia</td></tr></tbody></table></body></html>",
          });
        }

        return Response.json({ error: "unexpected request" }, { status: 500 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("loads Django CSV options and renders the generated allocation HTML", async () => {
    render(<AllocationWorkbench />);

    expect(await screen.findByText("Django online")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /gerar alocacao/i }),
    );

    const frame = await screen.findByTitle("Grade horaria gerada");

    expect(frame).toHaveAttribute(
      "srcdoc",
      expect.stringContaining("Sala CCH-202"),
    );
  });

  test("shows the running state before a delayed allocation response", async () => {
    let resolveAllocation: (response: Response) => void = () => undefined;
    const allocationResponse = new Promise<Response>((resolve) => {
      resolveAllocation = resolve;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = input.toString();

        if (url.endsWith("/api/csv-options")) {
          return Promise.resolve(Response.json(csvOptionsPayload));
        }

        if (url.endsWith("/api/alocar")) {
          return allocationResponse;
        }

        return Promise.resolve(
          Response.json({ error: "unexpected request" }, { status: 500 }),
        );
      }),
    );

    render(<AllocationWorkbench />);

    expect(await screen.findByText("Django online")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /gerar alocacao/i }),
    );

    expect(screen.getByRole("button", { name: /gerando/i })).toBeDisabled();

    resolveAllocation(
      Response.json({
        html: "<html><body><h2>Sala CCH-203</h2></body></html>",
      }),
    );

    await waitFor(() =>
      expect(screen.getByTitle("Grade horaria gerada")).toHaveAttribute(
        "srcdoc",
        expect.stringContaining("Sala CCH-203"),
      ),
    );
  });

  test("renders backend errors in the result panel", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();

        if (url.endsWith("/api/csv-options")) {
          return Response.json(csvOptionsPayload);
        }

        return Response.json(
          { error: "HTML nao foi gerado." },
          { status: 502 },
        );
      }),
    );

    render(<AllocationWorkbench />);

    expect(await screen.findByText("Django online")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /gerar alocacao/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "HTML nao foi gerado.",
    );
  });
});

describe("AllocationWorkbench - ajustes manuais", () => {
  const salas = [
    { codigo: 101, nome: "A", predio: "CCH", capacidade: 40 },
    { codigo: 102, nome: "B", predio: "CCH", capacidade: 30 },
  ];
  const base = {
    curso: "Curso",
    professor: "Prof",
    dia: 2,
    manual: false,
    violacoes: [],
  };
  const alocacoes = [
    { ...base, id: 1, disciplina: "X", vagas: 35, inicio: 18, fim: 22, sala: 101 },
    { ...base, id: 2, disciplina: "Y", vagas: 35, inicio: 18, fim: 22, sala: null },
  ];
  let corpos: Array<Record<string, unknown>>;

  function mockFetch(podeAjustar: boolean) {
    corpos = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input.toString();
        if (url.endsWith("/api/csv-options")) {
          return Response.json(csvOptionsPayload);
        }
        if (url.endsWith("/api/auth/me")) {
          return Response.json({
            email: "a@edu.unirio.br",
            nome: "A",
            papel: podeAjustar ? "OPERADOR" : "REITORIA",
            papelLabel: "",
            temAcesso: true,
            podeAjustar,
          });
        }
        if (url.endsWith("/api/alocar")) {
          corpos.push(JSON.parse(String(init?.body)));
          return Response.json({
            html: "<html><body><h2>Sala CCH-A</h2></body></html>",
            cursos: [],
            professores: [],
            conflitos: [],
            alocacoes,
            salas,
            ajustesIgnorados: [],
          });
        }
        return Response.json({ error: "unexpected request" }, { status: 500 });
      }),
    );
  }

  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  async function gerar() {
    render(<AllocationWorkbench />);
    expect(await screen.findByText("Django online")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /gerar alocacao/i }));
    await screen.findByTitle("Grade horaria gerada");
  }

  test("aloca disciplina pendente em sala livre e refaz a rodada com o ajuste", async () => {
    mockFetch(true);
    await gerar();

    await userEvent.click(await screen.findByRole("button", { name: "Alocar manualmente" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Y");

    await userEvent.selectOptions(screen.getByLabelText("Sala de destino"), "102");
    expect(dialog).toHaveTextContent("Capacidade insuficiente");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar ajuste" }));

    const esperado = [{ disciplina: 2, sala: 102, nome: "Y", realocacoes: [] }];
    await waitFor(() => expect(corpos).toHaveLength(2));
    expect(corpos[0].ajustes).toEqual([]);
    expect(corpos[1].ajustes).toEqual(esperado);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Ajustes aplicados" })).toHaveTextContent("Y → CCH-B");

    const chave = "aloca:ajustes:unirio-predios.csv|unirio-salas.csv|unirio-disciplinas-20252.csv";
    expect(JSON.parse(window.localStorage.getItem(chave) ?? "[]")).toEqual(esperado);
  });

  test("sala ocupada exige escolher para onde vai a disciplina deslocada", async () => {
    mockFetch(true);
    await gerar();

    await userEvent.click(await screen.findByRole("button", { name: "Alocar manualmente" }));
    await userEvent.selectOptions(screen.getByLabelText("Sala de destino"), "101");

    const confirmar = screen.getByRole("button", { name: "Confirmar ajuste" });
    expect(confirmar).toBeDisabled();
    expect(screen.getByRole("region", { name: "Disciplinas deslocadas" })).toHaveTextContent("X");

    await userEvent.selectOptions(screen.getByLabelText(/^X \(Curso\)/), "102");
    expect(confirmar).toBeEnabled();
    await userEvent.click(confirmar);

    await waitFor(() => expect(corpos).toHaveLength(2));
    expect(corpos[1].ajustes).toEqual([
      { disciplina: 2, sala: 101, nome: "Y", realocacoes: [{ disciplina: 1, sala: 102 }] },
    ]);
  });

  test("reenvia os ajustes salvos na proxima rodada", async () => {
    const salvos = [{ disciplina: 2, sala: 102, nome: "Y", realocacoes: [] }];
    window.localStorage.setItem(
      "aloca:ajustes:unirio-predios.csv|unirio-salas.csv|unirio-disciplinas-20252.csv",
      JSON.stringify(salvos),
    );
    mockFetch(true);
    await gerar();
    expect(corpos[0].ajustes).toEqual(salvos);
  });

  test("papel sem permissao nao ve controles de ajuste", async () => {
    mockFetch(false);
    await gerar();

    expect(await screen.findByText(/disciplina sem sala/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Alocar manualmente" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Ajustes manuais" })).not.toBeInTheDocument();
  });
});
