from datetime import time

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.db.models import ProtectedError
from django.test import TestCase

from .models import Curso, DiaSemana, Disciplina, Escola, EspacoGrade, GradeHoraria, Predio, Sala


class ModeloBase(TestCase):
    def setUp(self):
        self.predio = Predio.objects.create(codigo=1, nome="CCH")
        self.sala = Sala.objects.create(codigo=91202, nome="202", capacidade=40, predio=self.predio)
        escola = Escola.objects.create(codigo=1, nome="Escola de Arquivologia")
        curso = Curso.objects.create(nome="Bacharelado em Arquivologia", escola=escola)
        self.disciplina = Disciplina.objects.create(
            nome="Introdução a Arquivologia", vagas_oferecidas=40, curso=curso, escola=escola
        )
        self.seg_8_10 = EspacoGrade.objects.create(
            dia_semana=DiaSemana.SEGUNDA, horario_inicio=time(8), horario_fim=time(10)
        )

    def espaco(self, dia, inicio, fim):
        return EspacoGrade.objects.create(dia_semana=dia, horario_inicio=time(inicio), horario_fim=time(fim))


class ConstraintsTests(ModeloBase):
    def test_capacidade_zero_rejeitada(self):
        with self.assertRaises(IntegrityError):
            Sala.objects.create(codigo=1, nome="X", capacidade=0, predio=self.predio)

    def test_espaco_com_fim_antes_do_inicio_rejeitado(self):
        with self.assertRaises(IntegrityError):
            self.espaco(DiaSemana.TERCA, 10, 8)

    def test_sala_nao_tem_duas_alocacoes_no_mesmo_espaco(self):
        GradeHoraria.objects.create(disciplina=self.disciplina, espaco=self.seg_8_10, sala=self.sala)
        with self.assertRaises(IntegrityError):
            GradeHoraria.objects.create(disciplina=self.disciplina, espaco=self.seg_8_10, sala=self.sala)

    def test_predio_com_salas_nao_pode_ser_excluido(self):
        with self.assertRaises(ProtectedError):
            self.predio.delete()


class ValidacaoGradeTests(ModeloBase):
    def test_rejeita_sala_menor_que_as_vagas(self):
        self.disciplina.vagas_oferecidas = 41
        self.disciplina.save()
        grade = GradeHoraria(disciplina=self.disciplina, espaco=self.seg_8_10, sala=self.sala)
        with self.assertRaises(ValidationError):
            grade.full_clean()

    def test_aceita_disciplina_sem_vagas_informadas(self):
        self.disciplina.vagas_oferecidas = None
        self.disciplina.save()
        GradeHoraria(disciplina=self.disciplina, espaco=self.seg_8_10, sala=self.sala).full_clean()

    def test_rejeita_espacos_sobrepostos_na_mesma_sala(self):
        GradeHoraria.objects.create(disciplina=self.disciplina, espaco=self.seg_8_10, sala=self.sala)
        grade = GradeHoraria(
            disciplina=self.disciplina, espaco=self.espaco(DiaSemana.SEGUNDA, 9, 11), sala=self.sala
        )
        with self.assertRaises(ValidationError):
            grade.full_clean()

    def test_aceita_horarios_encostados_ou_em_outro_dia(self):
        GradeHoraria.objects.create(disciplina=self.disciplina, espaco=self.seg_8_10, sala=self.sala)
        for espaco in (self.espaco(DiaSemana.SEGUNDA, 10, 12), self.espaco(DiaSemana.TERCA, 8, 10)):
            GradeHoraria(disciplina=self.disciplina, espaco=espaco, sala=self.sala).full_clean()

    def test_editar_alocacao_existente_nao_conflita_consigo_mesma(self):
        grade = GradeHoraria.objects.create(disciplina=self.disciplina, espaco=self.seg_8_10, sala=self.sala)
        grade.full_clean()
