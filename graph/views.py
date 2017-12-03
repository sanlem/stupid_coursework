from django.views.generic import ListView, CreateView, DetailView
from .models import Graph


class GraphsListView(ListView):
    queryset = Graph.objects.all()
    template_name = "list.html"


class GraphCreateView(CreateView):
    model = Graph
    fields = ["name"]
    template_name = "create_graph.html"


class GraphBuildView(DetailView):
    model = Graph
    template_name = "build_graph.html"
