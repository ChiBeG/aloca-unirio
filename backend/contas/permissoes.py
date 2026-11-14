from functools import wraps

from django.http import JsonResponse

from .models import Papel, Perfil

# Papéis que podem fazer ajustes manuais na alocação (RF07).
PAPEIS_AJUSTE = {Papel.OPERADOR, Papel.DIRETOR, Papel.ADMIN_SUPERIOR}


def pode_ajustar(usuario) -> bool:
    if not usuario.is_authenticated:
        return False
    perfil, _ = Perfil.objects.get_or_create(usuario=usuario)
    return perfil.tem_acesso and perfil.papel in PAPEIS_AJUSTE


def requer_acesso(view):
    """Exige usuário autenticado e com papel atribuído. Responde em JSON (401/403)."""

    @wraps(view)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Autenticação necessária."}, status=401)
        perfil, _ = Perfil.objects.get_or_create(usuario=request.user)
        if not perfil.tem_acesso:
            return JsonResponse(
                {"error": "Acesso pendente: aguarde a atribuição de um papel."}, status=403
            )
        return view(request, *args, **kwargs)

    return wrapper
