from django.contrib.auth import get_user_model
from django.test import TestCase

from .adapters import email_institucional_valido
from .models import Papel


class ValidacaoDominioTests(TestCase):
    def test_aceita_conta_institucional_verificada(self):
        dados = {"email": "Fulano@edu.unirio.br", "hd": "edu.unirio.br", "email_verified": True}
        self.assertTrue(email_institucional_valido(dados))

    def test_recusa_gmail(self):
        dados = {"email": "fulano@gmail.com", "email_verified": True}
        self.assertFalse(email_institucional_valido(dados))

    def test_recusa_sem_claim_hd(self):
        # Sem hd a conta não pertence ao Workspace, mesmo que o e-mail pareça institucional.
        dados = {"email": "fulano@edu.unirio.br", "email_verified": True}
        self.assertFalse(email_institucional_valido(dados))

    def test_recusa_subdominio_parecido(self):
        dados = {"email": "x@fake-edu.unirio.br", "hd": "fake-edu.unirio.br", "email_verified": True}
        self.assertFalse(email_institucional_valido(dados))

    def test_recusa_email_nao_verificado(self):
        dados = {"email": "fulano@edu.unirio.br", "hd": "edu.unirio.br", "email_verified": False}
        self.assertFalse(email_institucional_valido(dados))


class AcessoTests(TestCase):
    def setUp(self):
        self.usuario = get_user_model().objects.create_user(
            username="fulano", email="fulano@edu.unirio.br"
        )

    def test_perfil_criado_sem_papel(self):
        self.assertEqual(self.usuario.perfil.papel, "")
        self.assertFalse(self.usuario.perfil.tem_acesso)

    def test_me_sem_login(self):
        self.assertEqual(self.client.get("/api/me/").status_code, 401)

    def test_me_sem_papel(self):
        self.client.force_login(self.usuario)
        resposta = self.client.get("/api/me/")
        self.assertEqual(resposta.status_code, 200)
        self.assertFalse(resposta.json()["temAcesso"])
        self.assertIn("csrftoken", resposta.cookies)

    def test_alocador_exige_login(self):
        self.assertEqual(self.client.get("/").status_code, 401)

    def test_alocador_exige_papel(self):
        self.client.force_login(self.usuario)
        self.assertEqual(self.client.get("/").status_code, 403)

    def test_alocador_com_papel(self):
        self.usuario.perfil.papel = Papel.OPERADOR
        self.usuario.perfil.save()
        self.client.force_login(self.usuario)
        self.assertEqual(self.client.get("/").status_code, 200)

    def test_usuario_inativo_sem_acesso(self):
        self.usuario.perfil.papel = Papel.OPERADOR
        self.usuario.perfil.save()
        self.usuario.is_active = False
        self.usuario.save()
        self.client.force_login(self.usuario)
        self.assertNotEqual(self.client.get("/").status_code, 200)

    def test_logout_exige_csrf(self):
        from django.test import Client

        cliente = Client(enforce_csrf_checks=True)
        cliente.force_login(self.usuario)
        self.assertEqual(cliente.post("/api/logout/").status_code, 403)
