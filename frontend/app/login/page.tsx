import { AlertTriangle, LogIn } from "lucide-react";

import { InfoPanel, PageHeader } from "@/components/platform-page";

const LOGIN_ERRORS: Record<string, string> = {
  dominio:
    "Acesso permitido apenas para contas institucionais @edu.unirio.br. Entre novamente escolhendo sua conta da UNIRIO.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const errorMessage = erro
    ? (LOGIN_ERRORS[erro] ?? "Nao foi possivel concluir o login.")
    : null;

  return (
    <div className="route-shell">
      <PageHeader
        description="Entre com sua conta Google institucional para acessar o sistema de alocacao de salas."
        eyebrow="Acesso"
        title="Entrar"
      />

      <InfoPanel title="Conta institucional">
        <p>
          Somente contas <strong>@edu.unirio.br</strong> sao aceitas. No primeiro
          acesso, sua conta fica pendente ate que um administrador atribua um
          perfil.
        </p>

        {errorMessage ? (
          <p className="inline-alert" role="alert">
            <AlertTriangle aria-hidden="true" size={16} />
            <span>{errorMessage}</span>
          </p>
        ) : null}

        {/* Link comum (nao <Link>): a rota redireciona para o Django/Google. */}
        <a className="primary-action login-action" href="/api/auth/login">
          <LogIn aria-hidden="true" size={18} />
          Entrar com Google
        </a>
      </InfoPanel>
    </div>
  );
}
