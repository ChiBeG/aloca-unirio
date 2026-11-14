import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    await screen.findByRole("button", { name: "Grade interativa" });
  }

  /** Duplo clique na pendente da bandeja abre o dialogo completo. */
  async function abrirDialogo(nome: string) {
    const bandeja = within(screen.getByRole("complementary", { name: "Disciplinas sem sala no dia" }));
    await userEvent.dblClick(bandeja.getByText(nome));
    await screen.findByRole("dialog");
  }

    function trilha(sala: number) {
    const el = document.querySelector<HTMLElement>(`.timeline-track[data-sala="${sala}"]`);
    if (!el) throw new Error(`trilha ${sala} nao encontrada`);
    return el;
  }

  test("aloca disciplina pendente em sala livre e refaz a rodada com o ajuste", async () => {
    mockFetch(true);
    await gerar();

    await abrirDialogo("Y");
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Y");

    const destino = within(screen.getByRole("group", { name: "Sala de destino" }));
    expect(destino.getByRole("radio", { name: /CCH-A.*Ocupada.*X/ })).toBeInTheDocument();
    expect(destino.getByRole("radio", { name: /CCH-B.*Livre, mas pequena.*faltam 5/ })).toBeInTheDocument();

    await userEvent.click(destino.getByRole("radio", { name: /CCH-B/ }));
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

    await abrirDialogo("Y");
    await userEvent.click(
      within(screen.getByRole("group", { name: "Sala de destino" })).getByRole("radio", {
        name: /CCH-A/,
      }),
    );

    const confirmar = screen.getByRole("button", { name: "Confirmar ajuste" });
    expect(confirmar).toBeDisabled();
    expect(screen.getByRole("region", { name: "Disciplinas deslocadas" })).toHaveTextContent("X");

    const deslocada = within(screen.getByRole("group", { name: /^X \(Curso\)/ }));
    expect(deslocada.queryByRole("radio", { name: /CCH-A/ })).not.toBeInTheDocument();
    await userEvent.click(deslocada.getByRole("radio", { name: /CCH-B/ }));
    expect(confirmar).toBeEnabled();
    await userEvent.click(confirmar);

    await waitFor(() => expect(corpos).toHaveLength(2));
    expect(corpos[1].ajustes).toEqual([
      { disciplina: 2, sala: 101, nome: "Y", realocacoes: [{ disciplina: 1, sala: 102 }] },
    ]);
  });

  test("deslocada pode ficar sem sala", async () => {
    mockFetch(true);
    await gerar();

    await abrirDialogo("Y");
    await userEvent.click(
      within(screen.getByRole("group", { name: "Sala de destino" })).getByRole("radio", {
        name: /CCH-A/,
      }),
    );
    const deslocada = within(screen.getByRole("group", { name: /^X \(Curso\)/ }));
    await userEvent.click(deslocada.getByRole("radio", { name: /Deixar sem sala/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Ficarao sem sala");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar ajuste" }));

    await waitFor(() => expect(corpos).toHaveLength(2));
    expect(corpos[1].ajustes).toEqual([
      { disciplina: 2, sala: 101, nome: "Y", realocacoes: [{ disciplina: 1, sala: null }] },
    ]);
  });

  test("grade interativa: clicar na pendente e depois na sala livre move direto", async () => {
    mockFetch(true);
    await gerar();

    const bandeja = within(screen.getByRole("complementary", { name: "Disciplinas sem sala no dia" }));
    await userEvent.click(bandeja.getByText("Y"));
    expect(screen.getByText(/selecionada\. Clique numa sala/)).toBeInTheDocument();
    expect(trilha(102).querySelector(".timeline-band")).toHaveAttribute("data-estado", "pequena");

    await userEvent.click(trilha(102));
    await waitFor(() => expect(corpos).toHaveLength(2));
    expect(corpos[1].ajustes).toEqual([{ disciplina: 2, sala: 102, nome: "Y", realocacoes: [] }]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("grade interativa: soltar em sala ocupada pede confirmacao", async () => {
    mockFetch(true);
    await gerar();

    const chip = within(screen.getByRole("complementary", { name: "Disciplinas sem sala no dia" })).getByText("Y")
      .parentElement as HTMLElement;
    const dados = new Map<string, string>();
    const dataTransfer = {
      setData: (k: string, v: string) => dados.set(k, v),
      getData: (k: string) => dados.get(k) ?? "",
      effectAllowed: "",
      dropEffect: "",
    };
    fireEvent.dragStart(chip, { dataTransfer });
    fireEvent.dragOver(trilha(101), { dataTransfer });
    fireEvent.drop(trilha(101), { dataTransfer });

    // Y veio das pendentes: nao ha sala de origem para trocar, entao X fica sem sala.
    const confirmacao = await screen.findByRole("alertdialog", { name: "Tem certeza?" });
    expect(confirmacao).toHaveTextContent("'Y' vai para CCH-A.");
    expect(confirmacao).toHaveTextContent("'X' fica sem sala.");
    await userEvent.click(within(confirmacao).getByRole("button", { name: "Sim" }));

    await waitFor(() => expect(corpos).toHaveLength(2));
    expect(corpos[1].ajustes).toEqual([
      { disciplina: 2, sala: 101, nome: "Y", realocacoes: [{ disciplina: 1, sala: null }] },
    ]);
  });

  test("grade interativa: com uma selecionada, clicar no bloco de sala lotada move para ela", async () => {
    mockFetch(true);
    await gerar();

    const bandeja = within(screen.getByRole("complementary", { name: "Disciplinas sem sala no dia" }));
    await userEvent.click(bandeja.getByText("Y"));
    await userEvent.click(within(trilha(101)).getByText("X"));

    const confirmacao = await screen.findByRole("alertdialog", { name: "Tem certeza?" });
    await userEvent.click(within(confirmacao).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(corpos).toHaveLength(1);
  });

  test("papel sem permissao ve a grade sem poder arrastar", async () => {
    mockFetch(false);
    await gerar();
    expect(document.querySelector(".timeline-block")).not.toHaveAttribute("draggable");
    expect(screen.queryByText(/Arraste um bloco/)).not.toBeInTheDocument();
  });

  test("lista de sem sala aparece so na grade por sala", async () => {
    mockFetch(true);
    await gerar();
    expect(screen.queryByRole("button", { name: "Alocar manualmente" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Grade por sala" }));
    expect(screen.getByTitle("Grade horaria gerada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alocar manualmente" })).toBeInTheDocument();
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

    expect(screen.getByRole("complementary", { name: "Disciplinas sem sala no dia" })).toHaveTextContent("Y");
    expect(screen.queryByRole("region", { name: "Ajustes manuais" })).not.toBeInTheDocument();
  });
});
