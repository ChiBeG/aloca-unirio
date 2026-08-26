import { carregaPredios } from "./predio.js";
import { carregaSalas } from "./sala.js";
import { carregaDisciplinas } from "./disciplina.js";
import { criaGradesHorarias, distribuiDisciplinasSalaFixa, distribuiDisciplinasSemSalaFixa } from "./distribuidor.js";
import { salvaGradesHorarias } from "./publicador.js";

const DIRETORIO_BASE = "C:\\Users\\marci\\Desktop\\Codigos\\unirio-alocador";

//
// Programa principal
//
function main() {
    const predios = carregaPredios(DIRETORIO_BASE + '\\entrada\\unirio-predios.csv');
    console.log(`${predios.length} predios carregados.`);

    const salas = carregaSalas(DIRETORIO_BASE + '\\entrada\\unirio-salas.csv', predios);
    console.log(`${salas.length} salas carregadas.`);

    const disciplinas = carregaDisciplinas(DIRETORIO_BASE + '\\entrada\\unirio-disciplinas-20252.csv', salas, predios);
    console.log(`${disciplinas.length} disciplinas carregadas.`);

    console.log(`Criando as grades horárias das salas.`);
    criaGradesHorarias(salas);

    var disciplinasSalaFixa = disciplinas.filter(d => d.salaFixa);
    console.log(`Distribuindo ${disciplinasSalaFixa.length} disciplinas com salas fixas.`);
    distribuiDisciplinasSalaFixa(salas, disciplinasSalaFixa);

    var disciplinasSemSalaFixa = disciplinas.filter(d => !d.salaFixa);
    console.log(`Distribuindo ${disciplinasSemSalaFixa.length} disciplinas sem salas fixas.`);
    distribuiDisciplinasSemSalaFixa(salas, disciplinasSemSalaFixa, disciplinasSalaFixa);

    console.log(`Salvando as grades horárias das salas.`);
    salvaGradesHorarias(DIRETORIO_BASE, salas);

    console.log("Fim")
}

main();