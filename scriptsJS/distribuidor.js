//
// Cria a grade horária para todas as salas de aula
//
export function criaGradesHorarias(salas) {
    for (const sala of salas) {
        sala.grade = criaGradeHoraria();
    }
}

//
// Cria a grade horária para uma sala de aula
//
function criaGradeHoraria() {
    const grade = [];

    for (let i = 0; i < 5; i++) {
        const gradeDia = [];

        for (let j = 7; j < 22; j++) {
            gradeDia.push(null);
        }
        grade.push(gradeDia);
    }

    return grade;
}

//
// Distribui as disciplinas com salas fixas nas grades horárias das salas de aula
//
export function distribuiDisciplinasSalaFixa(salas, disciplinas) {
    for (const disciplina of disciplinas) {
        preencheGradeHoraria(disciplina.salaFixa, disciplina.diaSemana, disciplina.horaInicio, disciplina.horaFim, disciplina);
    }
}

//
// Distribui uma disciplina em uma sala de aula
//
function preencheGradeHoraria(sala, diaSemana, horaInicio, horaFim, disciplina) {
    const indiceDiaSemana = diaSemana - 2;

    for (let hora = horaInicio; hora < horaFim; hora++) {
        const indiceHora = hora - 7;

        if (sala.grade[indiceDiaSemana][indiceHora]) {
            const disciplinaExistente = sala.grade[indiceDiaSemana][indiceHora];
            console.warn(`Conflito detectado: A sala ${sala.codigo} já tem a disciplina ${disciplinaExistente.disciplina} alocada no dia ${diaSemana} às ${hora}h. A disciplina ${disciplina.disciplina} não pode ser alocada nesse horário.`);
        } else {
            sala.grade[indiceDiaSemana][indiceHora] = disciplina;
        }
    }
}

//
// Distribui as disciplinas sem salas fixas
//
export function distribuiDisciplinasSemSalaFixa(salas, disciplinasPendentes, disciplinasResolvidas) {
    for (var diaSemana = 2; diaSemana <= 6; diaSemana++) {
        var disciplinasPendentesDiaSemana = disciplinasPendentes.filter(d => d.diaSemana === diaSemana);
        distribuiDisciplinasSemSalaFixaDiaSemana(diaSemana, salas, disciplinasPendentesDiaSemana, disciplinasResolvidas)
    }
}

//
// Distribui as disciplinas sem salas fixas para um dia da semana
//
function distribuiDisciplinasSemSalaFixaDiaSemana(diaSemana, salas, disciplinasPendentes, disciplinasResolvidas) {
    var disciplinasPendentesManha = disciplinasPendentes.filter(d => d.horaInicio < 12);
    const salasAlgumHorarioLivreManha = salas.filter(sala => verificaSalaAlgumHorarioLivreDiaSemanaTurno(sala, diaSemana, 7, 12));
    const salasTodosHorariosLivresManha = salas.filter(sala => verificaSalaTodosHorariosLivresDiaSemanaTurno(sala, diaSemana, 7, 12));
    console.log(`${diaSemana}a, Manhã: ${disciplinasPendentesManha.length} disciplinas pendentes, ${salasAlgumHorarioLivreManha.length} salas com algum horário livre, ${salasTodosHorariosLivresManha.length} salas com todos os horários livres.`);
    distribuiDisciplinasSemSalaFixaDiaSemanaTurno(diaSemana, "manhã", salas, disciplinasPendentesManha, disciplinasResolvidas)

    var disciplinasPendentesTarde = disciplinasPendentes.filter(d => d.horaInicio >= 12 && d.horaInicio < 18);
    const salasAlgumHorarioLivreTarde = salas.filter(sala => verificaSalaAlgumHorarioLivreDiaSemanaTurno(sala, diaSemana, 12, 18));
    const salasTodosHorariosLivresTarde = salas.filter(sala => verificaSalaTodosHorariosLivresDiaSemanaTurno(sala, diaSemana, 12, 18));
    console.log(`${diaSemana}a, Tarde: ${disciplinasPendentesTarde.length} disciplinas pendentes, ${salasAlgumHorarioLivreTarde.length} salas com algum horário livre, ${salasTodosHorariosLivresTarde.length} salas com todos os horários livres.`);
    distribuiDisciplinasSemSalaFixaDiaSemanaTurno(diaSemana, "tarde", salas, disciplinasPendentesTarde, disciplinasResolvidas)

    var disciplinasPendentesNoite = disciplinasPendentes.filter(d => d.horaInicio >= 18);
    const salasAlgumHorarioLivreNoite = salas.filter(sala => verificaSalaAlgumHorarioLivreDiaSemanaTurno(sala, diaSemana, 18, 22));
    const salasTodosHorariosLivresNoite = salas.filter(sala => verificaSalaTodosHorariosLivresDiaSemanaTurno(sala, diaSemana, 18, 22));
    console.log(`${diaSemana}a, Noite: ${disciplinasPendentesNoite.length} disciplinas pendentes, ${salasAlgumHorarioLivreNoite.length} salas com algum horário livre, ${salasTodosHorariosLivresNoite.length} salas com todos os horários livres.`);
    distribuiDisciplinasSemSalaFixaDiaSemanaTurno(diaSemana, "noite", salas, disciplinasPendentesNoite, disciplinasResolvidas)
}

//
// Distribui as disciplinas sem salas fixas para um dia da semana e um turno
//
function distribuiDisciplinasSemSalaFixaDiaSemanaTurno(diaSemana, turno, salas, disciplinasPendentes, disciplinasResolvidas) {
    for (const disciplina of disciplinasPendentes) {
        const salasPossiveis = salas.filter(sala => salaPermiteDisciplina(sala, disciplina));

        if (salasPossiveis.length === 0) {
            console.warn(`Nenhuma sala disponível para a disciplina '${disciplina.disciplina}' na ${disciplina.diaSemana}a das ${disciplina.horaInicio}h às ${disciplina.horaFim}h.`);
        }
        else {
            const salasMesmoPredio = salasPossiveis.filter(sala => sala.predio === disciplina.predioOrigem);

            if (salasMesmoPredio.length > 0) {
                let salaSelecionada = pegaSalaProfessor(salasMesmoPredio, disciplina.professor);

                if (!salaSelecionada) {
                    salaSelecionada = salasMesmoPredio[0];
                }

                preencheGradeHoraria(salaSelecionada, disciplina.diaSemana, disciplina.horaInicio, disciplina.horaFim, disciplina);
                disciplinasResolvidas.push(disciplina);
            }
            else {
                let salaSelecionada = pegaSalaProfessor(salasPossiveis, disciplina.professor);

                if (!salaSelecionada) {
                    salaSelecionada = salasPossiveis[0];
                }

                preencheGradeHoraria(salaSelecionada, disciplina.diaSemana, disciplina.horaInicio, disciplina.horaFim, disciplina);
                disciplinasResolvidas.push(disciplina);
            }
        }
    }
}

//
// Retorna uma sala onde um professor já esteja lecionando
//
function pegaSalaProfessor(salas, professor) {
    for (const sala of salas) {
        for (let diaSemana = 2; diaSemana <= 6; diaSemana++) {
            for (let hora = 7; hora < 22; hora++) {
                const disciplina = sala.grade[diaSemana - 2][hora - 7];

                if (disciplina) {
                    if (disciplina.professor === professor) {
                        return sala;
                    }
                }
            }
        }
    }

    return null;
}

//
// Verifica se uma sala pode receber uma disciplina em um horário
//
function salaPermiteDisciplina(sala, disciplina) {
    if (sala.capacidade < disciplina.numeroAlunos) {
        return false;
    }

    const indiceDiaSemana = disciplina.diaSemana - 2;

    for (let hora = disciplina.horaInicio; hora < disciplina.horaFim; hora++) {
        const indiceHora = hora - 7;

        if (sala.grade[indiceDiaSemana][indiceHora]) {
            return false;
        }
    }

    return true;
}

//
// Verifica se uma sala possui algum horário livre em um dia da semana e turno
//
function verificaSalaAlgumHorarioLivreDiaSemanaTurno(sala, diaSemana, horaInicio, horaFim) {
    const indiceDiaSemana = diaSemana - 2;

    for (let hora = horaInicio; hora < horaFim; hora++) {
        const indiceHora = hora - 7;

        if (!sala.grade[indiceDiaSemana][indiceHora]) {
            return true;
        }
    }

    return false;
}

//
// Verifica se uma sala possui todos os horários livre em um dia da semana e turno
//
function verificaSalaTodosHorariosLivresDiaSemanaTurno(sala, diaSemana, horaInicio, horaFim) {
    const indiceDiaSemana = diaSemana - 2;

    for (let hora = horaInicio; hora < horaFim; hora++) {
        const indiceHora = hora - 7;

        if (sala.grade[indiceDiaSemana][indiceHora]) {
            return false;
        }
    }

    return true;
}