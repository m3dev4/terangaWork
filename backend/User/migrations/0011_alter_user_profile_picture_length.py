from django.db import migrations, models


class Migration(migrations.Migration):
    """L'URL Cloudinary (> 100 caractères) était tronquée sous MySQL."""

    dependencies = [
        ("User", "0010_alter_user_password_length"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="profile_picture",
            field=models.ImageField(
                blank=True, max_length=500, null=True, upload_to="profile_pictures/"
            ),
        ),
    ]
