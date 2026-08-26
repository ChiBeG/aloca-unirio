import fs from 'fs';

/// Sala
/// - codigo: número inteiro
/// - nome: string
/// - predio: referência a um prédio
/// - capacidade: número inteiro

///
/// Carrega as salas a partir de um arquivo CSV
///
export function carregaSalas(nomeArquivo, predios) {
    let salas = []
    
    try {
        const conteudo = fs.readFileSync(nomeArquivo, 'utf-8')
        const linhas = conteudo.split('\n')

        for (let i = 1; i < linhas.length; i++) {
            const linha = linhas[i].trim()

            if (linha != '' && !linha.startsWith('#')) {
                const [sCodigo, nome, sCodigoPredio, sCapacidade] = linha.split(';')
                var codigo = parseInt(sCodigo.trim())
                var capacidade = parseInt(sCapacidade.trim())

                var codigoPredio = parseInt(sCodigoPredio.trim())
                var predio = predios.find(p => p.codigo == codigoPredio)

                if (!predio) {
                    throw new Error(`O prédio com código ${codigoPredio}, mencionado na sala ${codigo}, não foi encontrado.`)
                }

                salas.push({ codigo: codigo, nome: nome.trim(), predio: predio, capacidade: capacidade })
            }
        }

        return salas

    } catch (error) {
        console.error(`Erro de leitura no arquivo de salas: ${error}`)
        return []
    }
}