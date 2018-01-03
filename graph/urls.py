from rest_framework import routers
from .views import NodeViewSet, EdgeViewSet

router = routers.SimpleRouter()
router.register(r'nodes', NodeViewSet)
router.register(r'edges', EdgeViewSet)
