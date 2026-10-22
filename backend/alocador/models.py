"""Modelo de dados da alocação, a partir do script V2.

Decisões e divergências em relação ao script: docs/decisoes-modelo-dados.md.
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q


class Predio(models.Model):
    codigo = models.PositiveIntegerField("código", unique=True)
    nome = models.CharField(max_length=100)
    abreviacao = models.CharField("abreviação", max_length=10, blank=True)
    endereco = models.CharField("endereço", max_length=255, blank=True)

    class Meta:
        verbose_name = "prédio"
        verbose_name_plural = "prédios"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.abreviacao or self.nome


class Sala(models.Model):
    codigo = models.PositiveIntegerField("código", unique=True)
    nome = models.CharField(max_length=50)
    capacidade = models.PositiveIntegerField()
    predio = models.ForeignKey(
        Predio, on_delete=models.PROTECT, related_name="salas", verbose_name="prédio"
    )

    class Meta:
        verbose_name = "sala"
        verbose_name_plural = "salas"
        ordering = ["predio__nome", "nome"]
        constraints = [
            models.CheckConstraint(condition=Q(capacidade__gt=0), name="sala_capacidade_positiva"),
        ]

    def __str__(self) -> str:
        return f"{self.predio}-{self.nome}"


class Escola(models.Model):
    """Escola/Faculdade ou Programa de pós-graduação. Dona das disciplinas."""

    codigo = models.PositiveIntegerField("código", unique=True)
    nome = models.CharField(max_length=100)

    class Meta:
        verbose_name = "escola/programa"
        verbose_name_plural = "escolas/programas"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome


class Curso(models.Model):
    nome = models.CharField(max_length=100)
    departamento = models.CharField(max_length=100, blank=True)
    escola = models.ForeignKey(
        Escola, on_delete=models.PROTECT, related_name="cursos", verbose_name="escola/programa"
    )
    coordenador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="cursos_coordenados",
    )

    class Meta:
        verbose_name = "curso"
        verbose_name_plural = "cursos"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome


class Professor(models.Model):
    """Docente. Não precisa ter conta no sistema; o vínculo com usuário é opcional."""

    nome = models.CharField(max_length=100)
    # Não é único: nos dados atuais o SIAPE vem zerado ou repetido entre pessoas.
    siape = models.CharField("SIAPE", max_length=20, blank=True)
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="professor",
        verbose_name="usuário",
    )

    class Meta:
        verbose_name = "professor"
        verbose_name_plural = "professores"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome


class Disciplina(models.Model):
    """Na prática equivale a uma turma: a mesma disciplina pode aparecer várias vezes."""

    nome = models.CharField(max_length=100)
    periodo = models.PositiveSmallIntegerField("período curricular", null=True, blank=True)
    # Sem vagas a disciplina está incompleta e não entra na alocação automática (RN05).
    vagas_oferecidas = models.PositiveIntegerField(null=True, blank=True)
    curso = models.ForeignKey(Curso, on_delete=models.PROTECT, related_name="disciplinas")
    escola = models.ForeignKey(
        Escola, on_delete=models.PROTECT, related_name="disciplinas", verbose_name="escola/programa"
    )
    professores = models.ManyToManyField(Professor, blank=True, related_name="disciplinas")

    class Meta:
        verbose_name = "disciplina"
        verbose_name_plural = "disciplinas"
        ordering = ["curso__nome", "periodo", "nome"]

    def __str__(self) -> str:
        return self.nome


class DiaSemana(models.IntegerChoices):
    # Mesma numeração dos CSVs de entrada (2 = segunda).
    SEGUNDA = 2, "Segunda"
    TERCA = 3, "Terça"
    QUARTA = 4, "Quarta"
    QUINTA = 5, "Quinta"
    SEXTA = 6, "Sexta"
    SABADO = 7, "Sábado"


class EspacoGrade(models.Model):
    dia_semana = models.PositiveSmallIntegerField("dia da semana", choices=DiaSemana.choices)
    horario_inicio = models.TimeField("início")
    horario_fim = models.TimeField("fim")

    class Meta:
        verbose_name = "espaço na grade"
        verbose_name_plural = "espaços na grade"
        ordering = ["dia_semana", "horario_inicio", "horario_fim"]
        constraints = [
            models.CheckConstraint(
                condition=Q(horario_fim__gt=F("horario_inicio")), name="espaco_fim_apos_inicio"
            ),
            models.UniqueConstraint(
                fields=["dia_semana", "horario_inicio", "horario_fim"], name="espaco_unico"
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.get_dia_semana_display()} "
            f"{self.horario_inicio:%H:%M}–{self.horario_fim:%H:%M}"
        )


class GradeHoraria(models.Model):
    """Alocação de uma disciplina em uma sala, em um espaço da grade."""

    disciplina = models.ForeignKey(Disciplina, on_delete=models.PROTECT, related_name="alocacoes")
    espaco = models.ForeignKey(
        EspacoGrade, on_delete=models.PROTECT, related_name="alocacoes", verbose_name="espaço"
    )
    sala = models.ForeignKey(Sala, on_delete=models.PROTECT, related_name="alocacoes")

    class Meta:
        verbose_name = "alocação"
        verbose_name_plural = "grade horária"
        constraints = [
            # RN02 no banco; sobreposição entre espaços diferentes fica no clean().
            models.UniqueConstraint(fields=["sala", "espaco"], name="grade_sala_espaco_unico"),
        ]

    def __str__(self) -> str:
        return f"{self.disciplina} — {self.sala} — {self.espaco}"

    def clean(self) -> None:
        if not (self.sala_id and self.espaco_id and self.disciplina_id):
            return  # campos obrigatórios já são validados pelo form

        vagas = self.disciplina.vagas_oferecidas
        if vagas is not None and self.sala.capacidade < vagas:  # RN01
            raise ValidationError(
                {
                    "sala": f"Capacidade da sala ({self.sala.capacidade}) "
                    f"é menor que as vagas da disciplina ({vagas})."
                }
            )

        conflito = (
            GradeHoraria.objects.filter(
                sala_id=self.sala_id,
                espaco__dia_semana=self.espaco.dia_semana,
                espaco__horario_inicio__lt=self.espaco.horario_fim,
                espaco__horario_fim__gt=self.espaco.horario_inicio,
            )
            .exclude(pk=self.pk)
            .select_related("disciplina", "espaco")
            .first()
        )
        if conflito:  # RN02
            raise ValidationError(
                f"A sala já está ocupada por '{conflito.disciplina}' em {conflito.espaco}."
            )
