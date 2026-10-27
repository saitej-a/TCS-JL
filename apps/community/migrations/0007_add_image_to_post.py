# Generated migration for adding image field to Post

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('images', '0001_initial'),
        ('community', '0006_alter_post_category'),
    ]

    operations = [
        migrations.AddField(
            model_name='post',
            name='image',
            field=models.ForeignKey(
                blank=True,
                help_text='Optional image attachment for the post',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='posts',
                to='images.image',
            ),
        ),
    ]
