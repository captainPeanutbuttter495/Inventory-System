from django.db import models


class Item(models.Model):
    """A single inventory item. Trivial on purpose — just enough to give the
    Next.js frontend something real to fetch and create over the API."""

    name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]  # newest first

    def __str__(self):
        return self.name
