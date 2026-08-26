import { DatabaseZap, FileCheck2 } from "lucide-react";

import {
  DependencyList,
  InfoPanel,
  PageHeader,
} from "@/components/platform-page";

export default function ImportPage() {
  return (
    <div className="route-shell">
      <PageHeader
        badge="Preparado para API"
        description="Area reservada para envio, validacao e conferencia dos CSVs antes de executar uma rodada de alocacao."
        eyebrow="Importacao"
        title="Arquivos de entrada"
      />

      <div className="panel-grid">
        <InfoPanel title="Como funciona hoje">
          <p>
            O sistema ainda nao aceita upload pelo navegador. Para usar um CSV
            diferente, coloque o arquivo na pasta <code>backend/entrada/</code> —
            ele sera listado automaticamente na tela de alocacao.
          </p>
        </InfoPanel>

        <InfoPanel title="Backend necessario">
          <DependencyList
            items={[
              "Endpoint de upload para predios, salas e disciplinas.",
              "Validacao de colunas obrigatorias e formato dos horarios.",
              "Resposta estruturada com erros linha a linha.",
              "Controle de versao dos arquivos usados em cada rodada.",
            ]}
          />
        </InfoPanel>
      </div>

      <section className="empty-state-panel">
        <FileCheck2 aria-hidden="true" size={28} />
        <div>
          <strong>Fluxo futuro de conferencia</strong>
          <p>
            Esta tela deve mostrar arquivos recebidos, alertas de formato e
            liberacao para executar a alocacao quando o backend expuser esses
            dados.
          </p>
        </div>
        <DatabaseZap aria-hidden="true" className="empty-state-mark" size={72} />
      </section>
    </div>
  );
}
