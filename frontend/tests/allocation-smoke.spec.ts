import { expect, test } from "@playwright/test";

test("runs the allocation MVP flow with mocked backend routes", async ({ page }) => {
  await page.route("**/api/csv-options", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
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
      }),
    });
  });

  await page.route("**/api/alocar", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        html: "<html><body><h2>Sala CCH-202</h2><table><tbody><tr><td>Arquivologia</td></tr></tbody></table></body></html>",
      }),
    });
  });

  await page.goto("/alocacao");

  await expect(
    page.getByRole("heading", { name: "Rodada de alocacao" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Gerar alocacao/ }).click();

  const frame = page.frameLocator('iframe[title="Previa da grade horaria gerada"]');
  await expect(frame.getByRole("heading", { name: "Sala CCH-202" })).toBeVisible();
});
