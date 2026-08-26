from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class Predio:
    codigo: int
    nome: str


@dataclass
class Sala:
    codigo: int
    nome: str
    predio: Predio
    capacidade: int
    grade: list = field(default_factory=list)


@dataclass
class Disciplina:
    codigo_escola: int
    predio_origem: Predio
    curso: str
    disciplina: str
    vagas: int
    periodo: int
    professor: str
    siape: str
    dia_semana: int
    hora_inicio: int
    hora_fim: int
    sala_fixa: Optional[Sala]


# ---------------------------------------------------------------------------
# CSV loaders
# ---------------------------------------------------------------------------

def _linhas_csv(caminho: Path) -> list[str]:
    texto = caminho.read_text(encoding="utf-8")
    return [
        l.strip()
        for l in texto.splitlines()[1:]
        if l.strip() and not l.strip().startswith("#")
    ]


def carregar_predios(caminho: Path) -> list[Predio]:
    predios = []
    for linha in _linhas_csv(caminho):
        partes = linha.split(";")
        predios.append(Predio(codigo=int(partes[0].strip()), nome=partes[1].strip()))
    return predios


def carregar_salas(caminho: Path, predios: list[Predio]) -> list[Sala]:
    salas = []
    for linha in _linhas_csv(caminho):
        partes = linha.split(";")
        codigo = int(partes[0].strip())
        nome = partes[1].strip()
        codigo_predio = int(partes[2].strip())
        capacidade = int(partes[3].strip())
        predio = next((p for p in predios if p.codigo == codigo_predio), None)
        if not predio:
            raise ValueError(f"Prédio {codigo_predio} não encontrado para sala {codigo}")
        grade = [[None] * 15 for _ in range(5)]  # grade[dia 0-4][hora 0-14]
        salas.append(Sala(codigo=codigo, nome=nome, predio=predio, capacidade=capacidade, grade=grade))
    return salas


def carregar_disciplinas(caminho: Path, salas: list[Sala], predios: list[Predio]) -> list[Disciplina]:
    disciplinas = []
    for linha in _linhas_csv(caminho):
        partes = linha.split(";")
        codigo_escola = int(partes[0].strip())
        codigo_predio = int(partes[1].strip())
        curso = partes[2].strip()
        nome = partes[3].strip()
        vagas = int(partes[4].strip())
        periodo = int(partes[5].strip())
        professor = partes[6].strip()
        siape = partes[7].strip()
        dia_semana = int(partes[8].strip())
        hora_inicio = int(partes[9].strip())
        hora_fim = int(partes[10].strip())

        predio = next((p for p in predios if p.codigo == codigo_predio), None)
        if not predio:
            raise ValueError(f"Prédio {codigo_predio} não encontrado para disciplina '{nome}'")

        sala_fixa = None
        if len(partes) > 11:
            raw = partes[11].strip()
            if raw and raw != "0":
                codigo_sf = int(raw)
                sala_fixa = next((s for s in salas if s.codigo == codigo_sf), None)
                if not sala_fixa:
                    raise ValueError(f"Sala {codigo_sf} não encontrada para disciplina '{nome}'")

        disciplinas.append(Disciplina(
            codigo_escola=codigo_escola,
            predio_origem=predio,
            curso=curso,
            disciplina=nome,
            vagas=vagas,
            periodo=periodo,
            professor=professor,
            siape=siape,
            dia_semana=dia_semana,
            hora_inicio=hora_inicio,
            hora_fim=hora_fim,
            sala_fixa=sala_fixa,
        ))
    return disciplinas


# ---------------------------------------------------------------------------
# Allocation  (dias: 2=Seg … 6=Sex; horas absolutas: 7–21)
# ---------------------------------------------------------------------------

def _preenche_grade(sala: Sala, dia_semana: int, hora_inicio: int, hora_fim: int, disciplina: Disciplina) -> None:
    idx_dia = dia_semana - 2
    for hora in range(hora_inicio, hora_fim):
        idx_hora = hora - 7
        if sala.grade[idx_dia][idx_hora] is not None:
            existente = sala.grade[idx_dia][idx_hora]
            print(f"Conflito: sala {sala.codigo} já tem '{existente.disciplina}' dia {dia_semana} {hora}h — '{disciplina.disciplina}' ignorada.")
        else:
            sala.grade[idx_dia][idx_hora] = disciplina


def _sala_permite_disciplina(sala: Sala, disciplina: Disciplina) -> bool:
    if sala.capacidade < disciplina.vagas:
        return False
    idx_dia = disciplina.dia_semana - 2
    for hora in range(disciplina.hora_inicio, disciplina.hora_fim):
        if sala.grade[idx_dia][hora - 7] is not None:
            return False
    return True


def _pega_sala_professor(salas: list[Sala], professor: str) -> Optional[Sala]:
    for sala in salas:
        for dia in range(5):
            for hora in range(15):
                d = sala.grade[dia][hora]
                if d and d.professor == professor:
                    return sala
    return None


_DIAS = {2: "Segunda", 3: "Terça", 4: "Quarta", 5: "Quinta", 6: "Sexta"}


def _distribuir_turno(
    dia_semana: int,
    salas: list[Sala],
    pendentes: list[Disciplina],
    resolvidas: list[Disciplina],
    conflitos: list[str],
) -> None:
    for disciplina in pendentes:
        possiveis = [s for s in salas if _sala_permite_disciplina(s, disciplina)]
        if not possiveis:
            conflitos.append(
                f"{disciplina.disciplina} ({disciplina.curso}) — "
                f"{_DIAS.get(dia_semana, str(dia_semana))}, "
                f"{disciplina.hora_inicio}h–{disciplina.hora_fim}h"
            )
            continue
        mesmo_predio = [s for s in possiveis if s.predio is disciplina.predio_origem]
        candidatas = mesmo_predio or possiveis
        sala = _pega_sala_professor(candidatas, disciplina.professor) or candidatas[0]
        _preenche_grade(sala, disciplina.dia_semana, disciplina.hora_inicio, disciplina.hora_fim, disciplina)
        resolvidas.append(disciplina)


def _distribuir_sem_sala_fixa(
    salas: list[Sala],
    pendentes: list[Disciplina],
    resolvidas: list[Disciplina],
    conflitos: list[str],
) -> None:
    for dia in range(2, 7):
        dia_pendentes = [d for d in pendentes if d.dia_semana == dia]
        manha = [d for d in dia_pendentes if d.hora_inicio < 12]
        tarde = [d for d in dia_pendentes if 12 <= d.hora_inicio < 18]
        noite = [d for d in dia_pendentes if d.hora_inicio >= 18]
        _distribuir_turno(dia, salas, manha, resolvidas, conflitos)
        _distribuir_turno(dia, salas, tarde, resolvidas, conflitos)
        _distribuir_turno(dia, salas, noite, resolvidas, conflitos)


# ---------------------------------------------------------------------------
# HTML generator
# ---------------------------------------------------------------------------

def _html_sala(sala: Sala) -> str:
    partes = [
        f'<h2 data-predio="{sala.predio.nome}">Sala {sala.predio.nome}-{sala.nome}</h2>',
        '<table cellspacing="0" cellpadding="5" class="grade-sala">',
        '<tr>'
        '<th class="hora">Hora</th>'
        '<th class="dia-semana">Segunda</th>'
        '<th class="dia-semana">Ter&ccedil;a</th>'
        '<th class="dia-semana">Quarta</th>'
        '<th class="dia-semana">Quinta</th>'
        '<th class="dia-semana">Sexta</th>'
        '</tr>',
    ]

    for hora in range(7, 22):
        partes.append(f'<tr><td class="hora">{hora}h</td>')
        for dia in range(5):
            d = sala.grade[dia][hora - 7]
            d_ant = sala.grade[dia][hora - 8] if hora > 7 else None
            if d:
                if d is not d_ant:
                    rowspan = 1
                    for h2 in range(hora + 1, 22):
                        if sala.grade[dia][h2 - 7] is not d:
                            break
                        rowspan += 1
                    partes.append(
                        f'<td class="dia-semana" rowspan="{rowspan}"'
                        f' data-curso="{d.curso}" data-professor="{d.professor}">'
                        f'<div class="nome-disciplina">{d.disciplina}</div>'
                        f'<div class="professor">{d.professor}</div>'
                        f'</td>'
                    )
                # célula coberta pelo rowspan da hora anterior — não renderizar
            else:
                partes.append('<td class="dia-semana vazia"></td>')
        partes.append('</tr>')

    partes.append('</table>')
    return ''.join(partes)


def gerar_html(salas: list[Sala]) -> str:
    css = (
        'body{font-family:Helvetica;}'
        'table.grade-sala{border:1px solid gray;font-size:12px;width:100%;margin-bottom:64px;}'
        'table.grade-sala td,table.grade-sala th'
        '{border-bottom:1px solid gray;border-left:1px solid gray;height:48px;vertical-align:top;}'
        'table.grade-sala tr th.hora{text-align:left;background-color:lightblue;width:5%;}'
        'table.grade-sala tr th.dia-semana{text-align:center;background-color:lightblue;width:19%;}'
        'table.grade-sala tr td.hora{text-align:left;background-color:lightblue;}'
        'table.grade-sala tr td.vazia{background-color:#eee;}'
        'div.professor{color:navy;margin-top:3px;font-size:10px;}'
    )
    partes = [
        f'<html><head><meta charset="UTF-8">'
        f'<title>Grades Hor&aacute;rias</title>'
        f'<style>{css}</style></head><body>'
    ]
    for sala in salas:
        partes.append(_html_sala(sala))
    partes.append('</body></html>')
    return ''.join(partes)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def executar_alocacao(predios_path: Path, salas_path: Path, disciplinas_path: Path) -> dict:
    predios = carregar_predios(predios_path)
    salas = carregar_salas(salas_path, predios)
    disciplinas = carregar_disciplinas(disciplinas_path, salas, predios)

    com_sala_fixa = [d for d in disciplinas if d.sala_fixa]
    sem_sala_fixa = [d for d in disciplinas if not d.sala_fixa]

    for d in com_sala_fixa:
        _preenche_grade(d.sala_fixa, d.dia_semana, d.hora_inicio, d.hora_fim, d)

    conflitos: list[str] = []
    _distribuir_sem_sala_fixa(salas, sem_sala_fixa, list(com_sala_fixa), conflitos)

    return {
        "html": gerar_html(salas),
        "cursos": sorted({d.curso for d in disciplinas if d.curso}),
        "professores": sorted({d.professor for d in disciplinas if d.professor}),
        "conflitos": conflitos,
    }
