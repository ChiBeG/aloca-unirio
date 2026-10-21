from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin

from .models import Perfil


class PerfilInline(admin.StackedInline):
    model = Perfil
    can_delete = False
    fields = ("papel",)


class UsuarioAdmin(UserAdmin):
    inlines = [PerfilInline]
    list_display = ("username", "email", "first_name", "last_name", "papel", "is_active")
    list_filter = ("perfil__papel", "is_active", "is_staff")

    @admin.display(description="papel", ordering="perfil__papel")
    def papel(self, obj) -> str:
        perfil = getattr(obj, "perfil", None)
        return perfil.get_papel_display() if perfil and perfil.papel else "—"


User = get_user_model()
admin.site.unregister(User)
admin.site.register(User, UsuarioAdmin)
