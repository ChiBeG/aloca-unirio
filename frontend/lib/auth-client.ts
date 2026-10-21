export type CurrentUser = {
  email: string;
  nome: string;
  papel: string | null;
  papelLabel: string | null;
  temAcesso: boolean;
};

/** Token CSRF emitido pelo Django (cookie csrftoken), enviado nos POSTs. */
export function getCsrfToken(): string {
  if (typeof document === "undefined") {
    return "";
  }

  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

/**
 * Retorna o usuario logado, "anonymous" quando a sessao nao e valida (401)
 * ou null quando o backend nao respondeu.
 */
export async function fetchCurrentUser(): Promise<
  CurrentUser | "anonymous" | null
> {
  try {
    const response = await fetch("/api/auth/me", { cache: "no-store" });

    if (response.status === 401) {
      return "anonymous";
    }

    return response.ok ? ((await response.json()) as CurrentUser) : null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    headers: { "X-CSRFToken": getCsrfToken() },
  });
}
