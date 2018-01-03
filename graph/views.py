from django.views.generic import ListView, CreateView, DetailView
from rest_framework.viewsets import ModelViewSet
from rest_framework.generics import RetrieveAPIView
from .models import Graph, Node, Edge
from .serializers import NodeSerializer, EdgeSerializer, GraphSerializer


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


class NodeViewSet(ModelViewSet):
    serializer_class = NodeSerializer
    queryset = Node.objects.all()

    def perform_create(self, serializer):
        data = serializer.validated_data

        if data.get("index", None) is None:
            graph = data["graph"]
            last_node = graph.nodes.last()

            if last_node is None:
                index = 1
            else:
                index = last_node.index + 1

        serializer.save(index=index)


class EdgeViewSet(ModelViewSet):
    serializer_class = EdgeSerializer
    queryset = Edge.objects.all()


class GraphDetailAPIView(RetrieveAPIView):
    serializer_class = GraphSerializer
    queryset = Graph.objects.all()
