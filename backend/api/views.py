from django.http import HttpResponse
from rest_framework import generics

from .models import Item
from .serializers import ItemSerializer


def hello(request):
    return HttpResponse("Hello, world! Inventory app is alive.")


class ItemListCreate(generics.ListCreateAPIView):
    """GET  /api/items/  -> list all items (newest first)
    POST /api/items/  -> create an item from {"name": "..."}"""

    queryset = Item.objects.all()
    serializer_class = ItemSerializer
