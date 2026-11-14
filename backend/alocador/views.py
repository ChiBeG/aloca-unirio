from __future__ import annotations

import json
from pathlib import Path

from django.http import HttpRequest, JsonResponse

from contas.permissoes import pode_ajustar, requer_acesso

from .alocacao import executar_alocacao


BASE_DIR = Path(__file__).resolve().parent.parent
ENTRADA_DIR = BASE_DIR / "entrada"

_DEFAULTS = {
    "predios": "unirio-predios.csv",
    "salas": "unirio-salas.csv",
    "disciplinas": "unirio-disciplinas-20252.csv",
}


_MAX_AJUSTES = 1000


def _inteiro(valor) -> bool:
    return isinstance(valor, int) and not isinstance(valor, bool)


def _movimento_valido(mov) -> bool:
    return isinstance(mov, dict) and _inteiro(mov.get("disciplina")) and _inteiro(mov.get("sala"))


def _validar_ajustes(bruto) -> list[dict] | None:
    """Normaliza a lista de ajustes manuais. Devolve None se o formato for inválido."""
    if bruto is None:
        return []
    if not isinstance(bruto, list) or len(bruto) > _MAX_AJUSTES:
        return None
    ajustes = []
    for op in bruto:
        if not _movimento_valido(op):
            return None
        realocacoes = op.get("realocacoes") or []
        if not isinstance(realocacoes, list) or not all(_movimento_valido(r) for r in realocacoes):
            return None
        nome = op.get("nome")
        if nome is not None and not isinstance(nome, str):
            return None
        ajustes.append({
            "disciplina": op["disciplina"],
            "sala": op["sala"],
            "nome": nome,
            "realocacoes": [{"disciplina": r["disciplina"], "sala": r["sala"]} for r in realocacoes],
        })
    return ajustes


@requer_acesso
def index(request: HttpRequest) -> JsonResponse:
    csvs = sorted([p.name for p in ENTRADA_DIR.glob("*.csv")]) if ENTRADA_DIR.exists() else []
    return JsonResponse({"csvs": csvs, "defaults": _DEFAULTS})


@requer_acesso
def alocar(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"error": "Use POST."}, status=405)

    try:
        data: dict = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "JSON inválido."}, status=400)

    predios = data.get("predios") or _DEFAULTS["predios"]
    salas = data.get("salas") or _DEFAULTS["salas"]
    disciplinas = data.get("disciplinas") or _DEFAULTS["disciplinas"]

    predios_path = ENTRADA_DIR / predios
    salas_path = ENTRADA_DIR / salas
    disciplinas_path = ENTRADA_DIR / disciplinas

    for p in (predios_path, salas_path, disciplinas_path):
        if not p.exists():
            return JsonResponse({"error": f"Arquivo não encontrado: {p.name}"}, status=400)

    ajustes = _validar_ajustes(data.get("ajustes"))
    if ajustes is None:
        return JsonResponse({"error": "Formato inválido em 'ajustes'."}, status=400)
    if ajustes and not pode_ajustar(request.user):
        return JsonResponse(
            {"error": "Seu papel não permite ajustes manuais na alocação."}, status=403
        )

    try:
        result = executar_alocacao(predios_path, salas_path, disciplinas_path, ajustes)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse(result)
