from django.db import migrations, models
from django.db.models import F


def mark_existing_mission_deadlines(apps, schema_editor):
    Proposition = apps.get_model("proposition", "Proposition")
    Proposition.objects.using(schema_editor.connection.alias).filter(
        mission__date_deadline__isnull=False,
        date_livraison=F("mission__date_deadline"),
    ).update(currentDate=True)


class Migration(migrations.Migration):
    dependencies = [("proposition", "0006_merge_20260921_1242")]

    operations = [
        migrations.AddField(
            model_name="proposition",
            name="currentDate",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(mark_existing_mission_deadlines, migrations.RunPython.noop),
    ]
