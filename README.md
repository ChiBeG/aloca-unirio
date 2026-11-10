# Alocação de salas UNIRIO

Sistema de alocação de salas da UNIRIO (projeto de extensão da Escola de Informática Aplicada), feito para substituir o antigo Aloca do CCH.

- **backend/**: API em Python (Django). Tem dois apps:
  - `contas`: login com Google e papéis dos usuários.
  - `alocador`: modelo de dados da alocação (prédios, salas, escolas, cursos, professores, disciplinas e grade horária) e o alocador, que hoje ainda lê os CSVs de `backend/entrada/` e devolve a grade horária sem gravar no banco.
- **frontend/**: interface em Next.js. Ela chama o backend pelas rotas `/api/csv-options`, `/api/alocar` e `/api/auth/*`.
- **docs/**: documentação. Inclui os [requisitos](docs/requisitos.md), o [registro de decisões do modelo de dados](docs/decisoes-modelo-dados.md), as [pendências](docs/pendencias.md) e o diagrama BPMN do processo de alocação (`alocacaoSalasProcesso.bpmn`, feito no Camunda Modeler).
- **context/**: material de referência: script SQL V2, diagrama e documento de requisitos original.

## Rodando localmente com Docker (recomendado)

### Requisitos

- Docker com Docker Compose

### 1. Configurar o `.env`

Na raiz do projeto:

```bash
cp .env.example .env
```

Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` (veja [Configurar o Google Cloud Console](#configurar-o-google-cloud-console)). Os demais valores já servem para desenvolvimento. O `.env` está no `.gitignore` e não deve ser commitado.

### 2. Subir o sistema

```bash
docker compose up -d --build
```

- Frontend: http://localhost:3002
- Backend (API e admin): http://localhost:8000

O backend aplica as migrations sozinho ao iniciar.

### 3. Criar o primeiro administrador

Só na primeira vez:

```bash
docker compose exec backend python manage.py createsuperuser
```

### 4. Entrar e dar papel à sua conta

1. Abra http://localhost:3002 e entre com sua conta `@edu.unirio.br`. A conta é criada **sem papel**, então o frontend informa que você não tem acesso.
2. Em http://localhost:8000/admin/, entre com o superusuário, abra **Usuários**, escolha sua conta e atribua um papel.
3. Recarregue o frontend.

Use **localhost**, não `127.0.0.1`. O cookie de sessão é emitido pelo Django em `localhost:8000` e só chega ao frontend se os dois estiverem no mesmo host.

### Comandos úteis

| Comando | O que faz |
|---|---|
| `docker compose logs -f backend` | Mostra os logs do backend |
| `docker compose down` | Para o sistema (os dados continuam no volume) |
| `docker compose down -v` | Para o sistema e **apaga o banco** |
| `docker compose up -d --force-recreate` | Reinicia os containers depois de mudar o `.env` |

### Arquivos CSV

A pasta `backend/entrada/` é montada no container do backend. Para usar um CSV novo, coloque o arquivo nessa pasta. Ele aparece no frontend sem precisar reconstruir a imagem.

## Autenticação

O login é feito com contas Google, aceitando **apenas contas `@edu.unirio.br`**. O domínio é validado no backend ([backend/contas/adapters.py](backend/contas/adapters.py)) a partir dos dados assinados do Google (`hd` e `email_verified`). Contas de outros domínios voltam para `/login` com uma mensagem de erro.

No primeiro login, o usuário é criado **sem papel e sem acesso**. Um administrador atribui o papel no admin do Django (`/admin/`). O superusuário criado com `createsuperuser` entra no admin com usuário e senha, sem conta Google.

### Configurar o Google Cloud Console

1. Entre em https://console.cloud.google.com com uma conta `@edu.unirio.br` e crie um projeto.
2. Configure a **tela de consentimento OAuth** (em versões novas do console, **Google Auth Platform**):
   - Tipo **Interno**, se disponível (só aparece quando o projeto está na organização `edu.unirio.br`). Assim, só contas da UNIRIO conseguem logar.
   - Caso contrário, tipo **Externo**. Enquanto o app estiver em teste, só os e-mails cadastrados em **Usuários de teste** conseguem logar. Para liberar para todos, publique o app; os escopos usados não exigem verificação do Google. O backend recusa qualquer conta fora de `@edu.unirio.br` de qualquer forma.
   - Escopos: `openid`, `email` e `profile`.
3. Em **Credenciais > Criar credenciais > ID do cliente OAuth**, escolha **Aplicativo da Web** e cadastre os **URIs de redirecionamento autorizados**:
   - `http://localhost:8000/accounts/google/login/callback/` (desenvolvimento)
   - `https://<domínio-de-produção>/accounts/google/login/callback/` (produção)

   O endereço precisa ser idêntico, inclusive a barra final. "Origens JavaScript autorizadas" pode ficar vazio.
4. Coloque o Client ID e o Client Secret no `.env` e recrie os containers.

### Erros comuns

| Erro | Causa provável |
|---|---|
| `redirect_uri_mismatch` | O URI cadastrado no Google não é idêntico ao usado. Em produção, confira também `DJANGO_SECURE_COOKIES=true`, que faz o Django gerar o URI com `https://`. |
| `access_blocked` ou "app não verificado" | App do tipo Externo em teste, e o e-mail não está em **Usuários de teste**. |
| O login funciona, mas o frontend continua deslogado | Frontend e backend em hosts diferentes (por exemplo, `127.0.0.1` e `localhost`). |
| Nada mudou depois de editar o `.env` | Falta rodar `docker compose up -d --force-recreate`. |

## Variáveis de ambiente

Definidas no `.env` da raiz e repassadas aos containers pelo `docker-compose.yml`.

| Variável | Serviço | Padrão | Descrição |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | backend | vazio | Credenciais OAuth do Google |
| `DJANGO_SECRET_KEY` | backend | chave de desenvolvimento | **Obrigatório trocar em produção** |
| `DJANGO_DEBUG` | backend | `false` (no Docker) | Modo debug do Django. Nunca `true` em produção |
| `DJANGO_SECURE_COOKIES` | backend | `false` (no Docker) | `true` em produção (HTTPS): cookies `Secure` e URLs de login com `https://` |
| `DJANGO_ALLOWED_HOSTS` | backend | `localhost,127.0.0.1,backend` | Hosts aceitos pelo Django, separados por vírgula. Mantenha `backend`, que é o host usado pelo frontend dentro do Docker |
| `FRONTEND_URL` | backend | `http://localhost:3002` | Endereço público do frontend. O Django manda o usuário para ele após o login e o aceita como origem confiável para CSRF |
| `DJANGO_PUBLIC_URL` | frontend | `http://localhost:8000` | Endereço do backend usado pelo navegador (login) |
| `DJANGO_BASE_URL` | frontend | `http://backend:8000` | Endereço do backend usado pelo servidor do frontend (fixo no compose) |
| `BIND_ADDRESS` | compose | `0.0.0.0` | Interface onde as portas 8000 e 3002 são publicadas. Em produção, `127.0.0.1` |

## Deploy em produção

A configuração de produção usa o mesmo `docker-compose.yml`, com um proxy reverso (nginx) na frente fazendo HTTPS. O frontend e o backend ficam **sob o mesmo domínio**, para que o cookie de sessão do Django chegue ao frontend:

```
https://aloca.exemplo.unirio.br
├── /accounts/, /admin/, /static/  →  backend   (127.0.0.1:8000)
└── todo o resto                   →  frontend  (127.0.0.1:3002)
```

Nos exemplos abaixo, troque `aloca.exemplo.unirio.br` pelo domínio real.

### Requisitos do servidor

- Linux com Docker e Docker Compose
- nginx e um certificado TLS para o domínio (por exemplo, via Let's Encrypt/certbot ou o certificado institucional)
- Um registro DNS apontando o domínio para o servidor
- Portas 80 e 443 liberadas. As portas 8000 e 3002 **não** devem ficar acessíveis de fora

### 1. Baixar o código

```bash
git clone https://github.com/ChiBeG/aloca-unirio.git
cd aloca-unirio
```

### 2. Criar o `.env` de produção

```bash
cp .env.example .env
```

Preencha assim:

```bash
GOOGLE_CLIENT_ID=<client id>
GOOGLE_CLIENT_SECRET=<client secret>

DJANGO_SECRET_KEY=<chave aleatória, veja abaixo>
DJANGO_DEBUG=false
DJANGO_SECURE_COOKIES=true

FRONTEND_URL=https://aloca.exemplo.unirio.br
DJANGO_PUBLIC_URL=https://aloca.exemplo.unirio.br
DJANGO_ALLOWED_HOSTS=aloca.exemplo.unirio.br,backend

BIND_ADDRESS=127.0.0.1
```

Para gerar a chave secreta:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

- Não reutilize a chave de desenvolvimento.
- Restrinja a leitura do arquivo: `chmod 600 .env`.
- `BIND_ADDRESS=127.0.0.1` é importante: o Docker publica as portas por fora do firewall do sistema (ufw), então só restringir no firewall não basta.

### 3. Configurar o login com Google de produção

Use um projeto do Google Cloud próprio para produção, separado do projeto usado em desenvolvimento. O passo a passo está em [Credenciais do Google para produção](#credenciais-do-google-para-produção). Ao final, você terá o Client ID e o Client Secret para o `.env` do passo 2.

### 4. Subir os containers

```bash
docker compose up -d --build
docker compose exec backend python manage.py createsuperuser
```

### 5. Configurar o nginx

Crie `/etc/nginx/sites-available/aloca`:

```nginx
server {
    listen 80;
    server_name aloca.exemplo.unirio.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name aloca.exemplo.unirio.br;

    ssl_certificate     /etc/letsencrypt/live/aloca.exemplo.unirio.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aloca.exemplo.unirio.br/privkey.pem;

    # O Django usa o Host original para montar as URLs de login do Google.
    proxy_set_header Host              $host;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    location ~ ^/(accounts|admin|static)/ {
        proxy_pass http://127.0.0.1:8000;
    }

    location / {
        proxy_pass http://127.0.0.1:3002;
    }
}
```

Ative e recarregue:

```bash
sudo ln -s /etc/nginx/sites-available/aloca /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

O `proxy_set_header Host $host` é obrigatório. Sem ele, o Django recebe `127.0.0.1:8000` como host e manda ao Google um URI de retorno errado.

### 6. Conferir

1. Abra `https://aloca.exemplo.unirio.br` e faça login com uma conta `@edu.unirio.br`.
2. Em `https://aloca.exemplo.unirio.br/admin/`, entre com o superusuário e atribua os papéis.
3. Confirme que as portas internas não respondem de fora do servidor: `curl http://<ip-do-servidor>:8000` deve falhar.

### Credenciais do Google para produção

As credenciais de desenvolvimento podem ficar no projeto de qualquer pessoa da equipe. Já as de produção devem ficar em um projeto do Google Cloud **criado com uma conta institucional** (por exemplo, uma conta do setor responsável pelo sistema), e não com a conta pessoal de um aluno ou servidor. Se o dono do projeto perder o acesso à conta, o login do sistema para de funcionar.

Os passos abaixo partem do projeto já criado com essa conta. Os nomes de menu são os do **Google Auth Platform** no console; em versões antigas, os mesmos itens ficam em **APIs e serviços > Tela de consentimento OAuth** e **Credenciais**.

#### 1. Garantir que o projeto não dependa de uma só pessoa

1. Em **IAM e administrador > Configurações**, confira se o projeto está dentro da organização `unirio.br`/`edu.unirio.br`. Se estiver em "Sem organização", ele pertence só à conta que o criou. Nesse caso, peça ao administrador do Google Workspace da UNIRIO para movê-lo para a organização.
2. Em **IAM e administrador > IAM**, adicione pelo menos mais uma pessoa responsável com o papel **Proprietário** (de preferência um grupo do Google, e não pessoas avulsas). Assim o acesso não se perde com a saída de alguém.

#### 2. Branding

Em **Google Auth Platform > Branding**:

- **Nome do app:** "Aloca UNIRIO". É o nome mostrado na tela de login do Google.
- **E-mail de suporte ao usuário:** um e-mail institucional do setor responsável, não um e-mail pessoal.
- **Logotipo:** opcional. Se enviar um, o Google pode exigir verificação da marca.
- **Domínios autorizados:** o domínio raiz do sistema (por exemplo, `unirio.br`).
- **Contato do desenvolvedor:** o mesmo e-mail institucional. É para onde o Google envia avisos sobre o projeto.

#### 3. Público

Em **Google Auth Platform > Público** (Audience):

- Escolha **Interno**. Só contas da organização conseguem logar, e o app não precisa de verificação nem de publicação. Essa opção só aparece quando o projeto está dentro da organização (passo 1).
- Se não for possível usar Interno, escolha **Externo** e clique em **Publicar app** para sair do modo de teste. Os escopos usados pelo sistema não exigem verificação do Google. O backend continua recusando contas fora de `@edu.unirio.br`.

#### 4. Escopos

Em **Google Auth Platform > Acesso a dados** (Data Access), adicione apenas `openid`, `.../auth/userinfo.email` e `.../auth/userinfo.profile`. O sistema não precisa de nenhum outro escopo.

#### 5. Criar o cliente OAuth

Em **Google Auth Platform > Clientes > Criar cliente**:

1. **Tipo de aplicativo:** Aplicativo da Web.
2. **Nome:** "Aloca – produção". Esse nome só aparece no console.
3. **Origens JavaScript autorizadas:** deixe vazio.
4. **URIs de redirecionamento autorizados:** apenas `https://aloca.exemplo.unirio.br/accounts/google/login/callback/`, com o domínio real. Não inclua `localhost` no cliente de produção.
5. Clique em **Criar** e copie o **Client ID** e o **Client Secret** na hora. O Google pode não mostrar o secret de novo depois que a janela for fechada.

#### 6. Levar as credenciais ao servidor

1. Coloque os dois valores no `.env` do servidor (`GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`).
2. Recrie os containers com `docker compose up -d --force-recreate`.
3. Guarde o secret apenas no `.env` do servidor e no gerenciador de senhas do setor. Não o envie por e-mail ou mensagem, nem o coloque no repositório.

#### Trocar o secret (se vazar ou periodicamente)

1. No cliente de produção, em **Clientes**, adicione um novo secret.
2. Atualize `GOOGLE_CLIENT_SECRET` no `.env` do servidor e rode `docker compose up -d --force-recreate`.
3. Teste o login e, só então, desative e exclua o secret antigo no console.

### Atualizar para uma nova versão

```bash
cd aloca-unirio
git pull
docker compose up -d --build
```

As migrations novas são aplicadas automaticamente quando o backend reinicia. Faça um backup do banco antes de atualizar.

### Backup do banco

O banco ainda é **SQLite** (a migração para MySQL está prevista, mas não foi feita). Ele fica no volume Docker `backend-data`, em `/app/data/db.sqlite3`. Para gerar uma cópia consistente com o sistema rodando:

```bash
docker compose exec backend python -c "import sqlite3; sqlite3.connect('/app/data/db.sqlite3').backup(sqlite3.connect('/app/data/backup.sqlite3'))"
docker compose cp backend:/app/data/backup.sqlite3 ./backup-$(date +%F).sqlite3
```

Guarde as cópias fora do servidor. **Não** rode `docker compose down -v` em produção: isso apaga o volume e, com ele, o banco.

Para restaurar a partir de um backup:

```bash
docker compose stop backend
docker compose cp ./backup-AAAA-MM-DD.sqlite3 backend:/app/data/db.sqlite3
docker compose start backend
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
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Defina `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no ambiente antes de rodar o `runserver`. Sem Docker, o banco fica em `backend/db.sqlite3`.

O backend fica em http://localhost:8000.

### Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

O frontend fica em http://localhost:3002. Ele se conecta ao backend em `http://127.0.0.1:8000`. Para usar outro endereço, defina a variável `DJANGO_BASE_URL`.

## Testes

### Backend

```bash
docker compose run --rm backend python manage.py test
# sem Docker: cd backend && python manage.py test
```

Os testes usam um banco temporário e não mexem nos dados.

### Frontend

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
- `/admin/`: admin do Django: atribuição de papéis e cadastro de prédios, salas, cursos, disciplinas e grade horária.
