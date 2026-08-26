import { History, ScrollText } from "lucide-react";

import {
  DependencyList,
  InfoPanel,
  PageHeader,
} from "@/components/platform-page";

export default function HistoryPage() {
  return (
    <div className="route-shell">
      <PageHeader
        badge="Auditoria futura"
        description="Area para consultar rodadas anteriores, arquivos usados, responsaveis e resultados publicados."
        eyebrow="Historico"
        title="Execucoes de alocacao"
      />

      <div className="panel-grid">
        <InfoPanel title="Por que existe">
          <p>
            Uma plataforma institucional precisa permitir auditoria: quem rodou,
            quando rodou, quais arquivos foram usados e qual resultado foi
            considerado valido.
          </p>
        </InfoPanel>

        <InfoPanel title="Backend necessario">
          <DependencyList
            items={[
              "Persistencia das rodadas de alocacao.",
              "Usuario responsavel por cada execucao.",
              "Arquivos de entrada vinculados a cada rodada.",
              "Resultado, logs, erros e versao do algoritmo utilizado.",
            ]}
          />
        </InfoPanel>
      </div>

      <section className="empty-state-panel">
        <History aria-hidden="true" size={28} />
        <div>
          <strong>Historico ainda nao persistido</strong>
          <p>
            Esta tela fica pronta visualmente, mas depende do backend salvar e
            expor as execucoes para consulta.
          </p>
        </div>
        <ScrollText aria-hidden="true" className="empty-state-mark" size={72} />
      </section>
    </div>
  );
}
