from django.core.validators import MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("mission", "0006_alter_mission_status")]

    operations = [
        migrations.AlterField(
            model_name="mission",
            name="budget",
            field=models.IntegerField(validators=[MinValueValidator(10000)]),
        ),
    ]
