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
    # Número da linha de dados no CSV (1 = primeira). Identifica a disciplina nos ajustes manuais.
    id: int = 0
    # Sala final da disciplina (None = sem sala).
    sala: Optional[Sala] = None
    # True quando a sala veio de um ajuste manual.
    manual: bool = False


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
    for numero, linha in enumerate(_linhas_csv(caminho), start=1):
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
            id=numero,
        ))
    return disciplinas


# ---------------------------------------------------------------------------
# Allocation  (dias: 2=Seg … 6=Sex; horas absolutas: 7–21)
# ---------------------------------------------------------------------------

def _ocupantes(sala: Sala, disciplina: Disciplina) -> list[Disciplina]:
    """Disciplinas que ocupam a sala em algum horário da disciplina dada (sem repetição)."""
    idx_dia = disciplina.dia_semana - 2
    ocupantes: list[Disciplina] = []
    for hora in range(disciplina.hora_inicio, disciplina.hora_fim):
        d = sala.grade[idx_dia][hora - 7]
        if d is not None and d is not disciplina and all(d is not o for o in ocupantes):
            ocupantes.append(d)
    return ocupantes


def _colocar(sala: Sala, disciplina: Disciplina) -> bool:
    """Coloca a disciplina na sala, tudo ou nada. Não sobrepõe outra disciplina (RN02)."""
    if _ocupantes(sala, disciplina):
        return False
    idx_dia = disciplina.dia_semana - 2
    for hora in range(disciplina.hora_inicio, disciplina.hora_fim):
        sala.grade[idx_dia][hora - 7] = disciplina
    disciplina.sala = sala
    return True


def _retirar(disciplina: Disciplina) -> None:
    """Tira a disciplina da sala em que está, se houver."""
    sala = disciplina.sala
    if sala is None:
        return
    idx_dia = disciplina.dia_semana - 2
    for hora in range(disciplina.hora_inicio, disciplina.hora_fim):
        if sala.grade[idx_dia][hora - 7] is disciplina:
            sala.grade[idx_dia][hora - 7] = None
    disciplina.sala = None


def _sala_permite_disciplina(sala: Sala, disciplina: Disciplina) -> bool:
    if sala.capacidade < disciplina.vagas:
        return False
    return not _ocupantes(sala, disciplina)


def _pega_sala_professor(salas: list[Sala], professor: str) -> Optional[Sala]:
    for sala in salas:
        for dia in range(5):
            for hora in range(15):
                d = sala.grade[dia][hora]
                if d and d.professor == professor:
                    return sala
    return None


_DIAS = {2: "Segunda", 3: "Terça", 4: "Quarta", 5: "Quinta", 6: "Sexta"}


def _horario(disciplina: Disciplina) -> str:
    return (
        f"{_DIAS.get(disciplina.dia_semana, str(disciplina.dia_semana))}, "
        f"{disciplina.hora_inicio}h–{disciplina.hora_fim}h"
    )


def _distribuir_turno(salas: list[Sala], pendentes: list[Disciplina]) -> None:
    for disciplina in pendentes:
        possiveis = [s for s in salas if _sala_permite_disciplina(s, disciplina)]
        if not possiveis:
            continue  # fica sem sala; aparece em "conflitos"
        mesmo_predio = [s for s in possiveis if s.predio is disciplina.predio_origem]
        candidatas = mesmo_predio or possiveis
        sala = _pega_sala_professor(candidatas, disciplina.professor) or candidatas[0]
        _colocar(sala, disciplina)


def _distribuir_sem_sala_fixa(salas: list[Sala], pendentes: list[Disciplina]) -> None:
    for dia in range(2, 7):
        dia_pendentes = [d for d in pendentes if d.dia_semana == dia]
        manha = [d for d in dia_pendentes if d.hora_inicio < 12]
        tarde = [d for d in dia_pendentes if 12 <= d.hora_inicio < 18]
        noite = [d for d in dia_pendentes if d.hora_inicio >= 18]
        _distribuir_turno(salas, manha)
        _distribuir_turno(salas, tarde)
        _distribuir_turno(salas, noite)


# ---------------------------------------------------------------------------
# Ajustes manuais (aplicados depois da alocação automática)
#
# Cada ajuste é uma operação: {"disciplina": id, "sala": codigo, "nome"?: str,
# "realocacoes": [{"disciplina": id, "sala": codigo}, ...]}. A operação é atômica:
# ou todas as disciplinas vão para os destinos, ou nada muda. Pode violar a
# capacidade (RN01, fica marcado), mas nunca deixa duas disciplinas no mesmo
# horário da mesma sala (RN02): quem é deslocado precisa vir nas realocações.
# ---------------------------------------------------------------------------

def _rotulo_sala(sala: Sala) -> str:
    return f"{sala.predio.nome}-{sala.nome}"


def _aplicar_operacao(
    op: dict, por_id: dict[int, Disciplina], por_codigo: dict[int, Sala]
) -> Optional[str]:
    """Aplica uma operação. Devolve None se deu certo ou o motivo da recusa."""
    movimentos = [op] + list(op.get("realocacoes") or [])
    alvos: list[tuple[Disciplina, Sala]] = []
    for mov in movimentos:
        disciplina = por_id.get(mov["disciplina"])
        if disciplina is None:
            return f"Disciplina da linha {mov['disciplina']} não existe no CSV."
        sala = por_codigo.get(mov["sala"])
        if sala is None:
            return f"Sala {mov['sala']} não existe no CSV."
        if any(d is disciplina for d, _ in alvos):
            return f"'{disciplina.disciplina}' aparece duas vezes na mesma operação."
        alvos.append((disciplina, sala))

    nome = op.get("nome")
    principal = alvos[0][0]
    if nome and nome != principal.disciplina:
        return (
            f"A linha {principal.id} do CSV agora é '{principal.disciplina}', não '{nome}'. "
            "O CSV mudou desde que o ajuste foi feito."
        )

    origens = [(d, d.sala) for d, _ in alvos]
    for d, _ in alvos:
        _retirar(d)

    motivo = None
    for d, sala in alvos:
        ocupantes = _ocupantes(sala, d)
        if ocupantes:
            nomes = ", ".join(f"'{o.disciplina}' ({_horario(o)})" for o in ocupantes)
            motivo = (
                f"A sala {_rotulo_sala(sala)} está ocupada por {nomes} no horário de "
                f"'{d.disciplina}'. Escolha outra sala para quem seria deslocado."
            )
            break
        _colocar(sala, d)

    if motivo:  # desfaz: volta todo mundo para onde estava
        for d, _ in alvos:
            _retirar(d)
        for d, sala_original in origens:
            if sala_original is not None:
                _colocar(sala_original, d)
        return motivo

    for d, _ in alvos:
        d.manual = True
    return None


def aplicar_ajustes(salas: list[Sala], disciplinas: list[Disciplina], ajustes: list[dict]) -> list[dict]:
    """Aplica os ajustes em ordem. Devolve os ignorados: [{"indice", "motivo"}]."""
    por_id = {d.id: d for d in disciplinas}
    por_codigo = {s.codigo: s for s in salas}
    ignorados = []
    for indice, op in enumerate(ajustes):
        motivo = _aplicar_operacao(op, por_id, por_codigo)
        if motivo:
            ignorados.append({"indice": indice, "motivo": motivo})
    return ignorados


def _violacoes(disciplina: Disciplina) -> list[str]:
    sala = disciplina.sala
    if sala is not None and sala.capacidade < disciplina.vagas:
        return ["capacidade"]
    return []


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
                    classes = "dia-semana"
                    if d.manual:
                        classes += " manual"
                    aviso = ""
                    if _violacoes(d):
                        classes += " violacao"
                        aviso = (
                            f'<div class="aviso">&#9888; capacidade {sala.capacidade}'
                            f' &lt; {d.vagas} vagas</div>'
                        )
                    marca_manual = '<div class="marca-manual">Ajuste manual</div>' if d.manual else ""
                    partes.append(
                        f'<td class="{classes}" rowspan="{rowspan}"'
                        f' data-disciplina-id="{d.id}"'
                        f' data-curso="{d.curso}" data-professor="{d.professor}">'
                        f'<div class="nome-disciplina">{d.disciplina}</div>'
                        f'<div class="professor">{d.professor}</div>'
                        f'{marca_manual}{aviso}'
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
        'table.grade-sala tr td.manual{background-color:#eef4ff;box-shadow:inset 3px 0 0 #3b6fd6;}'
        'div.marca-manual{color:#2c55a8;margin-top:3px;font-size:10px;font-weight:bold;}'
        'table.grade-sala tr td.violacao{background-color:#fff4e0;box-shadow:inset 3px 0 0 #c77700;}'
        'div.aviso{color:#8a4b00;margin-top:3px;font-size:10px;font-weight:bold;}'
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

def _alocacao_json(d: Disciplina) -> dict:
    return {
        "id": d.id,
        "disciplina": d.disciplina,
        "curso": d.curso,
        "professor": d.professor,
        "vagas": d.vagas,
        "dia": d.dia_semana,
        "inicio": d.hora_inicio,
        "fim": d.hora_fim,
        "sala": d.sala.codigo if d.sala else None,
        "manual": d.manual,
        "violacoes": _violacoes(d),
    }


def executar_alocacao(
    predios_path: Path,
    salas_path: Path,
    disciplinas_path: Path,
    ajustes: Optional[list[dict]] = None,
) -> dict:
    predios = carregar_predios(predios_path)
    salas = carregar_salas(salas_path, predios)
    disciplinas = carregar_disciplinas(disciplinas_path, salas, predios)

    com_sala_fixa = [d for d in disciplinas if d.sala_fixa]
    sem_sala_fixa = [d for d in disciplinas if not d.sala_fixa]

    # Sala fixa que choca com outra sala fixa fica sem sala (aparece nos conflitos).
    for d in com_sala_fixa:
        _colocar(d.sala_fixa, d)

    _distribuir_sem_sala_fixa(salas, sem_sala_fixa)

    ajustes_ignorados = aplicar_ajustes(salas, disciplinas, ajustes or [])

    sem_sala = sorted(
        (d for d in disciplinas if d.sala is None),
        key=lambda d: (d.dia_semana, d.hora_inicio, d.id),
    )
    conflitos = [f"{d.disciplina} ({d.curso}) — {_horario(d)}" for d in sem_sala]

    return {
        "html": gerar_html(salas),
        "cursos": sorted({d.curso for d in disciplinas if d.curso}),
        "professores": sorted({d.professor for d in disciplinas if d.professor}),
        "conflitos": conflitos,
        "alocacoes": [_alocacao_json(d) for d in disciplinas],
        "salas": [
            {"codigo": s.codigo, "nome": s.nome, "predio": s.predio.nome, "capacidade": s.capacidade}
            for s in salas
        ],
        "ajustes_ignorados": ajustes_ignorados,
    }
