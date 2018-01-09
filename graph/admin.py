from django.contrib import admin
from .models import Node, Graph, Edge

admin.site.register(Graph)
admin.site.register(Node)
admin.site.register(Edge)
