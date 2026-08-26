import fs from 'fs'

/// Prédio
/// - codigo: número inteiro
/// - nome: string

///
/// Carrega os predios a partir de um arquivo CSV
///
export function carregaPredios(nomeArquivo) {
    let predios = []
    
    try {
        const conteudo = fs.readFileSync(nomeArquivo, 'utf-8')
        const linhas = conteudo.split('\n')

        for (let i = 1; i < linhas.length; i++) {
            const linha = linhas[i].trim()

            if (linha != '' && !linha.startsWith('#')) {
                const [scodigo, nome] = linha.split(';')
                var codigo = parseInt(scodigo.trim())
                predios.push({ codigo: codigo, nome: nome.trim() })
            }
        }

        return predios
    } catch (error) {
        console.error(`Erro de leitura no arquivo de predios: ${error}`)
        return []
    }
}