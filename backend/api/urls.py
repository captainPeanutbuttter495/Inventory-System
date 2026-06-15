from django.urls import path

from . import views

urlpatterns = [
    path("", views.hello, name="hello"),
    path("api/items/", views.ItemListCreate.as_view(), name="item-list-create"),
]
