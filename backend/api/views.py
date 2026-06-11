from django.http import HttpResponse

def hello(request):
    return HttpResponse("Hello, world! Inventory app is alive.")
