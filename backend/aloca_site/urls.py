from django.urls import path

from alocador import views

urlpatterns = [
    path("", views.index, name="index"),
    path("alocar/", views.alocar, name="alocar"),
]
