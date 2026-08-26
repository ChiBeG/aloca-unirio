import fs from "fs";

//
// Salva as grades horárias das salas de aula em formato HTML
//
export function salvaGradesHorarias(diretorioBase, salas) {
    var conteudo = 
        `<html>
            <head>
                <meta charset="UTF-8">
                <title>Grades Horárias</title>
                <style>
                    body { font-family: 'Helvetica'; }
                    table.grade-sala { border: 1px solid gray; font-size: 12px; width: 100%; margin-bottom: 64px; }
                    table.grade-sala td, table.grade-sala th { border-bottom: 1px solid gray; border-left: 1px solid gray; height: 48px; vertical-align: top; }
                    table.grade-sala tr th.hora { text-align: left; background-color: lightblue; width: 5%; }
                    table.grade-sala tr th.dia-semana { text-align: center; background-color: lightblue; width: 19%; }
                    table.grade-sala tr td.hora { text-align: left; background-color: lightblue; }
                    table.grade-sala tr td.vazia { background-color: #eee; }
                    table.grade-sala tr td div.nome-disciplina { }
                    table.grade-sala tr td div.professor { color: navy; margin-top: 3px; font-size: 10px; }
                </style>
            </head>
            <body>`;

    for (const sala of salas) {
        const conteudoSala = salvaGradeHorariaSala(sala);
        conteudo += conteudoSala;
    }

    conteudo += '</body></html>';
    const nomeArquivo = `${diretorioBase}\\saida\\grades_horarias.html`;
    fs.writeFileSync(nomeArquivo, conteudo, 'utf-8');
}

//
// Salva a grade horária de uma sala de aula em formato HTML
//
function salvaGradeHorariaSala(sala) {
    let conteudo = `<h2>Sala ${sala.predio.nome}-${sala.nome}</h2>`;
    
    conteudo += `<table cellspacing="0" cellpadding="5" class="grade-sala">`;
    
    conteudo += 
        `<tr>
            <th class="hora">Hora</th>
            <th class="dia-semana">Segunda</th>
            <th class="dia-semana">Terça</th>
            <th class="dia-semana">Quarta</th>
            <th class="dia-semana">Quinta</th>
            <th class="dia-semana">Sexta</th>
        </tr>`; 
    
    for (let hora = 7; hora < 22; hora++) {
        conteudo += `<tr><td class="hora">${hora}h</td>`;
        
        for (let dia = 2; dia <= 6; dia++) {
            const disciplina = sala.grade[dia - 2][hora - 7];

            if (disciplina) {
                var disciplinaAnterior = (hora > 7) ? sala.grade[dia - 2][hora - 7 - 1] : null;

                if (disciplinaAnterior != disciplina) {
                    let contador = 1

                    for (let horaFim = hora + 1; horaFim < 22; horaFim++) {
                        const disciplinaComparacao = sala.grade[dia - 2][horaFim - 7];
                        
                        if (disciplinaComparacao != disciplina) {
                            break;
                        }

                        contador++;
                    }

                    conteudo += 
                        `<td class="dia-semana" rowspan="${contador}">
                            <div class="nome-disciplina">${disciplina ? disciplina.disciplina : ''}</div>
                            <div class="professor">${disciplina ? disciplina.professor : ''}</div>
                        </td>`;
                }
            }
            else {
                conteudo += 
                    `<td class="dia-semana vazia"></td>`;
            }
        }
        
        conteudo += `</tr>`;
    }
    
    conteudo += `</table>`;
    return conteudo;
}