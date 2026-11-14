import json
import tempfile
from datetime import time
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.db.models import ProtectedError
from django.test import SimpleTestCase, TestCase

from contas.models import Papel

from .alocacao import executar_alocacao

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


# ---------------------------------------------------------------------------
# Ajustes manuais sobre a alocação automática (alocacao.py)
# ---------------------------------------------------------------------------

_PREDIOS = "Codigo;Nome\n1;CCH\n"
_SALAS = "Codigo;Nome;CodigoPredio;Capacidade\n101;A;1;40\n102;B;1;30\n103;C;1;20\n"
_CABECALHO = (
    "CodigoEscola;CodigoPredioOrigem;Curso;Disciplina;Vagas;Periodo;Professor;"
    "SIAPE;DiaSemana;HoraInicio;HoraFim;CodigoSalaFixa\n"
)
# Resultado automático esperado (salas na ordem A, B, C):
#   1 X  seg 18–22, 35 vagas -> A
#   2 Y  seg 18–22, 35 vagas -> sem sala (só A comporta)
#   3 P  seg 8–10            -> A
#   4 Q  seg 10–12           -> A
#   5 R  seg 8–12            -> B
_DISCIPLINAS = _CABECALHO + "".join(
    f"1;1;Curso;{nome};{vagas};1;Prof {nome};0;2;{inicio};{fim};\n"
    for nome, vagas, inicio, fim in [
        ("X", 35, 18, 22),
        ("Y", 35, 18, 22),
        ("P", 10, 8, 10),
        ("Q", 10, 10, 12),
        ("R", 10, 8, 12),
    ]
)
A, B, C = 101, 102, 103
X, Y, P, Q, R = 1, 2, 3, 4, 5


class AjustesManuaisTests(SimpleTestCase):
    def setUp(self):
        self._dir = tempfile.TemporaryDirectory()
        self.addCleanup(self._dir.cleanup)
        base = Path(self._dir.name)
        self.arquivos = []
        for nome, conteudo in (("p.csv", _PREDIOS), ("s.csv", _SALAS), ("d.csv", _DISCIPLINAS)):
            (base / nome).write_text(conteudo, encoding="utf-8")
            self.arquivos.append(base / nome)

    def rodar(self, ajustes=None):
        resultado = executar_alocacao(*self.arquivos, ajustes)
        self.por_id = {a["id"]: a for a in resultado["alocacoes"]}
        return resultado

    def sala(self, disciplina):
        return self.por_id[disciplina]["sala"]

    def test_rodada_automatica_de_referencia(self):
        resultado = self.rodar()
        self.assertEqual([self.sala(d) for d in (X, Y, P, Q, R)], [A, None, A, A, B])
        self.assertEqual(len(resultado["conflitos"]), 1)
        self.assertEqual(resultado["ajustes_ignorados"], [])
        self.assertFalse(any(a["manual"] for a in resultado["alocacoes"]))

    def test_pendente_em_sala_livre_mesmo_menor_que_as_vagas(self):
        resultado = self.rodar([{"disciplina": Y, "sala": B, "nome": "Y"}])
        self.assertEqual(self.sala(Y), B)
        self.assertTrue(self.por_id[Y]["manual"])
        self.assertEqual(self.por_id[Y]["violacoes"], ["capacidade"])
        self.assertEqual(resultado["conflitos"], [])
        self.assertIn("violacao", resultado["html"])
        self.assertIn("capacidade 30 &lt; 35 vagas", resultado["html"])

    def test_sala_ocupada_sem_realocacao_e_ignorada(self):
        resultado = self.rodar([{"disciplina": Y, "sala": A}])
        self.assertEqual(len(resultado["ajustes_ignorados"]), 1)
        self.assertIn("'X'", resultado["ajustes_ignorados"][0]["motivo"])
        self.assertEqual(self.sala(X), A)  # nada mudou
        self.assertIsNone(self.sala(Y))
        self.assertFalse(self.por_id[X]["manual"])

    def test_troca_com_realocacao_da_deslocada(self):
        resultado = self.rodar(
            [{"disciplina": Y, "sala": A, "realocacoes": [{"disciplina": X, "sala": B}]}]
        )
        self.assertEqual(resultado["ajustes_ignorados"], [])
        self.assertEqual((self.sala(Y), self.sala(X)), (A, B))
        self.assertTrue(self.por_id[X]["manual"] and self.por_id[Y]["manual"])

    def test_troca_simples_usa_a_sala_liberada(self):
        # R sai de B para A; P e Q (deslocadas de A) podem ir para B, que R liberou.
        self.rodar([{
            "disciplina": R,
            "sala": A,
            "realocacoes": [{"disciplina": P, "sala": B}, {"disciplina": Q, "sala": B}],
        }])
        self.assertEqual([self.sala(d) for d in (R, P, Q)], [A, B, B])

    def test_sobreposicao_parcial_exige_realocar_todas(self):
        resultado = self.rodar(
            [{"disciplina": R, "sala": A, "realocacoes": [{"disciplina": P, "sala": C}]}]
        )
        self.assertEqual(len(resultado["ajustes_ignorados"]), 1)
        self.assertIn("'Q'", resultado["ajustes_ignorados"][0]["motivo"])
        # Operação atômica: P não foi para C, R não saiu de B.
        self.assertEqual([self.sala(d) for d in (R, P, Q)], [B, A, A])

    def test_operacao_ve_o_estado_deixado_pelas_anteriores(self):
        # Y vai para B; depois Y vai para A e X (deslocada) para B, que Y acabou de liberar.
        resultado = self.rodar([
            {"disciplina": Y, "sala": B},
            {"disciplina": Y, "sala": A, "realocacoes": [{"disciplina": X, "sala": B}]},
        ])
        self.assertEqual(resultado["ajustes_ignorados"], [])
        self.assertEqual((self.sala(Y), self.sala(X)), (A, B))

    def test_ids_e_salas_inexistentes_sao_ignorados(self):
        resultado = self.rodar([
            {"disciplina": 999, "sala": A},
            {"disciplina": Y, "sala": 999},
        ])
        motivos = [i["motivo"] for i in resultado["ajustes_ignorados"]]
        self.assertEqual([i["indice"] for i in resultado["ajustes_ignorados"]], [0, 1])
        self.assertIn("linha 999", motivos[0])
        self.assertIn("Sala 999", motivos[1])

    def test_nome_diferente_indica_csv_alterado(self):
        resultado = self.rodar([{"disciplina": Y, "sala": B, "nome": "Outra"}])
        self.assertIn("CSV mudou", resultado["ajustes_ignorados"][0]["motivo"])
        self.assertIsNone(self.sala(Y))

    def test_ajustes_aplicados_em_ordem(self):
        self.rodar([{"disciplina": Y, "sala": B}, {"disciplina": Y, "sala": C}])
        self.assertEqual(self.sala(Y), C)


class AlocarViewTests(TestCase):
    def setUp(self):
        self.usuario = get_user_model().objects.create_user(
            username="fulano", email="fulano@edu.unirio.br"
        )
        self.client.force_login(self.usuario)

    def com_papel(self, papel):
        self.usuario.perfil.papel = papel
        self.usuario.perfil.save()

    def post(self, corpo):
        return self.client.post("/alocar/", json.dumps(corpo), content_type="application/json")

    def pendente(self):
        resultado = self.post({}).json()
        return next(a for a in resultado["alocacoes"] if a["sala"] is None)

    def test_sem_ajustes_qualquer_papel_pode_rodar(self):
        self.com_papel(Papel.REITORIA)
        resposta = self.post({})
        self.assertEqual(resposta.status_code, 200)
        self.assertIn("alocacoes", resposta.json())

    def test_reitoria_nao_pode_ajustar(self):
        self.com_papel(Papel.REITORIA)
        pendente = self.pendente()
        resposta = self.post({"ajustes": [{"disciplina": pendente["id"], "sala": 91202}]})
        self.assertEqual(resposta.status_code, 403)

    def test_operador_ajusta(self):
        self.com_papel(Papel.OPERADOR)
        resultado = self.post({}).json()
        pendente = next(a for a in resultado["alocacoes"] if a["sala"] is None)
        ocupadas = {
            a["sala"]
            for a in resultado["alocacoes"]
            if a["sala"] and a["dia"] == pendente["dia"]
            and a["inicio"] < pendente["fim"] and pendente["inicio"] < a["fim"]
        }
        livre = next(s["codigo"] for s in resultado["salas"] if s["codigo"] not in ocupadas)
        resposta = self.post({"ajustes": [{"disciplina": pendente["id"], "sala": livre}]})
        self.assertEqual(resposta.status_code, 200)
        alocada = next(a for a in resposta.json()["alocacoes"] if a["id"] == pendente["id"])
        self.assertEqual((alocada["sala"], alocada["manual"]), (livre, True))

    def test_formato_invalido(self):
        self.com_papel(Papel.OPERADOR)
        for ajustes in ("x", [{"disciplina": "1", "sala": 2}], [{"disciplina": 1}],
                        [{"disciplina": 1, "sala": 2, "realocacoes": [{}]}]):
            self.assertEqual(self.post({"ajustes": ajustes}).status_code, 400, ajustes)

    def test_me_informa_permissao_de_ajuste(self):
        self.com_papel(Papel.DIRETOR)
        self.assertTrue(self.client.get("/api/me/").json()["podeAjustar"])
        self.com_papel(Papel.COORDENADOR)
        self.assertFalse(self.client.get("/api/me/").json()["podeAjustar"])
