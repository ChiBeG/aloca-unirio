import { CalendarDays, Table2 } from "lucide-react";

import {
  DependencyList,
  InfoPanel,
  PageHeader,
} from "@/components/platform-page";

export default function SchedulePage() {
  return (
    <div className="route-shell">
      <PageHeader
        badge="Visualizacao futura"
        description="Area para navegar pela grade final por predio, sala, curso, professor, dia e turno."
        eyebrow="Grade"
        title="Consulta da grade alocada"
      />

      <div className="panel-grid">
        <InfoPanel title="Objetivo da tela">
          <p>
            Substituir gradualmente o HTML legado por uma experiencia navegavel,
            com filtros reais e grade estruturada dentro do frontend.
          </p>
        </InfoPanel>

        <InfoPanel title="Backend necessario">
          <DependencyList
            items={[
              "JSON da grade por sala, disciplina, horario, professor e curso.",
              "Filtros consultaveis para predio, sala, dia, turno e curso.",
              "Identificador da rodada ativa.",
              "Exportacao ou link para relatorio oficial.",
            ]}
          />
        </InfoPanel>
      </div>

      <section className="empty-state-panel">
        <Table2 aria-hidden="true" size={28} />
        <div>
          <strong>Grade estruturada</strong>
          <p>
            Por enquanto, a visualizacao real continua no preview HTML da tela
            de alocacao. Esta pagina espera o contrato JSON do backend.
          </p>
        </div>
        <CalendarDays aria-hidden="true" className="empty-state-mark" size={72} />
      </section>
    </div>
  );
}
