"""
Rend ``number_phone`` unique.

1. Le champ devient nullable (les comptes sans onboarding ont NULL au lieu de "").
2. Les numéros existants sont normalisés ; "" devient NULL.
3. En cas de doublon, le compte le plus ancien garde le numéro, les autres
   passent à NULL (ils devront le ressaisir).
4. La contrainte UNIQUE est ajoutée.
"""
import re

from django.db import migrations, models


def normaliser_et_dedoublonner(apps, schema_editor):
    User = apps.get_model("User", "User")
    vus = set()
    for user in User.objects.order_by("date_joined", "pk").only("pk", "number_phone"):
        brut = user.number_phone
        numero = re.sub(r"[\s\.\-\(\)]", "", brut or "") or None
        if numero and numero in vus:
            print(f"\n  [0012] Doublon : numéro {numero} retiré du compte id={user.pk}")
            numero = None
        if numero:
            vus.add(numero)
        if numero != brut:
            User.objects.filter(pk=user.pk).update(number_phone=numero)


class Migration(migrations.Migration):

    dependencies = [
        ("User", "0011_alter_user_profile_picture_length"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="number_phone",
            field=models.CharField(blank=True, max_length=15, null=True),
        ),
        migrations.RunPython(normaliser_et_dedoublonner, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="number_phone",
            field=models.CharField(blank=True, max_length=15, null=True, unique=True),
        ),
    ]
