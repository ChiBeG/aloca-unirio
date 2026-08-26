# Alocação de salas UNIRIO

Este projeto cria um site em Python (Django) que usa os códigos da pasta `scripts/` (Node) para fazer a alocação de salas a partir dos CSVs em `entrada/` e exibir o HTML resultante no navegador.

## Requisitos

- Python 3.11+
- Node.js 18+ (você já tem Node instalado)

## Como rodar

Crie e ative um virtualenv, instale dependências e suba o servidor:

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Abra `http://127.0.0.1:8000/` e clique em **Gerar HTML**.

## Como funciona

- A rota `/alocar/` executa:
  - `node scripts/main_django.js --base <pasta_do_projeto> ...`
- O Node gera `saida/grades_horarias.html` usando `scripts/publicador.js`
- O Django lê esse HTML e retorna como resposta (`text/html`)

