import fs from 'fs';

/// Disciplina
/// - codigoEscola: número inteiro
/// - predioOrigem: referencia a um prédio
/// - curso: string
/// - disciplina: string
/// - vagas: número inteiro
/// - periodo: número inteiro
/// - professor: string
/// - siape: string
/// - diaSemana: número inteiro (1-7)
/// - horaInicio: número inteiro (0-23)
/// - horaFim: número inteiro (0-23)
/// - salaFixa: referencia a uma sala (opcional)

///
/// Carrega as disciplinas a partir de um arquivo CSV
///
export function carregaDisciplinas(nomeArquivo, salas, predios) {
    let disciplinas = []
    
    try {
        const conteudo = fs.readFileSync(nomeArquivo, 'utf-8');
        const linhas = conteudo.split('\n');

        for (let i = 1; i < linhas.length; i++) {
            const linha = linhas[i].trim();

            if (linha != '' && !linha.startsWith('#')) {
                const [sCodigoEscola, sCodigoPredio, curso, disciplina, sVagas, sPeriodo, professor, siape, sDiaSemana, sHoraInicio, sHoraFim, sCodigoSalaFixa] = linha.split(';');

                var codigoEscola = parseInt(sCodigoEscola.trim());

                var codigoPredio = parseInt(sCodigoPredio.trim());
                var predio = predios.find(p => p.codigo == codigoPredio);

                if (!predio) {
                    throw new Error(`O prédio com código ${codigoPredio}, mencionado na disciplina ${disciplina}, do curso ${curso}, não foi encontrado.`);
                }

                var vagas = parseInt(sVagas.trim());
                var periodo = parseInt(sPeriodo.trim());
                var diaSemana = parseInt(sDiaSemana.trim());
                var horaInicio = parseInt(sHoraInicio.trim());
                var horaFim = parseInt(sHoraFim.trim());
                var salaFixa = null;

                if (sCodigoSalaFixa && sCodigoSalaFixa.trim() != '' && sCodigoSalaFixa.trim() != '0') {
                    var codigoSalaFixa = parseInt(sCodigoSalaFixa.trim());
                    salaFixa = salas.find(s => s.codigo == codigoSalaFixa) || null;

                    if (!salaFixa) {
                        throw new Error(`A sala com código ${codigoSalaFixa}, mencionada na disciplina ${disciplina}, do curso ${curso}, não foi encontrada.`);
                    }
                }

                disciplinas.push({
                    codigoEscola: codigoEscola,
                    predioOrigem: predio,
                    curso: curso.trim(),
                    disciplina: disciplina.trim(),
                    vagas: vagas,
                    periodo: periodo,
                    professor: professor.trim(),
                    siape: siape.trim(),
                    diaSemana: diaSemana,
                    horaInicio: horaInicio,
                    horaFim: horaFim,
                    salaFixa: salaFixa
                });
            }
        }

        return disciplinas;

    } catch (error) {
        console.error(`Erro de leitura no arquivo de disciplinas: ${error}`);
        return [];
    }
}