from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="device",
            name="device_type",
            field=models.CharField(
                choices=[
                    ("WEB", "Web Browser"),
                    ("FIREBASE_WEB", "Web Browser (Firebase)"),
                    ("ANDROID", "Android Web/PWA"),
                    ("IOS", "iOS Web/PWA"),
                    ("OTHER", "Other"),
                ],
                default="WEB",
                max_length=16,
            ),
        ),
    ]
