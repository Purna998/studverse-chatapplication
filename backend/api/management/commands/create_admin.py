from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import UserProfile, College

class Command(BaseCommand):
    help = 'Create The Kaizen admin user'

    def handle(self, *args, **options):
        # Create The Kaizen user
        username = 'thekaizen'
        email = 'thekaizen@studverse.com'
        
        # Check if user already exists
        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'User "{username}" already exists. Skipping creation.')
            )
            return
        
        # Create user
        user = User.objects.create_user(
            username=username,
            email=email,
            password='admin123',  # You should change this password
            first_name='The',
            last_name='Kaizen'
        )
        
        # Create admin profile
        profile = UserProfile.objects.create(
            user=user,
            is_admin=True,
            description='System Administrator',
            college_name='StudVerse University'
        )
        
        # Create some sample colleges
        colleges = [
            {'name': 'StudVerse University', 'location': 'Digital Campus'},
            {'name': 'Tech Institute', 'location': 'Silicon Valley'},
            {'name': 'Business School', 'location': 'New York'},
            {'name': 'Engineering College', 'location': 'Boston'},
        ]
        
        for college_data in colleges:
            if not College.objects.filter(name=college_data['name']).exists():
                College.objects.create(**college_data)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created admin user "{username}" with password "admin123"'
            )
        )
        self.stdout.write(
            self.style.SUCCESS('Admin user can now access the admin panel')
        ) 