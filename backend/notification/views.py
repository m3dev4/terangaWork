from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from .models import Notification
from .serializers import NotificationSerializer, NotificationStatsSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet pour la gestion des notifications (lecture seule via API).
    
    Endpoints:
    - GET /api/notifications/ : Liste des notifications de l'utilisateur
    - GET /api/notifications/{id}/ : Détail d'une notification
    - PATCH /api/notifications/{id}/mark_read/ : Marquer comme lue
    - POST /api/notifications/mark_all_read/ : Marquer toutes comme lues
    - GET /api/notifications/stats/ : Statistiques des notifications
    - DELETE /api/notifications/{id}/ : Supprimer une notification
    """
    
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Retourne uniquement les notifications de l'utilisateur connecté"""
        user = self.request.user
        queryset = Notification.objects.filter(
            utilisateur=user
        ).select_related('mission', 'proposition', 'paiement', 'message_obj')
        
        # Filtrer par lue/non lue
        lue = self.request.query_params.get('lue')
        if lue is not None:
            lue_bool = lue.lower() in ['true', '1', 'yes']
            queryset = queryset.filter(lue=lue_bool)
        
        # Filtrer par type
        type_notif = self.request.query_params.get('type')
        if type_notif:
            queryset = queryset.filter(type=type_notif)
        
        return queryset.order_by('-date_creation')
    
    def list(self, request):
        """
        Liste des notifications avec pagination.
        
        Query params:
        - lue: true/false - filtrer par statut de lecture
        - type: TYPE - filtrer par type de notification
        - page_size: int - nombre de notifications par page (défaut: 20)
        """
        queryset = self.get_queryset()
        
        # Pagination
        page_size = int(request.query_params.get('page_size', 20))
        page = int(request.query_params.get('page', 1))
        
        start = (page - 1) * page_size
        end = start + page_size
        
        paginated_notifications = queryset[start:end]
        
        serializer = self.get_serializer(paginated_notifications, many=True)
        
        return Response({
            'total': queryset.count(),
            'page': page,
            'page_size': page_size,
            'notifications': serializer.data
        })
    
    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        """Marquer une notification comme lue"""
        notification = self.get_object()
        
        if not notification.lue:
            notification.marquer_comme_lue()
        
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Marquer toutes les notifications non lues comme lues"""
        user = request.user
        
        notifications_non_lues = Notification.objects.filter(
            utilisateur=user,
            lue=False
        )
        
        count = 0
        for notification in notifications_non_lues:
            notification.marquer_comme_lue()
            count += 1
        
        return Response({
            'message': f'{count} notification(s) marquée(s) comme lue(s)'
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Statistiques des notifications de l'utilisateur.
        
        Retourne:
        - total: nombre total de notifications
        - non_lues: nombre de notifications non lues
        - par_type: répartition par type
        """
        user = request.user
        
        notifications = Notification.objects.filter(utilisateur=user)
        
        stats = {
            'total': notifications.count(),
            'non_lues': notifications.filter(lue=False).count(),
            'par_type': {}
        }
        
        # Compter par type
        type_counts = notifications.values('type').annotate(count=Count('id'))
        for item in type_counts:
            stats['par_type'][item['type']] = item['count']
        
        serializer = NotificationStatsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['delete'])
    def delete_all_read(self, request):
        """Supprimer toutes les notifications lues"""
        user = request.user
        
        deleted_count, _ = Notification.objects.filter(
            utilisateur=user,
            lue=True
        ).delete()
        
        return Response({
            'message': f'{deleted_count} notification(s) supprimée(s)'
        })
    
    def destroy(self, request, pk=None):
        """Supprimer une notification spécifique"""
        notification = self.get_object()
        notification.delete()
        
        return Response(
            {'message': 'Notification supprimée'},
            status=status.HTTP_204_NO_CONTENT
        )
