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
| `DJANGO_SECURE_COOKIES` | backend | `false` (no Docker) | Cookies `Secure`; use `true` em produção (HTTPS) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | backend | vazio | Credenciais OAuth do Google (veja [Autenticação](#autenticação)) |
| `FRONTEND_URL` | backend | `http://localhost:3002` | Para onde o Django manda o usuário após o login |
| `DJANGO_BASE_URL` | frontend | `http://backend:8000` | Endereço do backend usado pelo servidor do frontend |
| `DJANGO_PUBLIC_URL` | frontend | `http://localhost:8000` | Endereço do backend usado pelo navegador (login) |

Copie `.env.example` para `.env` na raiz do projeto e preencha. O `.env` está no `.gitignore` e não deve ser commitado.

O banco é SQLite por enquanto. No Docker ele fica no volume `backend-data`.

## Autenticação

O login é feito com contas Google, aceitando **apenas contas `@edu.unirio.br`**. O domínio é validado no backend ([backend/contas/adapters.py](backend/contas/adapters.py)) a partir dos dados assinados do Google (`hd` e `email_verified`). Contas de outros domínios voltam para `/login` com uma mensagem de erro.

No primeiro login, o usuário é criado **sem papel e sem acesso**. Um administrador atribui o papel no admin do Django (`/admin/`).

### Configurar o Google Cloud Console

1. Crie um projeto em https://console.cloud.google.com.
2. Em **APIs e serviços > Tela de consentimento OAuth**, escolha o tipo **Externo** e adicione os escopos `openid`, `email` e `profile`. Para uso fora da lista de usuários de teste, publique o app (esses escopos não exigem verificação do Google).
3. Em **Credenciais > Criar credenciais > ID do cliente OAuth**, escolha **Aplicativo da Web** e cadastre os URIs de redirecionamento:
   - `http://localhost:8000/accounts/google/login/callback/` (desenvolvimento)
   - `https://<domínio-de-produção>/accounts/google/login/callback/`
4. Coloque o Client ID e o Client Secret no `.env`.

### Primeiro administrador

O primeiro administrador entra com usuário e senha no admin do Django, sem conta Google:

```bash
docker compose exec backend python manage.py createsuperuser
# sem Docker: python manage.py createsuperuser
```

Depois, em http://localhost:8000/admin/, abra **Usuários** e escolha o papel de cada pessoa que já fez login com Google.

### Observação sobre o host

Acesse o frontend por **http://localhost:3002**, não por `127.0.0.1`. O cookie de sessão é emitido pelo Django em `localhost:8000` e só é enviado ao frontend se os dois estiverem no mesmo host. Em produção, frontend e backend devem ficar sob o mesmo domínio (por exemplo, atrás de um proxy reverso).

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
python manage.py migrate
python manage.py runserver
```

Defina `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no ambiente antes de rodar o `runserver`.

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

Os endpoints do alocador exigem sessão com papel atribuído. Sem login, respondem 401; com login mas sem papel, respondem 403. Requisições POST exigem o header `X-CSRFToken`.

- `GET /`: lista os CSVs disponíveis em `backend/entrada/` e os arquivos padrão.
- `POST /alocar/`: recebe `{ "predios", "salas", "disciplinas" }` (nomes dos CSVs) e retorna o HTML da grade, a lista de cursos, a lista de professores e os conflitos.
- `GET /api/me/`: usuário logado e papel (401 sem sessão). Também emite o cookie `csrftoken`.
- `POST /api/logout/`: encerra a sessão.
- `/accounts/google/login/`: inicia o login com Google.
- `/admin/`: admin do Django (atribuição de papéis).
