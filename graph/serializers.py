from rest_framework import serializers
from .models import Node, Edge, Graph


class NodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Node
        fields = ["id", "weight", "left", "top", "index", "edges", "graph"]

    edges = serializers.SerializerMethodField()

    def get_edges(self, obj):
        edges = obj.out_edges.all()
        serializer = EdgeSerializer(edges, many=True)
        return serializer.data


class EdgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Edge
        fields = "__all__"


class GraphSerializer(serializers.ModelSerializer):
    class Meta:
        model = Graph
        fields = "__all__"

    nodes = NodeSerializer(many=True, source="nodes.all")
