from django.contrib import admin

from .models import Curso, Disciplina, Escola, EspacoGrade, GradeHoraria, Predio, Professor, Sala


@admin.register(Predio)
class PredioAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nome", "abreviacao", "endereco")
    search_fields = ("codigo", "nome", "abreviacao")


@admin.register(Sala)
class SalaAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nome", "predio", "capacidade")
    list_filter = ("predio",)
    search_fields = ("codigo", "nome")
    list_select_related = ("predio",)


@admin.register(Escola)
class EscolaAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nome")
    search_fields = ("codigo", "nome")


@admin.register(Curso)
class CursoAdmin(admin.ModelAdmin):
    list_display = ("nome", "escola", "departamento", "coordenador")
    list_filter = ("escola",)
    search_fields = ("nome", "departamento")
    autocomplete_fields = ("coordenador",)
    list_select_related = ("escola", "coordenador")


@admin.register(Professor)
class ProfessorAdmin(admin.ModelAdmin):
    list_display = ("nome", "siape", "usuario")
    search_fields = ("nome", "siape")
    autocomplete_fields = ("usuario",)


@admin.register(Disciplina)
class DisciplinaAdmin(admin.ModelAdmin):
    list_display = ("nome", "curso", "periodo", "vagas_oferecidas", "escola")
    list_filter = ("escola", "curso", "periodo")
    search_fields = ("nome",)
    autocomplete_fields = ("professores",)
    list_select_related = ("curso", "escola")


@admin.register(EspacoGrade)
class EspacoGradeAdmin(admin.ModelAdmin):
    list_display = ("dia_semana", "horario_inicio", "horario_fim")
    list_filter = ("dia_semana",)


@admin.register(GradeHoraria)
class GradeHorariaAdmin(admin.ModelAdmin):
    list_display = ("disciplina", "sala", "espaco")
    list_filter = ("espaco__dia_semana", "sala__predio")
    search_fields = ("disciplina__nome", "sala__nome")
    autocomplete_fields = ("disciplina", "sala")
    list_select_related = ("disciplina", "sala__predio", "espaco")
