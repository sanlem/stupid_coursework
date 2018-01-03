from django.db import models
from django.core.urlresolvers import reverse


class Graph(models.Model):
    name = models.CharField(max_length=20, null=False, blank=False)

    def get_absolute_url(self):
        return reverse("graph-build", kwargs={"pk": self.pk})

    def __str__(self):
        return "Graph {}".format(self.name)


class Node(models.Model):
    index = models.PositiveSmallIntegerField(null=False, blank=True)
    weight = models.PositiveSmallIntegerField(null=False, blank=False)
    is_start = models.BooleanField(default=False, null=False, blank=True)
    graph = models.ForeignKey(Graph, related_name="nodes", null=False, blank=False)
    left = models.PositiveSmallIntegerField(null=False, blank=False)
    top = models.PositiveSmallIntegerField(null=False, blank=False)


class Edge(models.Model):
    from_node = models.ForeignKey(Node, null=False, blank=False, on_delete=models.CASCADE,
                                  related_name="out_edges")
    to_node = models.ForeignKey(Node, null=False, blank=False, on_delete=models.CASCADE,
                                related_name="in_edges")
    weight = models.PositiveSmallIntegerField(null=False, blank=False)
