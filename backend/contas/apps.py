from django.apps import AppConfig


class ContasConfig(AppConfig):
    name = "contas"
    verbose_name = "Contas e perfis"

    def ready(self) -> None:
        from . import signals  # noqa: F401
