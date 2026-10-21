from django.conf import settings
from django.db import models


class Papel(models.TextChoices):
    ADMIN_SUPERIOR = "ADMIN_SUPERIOR", "Administrador Superior"
    REITORIA = "REITORIA", "Reitoria"
    DECANO = "DECANO", "Decano"
    DIRETOR = "DIRETOR", "Diretor de Escola/Faculdade"
    COORDENADOR = "COORDENADOR", "Coordenador (pós-graduação)"
    OPERADOR = "OPERADOR", "Operador do Sistema"


class Perfil(models.Model):
    """Papel do usuário no sistema. Sem papel = conta criada, mas sem acesso."""

    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="perfil"
    )
    papel = models.CharField(max_length=20, choices=Papel.choices, blank=True, default="")
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "perfil"
        verbose_name_plural = "perfis"

    def __str__(self) -> str:
        return f"{self.usuario} ({self.get_papel_display() or 'sem papel'})"

    @property
    def tem_acesso(self) -> bool:
        return bool(self.papel) and self.usuario.is_active
