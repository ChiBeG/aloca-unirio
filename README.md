# Alocação de salas UNIRIO

Sistema de alocação de salas da UNIRIO a partir de arquivos CSV de prédios, salas e disciplinas.

- **backend/**: API em Python (Django) que lê os CSVs de `backend/entrada/`, faz a alocação e devolve a grade horária.
- **frontend/**: interface em Next.js. Ela chama o backend pelas rotas `/api/csv-options` e `/api/alocar`.
- **docs/**: documentação, incluindo o diagrama BPMN do processo de alocação (`alocacaoSalasProcesso.bpmn`, feito no Camunda Modeler).

## Rodando com Docker (recomendado)

### Requisitos

- Docker com Docker Compose

### Subir o sistema

Na raiz do projeto:

```bash
docker compose up --build
```

- Frontend: http://localhost:3002
- Backend (API): http://localhost:8000

Para rodar em segundo plano, use `docker compose up -d --build`. Para parar, use `docker compose down`.

### Arquivos CSV

A pasta `backend/entrada/` é montada no container do backend. Para usar um CSV novo, coloque o arquivo nessa pasta. Ele aparece no frontend sem precisar reconstruir a imagem.

### Variáveis de ambiente

| Variável | Serviço | Padrão | Descrição |
|---|---|---|---|
| `DJANGO_SECRET_KEY` | backend | chave de desenvolvimento | Troque em produção |
| `DJANGO_DEBUG` | backend | `false` (no Docker) | Modo debug do Django |
| `DJANGO_BASE_URL` | frontend | `http://backend:8000` | Endereço do backend usado pelo frontend |

As variáveis do backend podem ser definidas em um arquivo `.env` na raiz do projeto, por exemplo:

```env
DJANGO_SECRET_KEY=uma-chave-segura
```

## Rodando sem Docker (desenvolvimento)

### Requisitos

- Python 3.11+
- Node.js 20.9+

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .\.venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver
```

O backend fica em http://127.0.0.1:8000.

### Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

O frontend fica em http://127.0.0.1:3002. Ele se conecta ao backend em `http://127.0.0.1:8000`. Para usar outro endereço, defina a variável `DJANGO_BASE_URL`.

### Testes do frontend

```bash
cd frontend
npm test            # testes unitários (Vitest)
npm run test:e2e    # testes end-to-end (Playwright)
```

## Endpoints do backend

- `GET /`: lista os CSVs disponíveis em `backend/entrada/` e os arquivos padrão.
- `POST /alocar/`: recebe `{ "predios", "salas", "disciplinas" }` (nomes dos CSVs) e retorna o HTML da grade, a lista de cursos, a lista de professores e os conflitos.
