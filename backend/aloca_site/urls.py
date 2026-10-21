from django.contrib import admin
from django.urls import include, path

from alocador import views
from contas import views as contas_views

urlpatterns = [
    path("", views.index, name="index"),
    path("alocar/", views.alocar, name="alocar"),
    path("api/me/", contas_views.me, name="me"),
    path("api/logout/", contas_views.sair, name="logout"),
    path("accounts/", include("allauth.urls")),
    path("admin/", admin.site.urls),
]
