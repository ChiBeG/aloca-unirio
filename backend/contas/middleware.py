"""Login desativado para desenvolvimento local (AUTH_DESATIVADA=true).

Só entra no MIDDLEWARE quando a variável está ligada, e o settings recusa a
combinação com cookies seguros (produção). Quem não está logado vira o usuário
de desenvolvimento, que nasce como Operador; o papel pode ser trocado no admin
para testar outros perfis. Um login real (por exemplo, no admin) tem prioridade.
"""

from django.contrib.auth import get_user_model

from .models import Papel, Perfil

USUARIO_DEV = "dev-local"


def usuario_desenvolvimento():
    usuario, criado = get_user_model().objects.get_or_create(
        username=USUARIO_DEV,
        defaults={"email": "dev-local@edu.unirio.br", "first_name": "Dev (login desativado)"},
    )
    if criado:
        usuario.set_unusable_password()
        usuario.save(update_fields=["password"])
    perfil, _ = Perfil.objects.get_or_create(usuario=usuario)
    if criado or not perfil.papel:
        perfil.papel = Papel.OPERADOR
        perfil.save(update_fields=["papel", "atualizado_em"])
    return usuario


class LoginDesativadoMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.user.is_authenticated:
            request.user = usuario_desenvolvimento()
        return self.get_response(request)
