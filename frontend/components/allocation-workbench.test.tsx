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

    const frame = await screen.findByTitle("Previa da grade horaria gerada");

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
      expect(screen.getByTitle("Previa da grade horaria gerada")).toHaveAttribute(
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
