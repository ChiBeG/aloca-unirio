import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  DatabaseZap,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export default function Home() {
  return (
    <div className="route-shell">
      <header className="dashboard-hero">
        <div className="dashboard-copy">
          <p className="page-eyebrow">UNIRIO</p>
          <h1 className="page-title">Plataforma de alocacao de salas</h1>
          <p className="page-description">
            Sistema de alocacao automatica de disciplinas em salas para o CCH.
            Execute rodadas, consulte a grade e acompanhe pendencias.
          </p>
        </div>
        <div className="dashboard-status" aria-label="Status do MVP">
          <span>
            <LayoutDashboard aria-hidden="true" size={17} />
            MVP frontend
          </span>
          <span>
            <ShieldCheck aria-hidden="true" size={17} />
            Login pendente
          </span>
        </div>
      </header>

      <section className="summary-strip" aria-label="Resumo do produto">
        <div>
          <span>Fluxo ativo</span>
          <strong>Rodada por CSV</strong>
        </div>
        <div>
          <span>Backend</span>
          <strong>Django (Python)</strong>
        </div>
        <div>
          <span>Resultado</span>
          <strong>Grade horaria HTML</strong>
        </div>
      </section>

      <section className="module-grid" aria-label="Areas da plataforma">
        <ModuleLink
          description="Seleciona os arquivos de entrada e executa a alocacao automatica de disciplinas nas salas."
          href="/alocacao"
          icon={<FileSpreadsheet aria-hidden="true" size={20} />}
          status="Operacional"
          title="Alocacao"
        />
        <ModuleLink
          description="Entrada futura para upload, validacao e versionamento de arquivos."
          href="/importacao"
          icon={<DatabaseZap aria-hidden="true" size={20} />}
          status="Backend"
          title="Importacao"
        />
        <ModuleLink
          description="Consulta futura da grade por sala, curso, professor, dia e turno."
          href="/grade"
          icon={<CalendarDays aria-hidden="true" size={20} />}
          status="Backend"
          title="Grade"
        />
        <ModuleLink
          description="Diagnosticos futuros de choque, capacidade e disciplinas sem sala."
          href="/conflitos"
          icon={<AlertTriangle aria-hidden="true" size={20} />}
          status="Backend"
          title="Conflitos"
        />
        <ModuleLink
          description="Auditoria futura de rodadas, arquivos usados e resultados publicados."
          href="/historico"
          icon={<History aria-hidden="true" size={20} />}
          status="Backend"
          title="Historico"
        />
        <div className="module-card module-card-static">
          <span className="module-icon">
            <ClipboardList aria-hidden="true" size={20} />
          </span>
          <span className="module-copy">
            <strong>Autenticacao</strong>
            <span>
              Login sera implementado quando houver usuarios, permissoes e
              sessao definidos pelo backend.
            </span>
          </span>
          <span className="module-status">Pendente</span>
        </div>
      </section>
    </div>
  );
}

function ModuleLink({
  description,
  href,
  icon,
  status,
  title,
}: {
  description: string;
  href: Route;
  icon: ReactNode;
  status: string;
  title: string;
}) {
  return (
    <Link className="module-card" href={href}>
      <span className="module-icon">{icon}</span>
      <span className="module-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <span className="module-status">{status}</span>
    </Link>
  );
}
