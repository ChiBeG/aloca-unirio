import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY", "django-insecure-dev-only-troque-em-producao"
)

DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,backend").split(",")

# Endereço público do frontend (para onde o usuário volta após login/logout).
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3002").rstrip("/")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "contas",
    "alocador",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "aloca_site.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "aloca_site.wsgi.application"

# SQLite provisório; a migração para MySQL fica para uma etapa posterior.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.environ.get("SQLITE_PATH", BASE_DIR / "db.sqlite3"),
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# --- Autenticação ---
# ModelBackend: login por senha apenas no /admin/ (superusuário inicial).
# Allauth: login dos demais usuários via Google.
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

# Único domínio aceito no login via Google. Validado no backend (contas.adapters).
ALLOWED_EMAIL_DOMAIN = "edu.unirio.br"

LOGIN_REDIRECT_URL = FRONTEND_URL + "/"
ACCOUNT_LOGOUT_REDIRECT_URL = FRONTEND_URL + "/login"

SOCIALACCOUNT_ONLY = True  # sem cadastro/login por senha pelo allauth
ACCOUNT_EMAIL_VERIFICATION = "none"  # e-mail já verificado pelo Google; exigido por SOCIALACCOUNT_ONLY
ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*"]
ACCOUNT_UNIQUE_EMAIL = True
SOCIALACCOUNT_LOGIN_ON_GET = True  # vai direto ao Google, sem página intermediária
SOCIALACCOUNT_AUTO_SIGNUP = True
SOCIALACCOUNT_ADAPTER = "contas.adapters.UnirioSocialAccountAdapter"
SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "APPS": [
            {
                "client_id": os.environ.get("GOOGLE_CLIENT_ID", ""),
                "secret": os.environ.get("GOOGLE_CLIENT_SECRET", ""),
            }
        ],
        "SCOPE": ["openid", "email", "profile"],
        # "hd" só filtra a tela de escolha de conta do Google; não é garantia de segurança.
        "AUTH_PARAMS": {"hd": ALLOWED_EMAIL_DOMAIN, "prompt": "select_account"},
    }
}

# Cookies compartilhados entre frontend e backend (mesmo host em dev; mesmo domínio em produção).
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
# Em produção (HTTPS) os cookies devem ser Secure; desligue só para rodar sem HTTPS.
SECURE_COOKIES = os.environ.get("DJANGO_SECURE_COOKIES", str(not DEBUG)).lower() == "true"
SESSION_COOKIE_SECURE = SECURE_COOKIES
CSRF_COOKIE_SECURE = SECURE_COOKIES
CSRF_TRUSTED_ORIGINS = [FRONTEND_URL]

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {"contas": {"handlers": ["console"], "level": "INFO"}},
}
