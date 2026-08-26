import { AlertTriangle, ListChecks } from "lucide-react";

import {
  DependencyList,
  InfoPanel,
  PageHeader,
} from "@/components/platform-page";

export default function ConflictsPage() {
  return (
    <div className="route-shell">
      <PageHeader
        badge="Depende de diagnosticos"
        description="Area para acompanhar conflitos de capacidade, choque de horario, sala indisponivel e disciplinas sem alocacao."
        eyebrow="Conflitos"
        title="Pendencias da alocacao"
      />

      <div className="panel-grid">
        <InfoPanel title="Uso esperado">
          <p>
            A tela deve ajudar coordenadores e equipe tecnica a entender por que
            uma rodada nao ficou perfeita e quais ajustes precisam ser feitos.
          </p>
        </InfoPanel>

        <InfoPanel title="Backend necessario">
          <DependencyList
            items={[
              "Lista estruturada de conflitos por tipo e severidade.",
              "Disciplina, sala, predio e horario envolvidos em cada conflito.",
              "Sugestoes ou alternativas calculadas pelo motor de alocacao.",
              "Status de resolucao para acompanhamento da equipe.",
            ]}
          />
        </InfoPanel>
      </div>

      <section className="empty-state-panel">
        <AlertTriangle aria-hidden="true" size={28} />
        <div>
          <strong>Sem diagnostico estruturado ainda</strong>
          <p>
            O algoritmo de alocacao ja detecta conflitos internamente, mas ainda
            nao os expoe em um endpoint estruturado que o frontend consiga listar e filtrar.
          </p>
        </div>
        <ListChecks aria-hidden="true" className="empty-state-mark" size={72} />
      </section>
    </div>
  );
}
