from django.db import migrations, models
import django.db.models.deletion

def generate_usernames(apps, schema_editor):
    User = apps.get_model('api', 'User')
    
    for user in User.objects.filter(username__isnull=True):
        if user.email:
            base_username = user.email.split('@')[0]
            counter = 1
            username = base_username
            while User.objects.filter(username=username).exclude(pk=user.pk).exists():
                username = f"{base_username}{counter}"
                counter += 1
            user.username = username
            user.save()

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_alter_user_managers_alter_user_username'),
    ]

    operations = [
        # First, run the data migration to generate usernames
        migrations.RunPython(generate_usernames, reverse_code=migrations.RunPython.noop),
        
        # Then, make username non-nullable
        migrations.AlterField(
            model_name='user',
            name='username',
            field=models.CharField(max_length=150, unique=True),
        ),
        
        # Update USERNAME_FIELD and REQUIRED_FIELDS
        migrations.AlterModelManagers(
            name='user',
            managers=[
            ],
        ),
    ] 