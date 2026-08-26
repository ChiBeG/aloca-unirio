from __future__ import annotations

import json
from pathlib import Path

from django.http import HttpRequest, JsonResponse

from .alocacao import executar_alocacao


BASE_DIR = Path(__file__).resolve().parent.parent
ENTRADA_DIR = BASE_DIR / "entrada"

_DEFAULTS = {
    "predios": "unirio-predios.csv",
    "salas": "unirio-salas.csv",
    "disciplinas": "unirio-disciplinas-20252.csv",
}


def index(request: HttpRequest) -> JsonResponse:
    csvs = sorted([p.name for p in ENTRADA_DIR.glob("*.csv")]) if ENTRADA_DIR.exists() else []
    return JsonResponse({"csvs": csvs, "defaults": _DEFAULTS})


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

    try:
        result = executar_alocacao(predios_path, salas_path, disciplinas_path)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse(result)
