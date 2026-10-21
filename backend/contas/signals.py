import logging

from django.conf import settings
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Perfil

logger = logging.getLogger(__name__)


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def criar_perfil(sender, instance, created, **kwargs) -> None:
    if created:
        Perfil.objects.get_or_create(usuario=instance)


@receiver(user_logged_in)
def registrar_login(sender, request, user, **kwargs) -> None:
    logger.info("Login: usuario=%s ip=%s", user.get_username(), request.META.get("REMOTE_ADDR"))


@receiver(user_logged_out)
def registrar_logout(sender, request, user, **kwargs) -> None:
    if user is not None:
        logger.info("Logout: usuario=%s ip=%s", user.get_username(), request.META.get("REMOTE_ADDR"))
