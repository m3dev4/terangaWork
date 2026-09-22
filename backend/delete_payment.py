import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from paiement.models import Paiement
from mission.models import Mission

# Récupérer la mission
mission = Mission.objects.get(id=2)
print(f'Mission #{mission.id}: {mission.title}')

# Récupérer la proposition acceptée
accepted_prop = mission.propositions.filter(proposition_status='ACCEPTED').first()

if accepted_prop:
    # Chercher le paiement
    paiement = Paiement.objects.filter(proposition=accepted_prop).first()
    if paiement:
        print(f'\n=== Paiement trouvé ===')
        print(f'ID: {paiement.id}')
        print(f'Statut collecte: {paiement.statut_collecte}')
        print(f'Statut décaissement: {paiement.statut_decaissement}')
        print(f'Référence collecte: {paiement.reference_collecte}')
        print(f'Montant: {paiement.montant_brut} FCFA')
        
        # Supprimer le paiement
        paiement.delete()
        print(f'\n✓ Paiement supprimé avec succès!')
    else:
        print('\nAucun paiement trouvé')
else:
    print('\nAucune proposition acceptée trouvée')
