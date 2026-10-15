from django.db import migrations, models


class Migration(migrations.Migration):
    """Le champ password (64) tronquait les hash Django (~90 car.) sous MySQL."""

    dependencies = [
        ("User", "0009_signalement"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="password",
            field=models.CharField(max_length=128),
        ),
    ]
