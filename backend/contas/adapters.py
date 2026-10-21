import logging

from allauth.core.exceptions import ImmediateHttpResponse
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings
from django.http import HttpRequest, HttpResponseRedirect

logger = logging.getLogger(__name__)


def email_institucional_valido(dados: dict) -> bool:
    """Confere os claims do Google: conta do Workspace da UNIRIO e e-mail verificado."""
    dominio = settings.ALLOWED_EMAIL_DOMAIN
    email = (dados.get("email") or "").strip().lower()
    return (
        dados.get("hd") == dominio
        and dados.get("email_verified") in (True, "true")
        and email.endswith("@" + dominio)
    )


class UnirioSocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request: HttpRequest, sociallogin) -> None:
        dados = sociallogin.account.extra_data or {}
        if not email_institucional_valido(dados):
            logger.warning(
                "Login recusado: email=%s hd=%s ip=%s",
                dados.get("email"),
                dados.get("hd"),
                request.META.get("REMOTE_ADDR"),
            )
            raise ImmediateHttpResponse(
                HttpResponseRedirect(settings.FRONTEND_URL + "/login?erro=dominio")
            )
        super().pre_social_login(request, sociallogin)
