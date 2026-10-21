from django.contrib.auth import logout
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from .models import Perfil


@require_GET
@ensure_csrf_cookie
def me(request: HttpRequest) -> JsonResponse:
    """Usuário da sessão atual. Também garante o cookie csrftoken para os POSTs do frontend."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Autenticação necessária."}, status=401)

    perfil, _ = Perfil.objects.get_or_create(usuario=request.user)
    return JsonResponse(
        {
            "email": request.user.email,
            "nome": request.user.get_full_name() or request.user.get_username(),
            "papel": perfil.papel or None,
            "papelLabel": perfil.get_papel_display() or None,
            "temAcesso": perfil.tem_acesso,
        }
    )


@require_POST
def sair(request: HttpRequest) -> JsonResponse:
    logout(request)
    return JsonResponse({"ok": True})
