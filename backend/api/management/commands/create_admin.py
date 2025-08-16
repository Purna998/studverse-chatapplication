from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Create admin users with proper permissions'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default='admin')
        parser.add_argument('--email', type=str, default='admin@studverse.com')
        parser.add_argument('--password', type=str, default='admin123')
        parser.add_argument('--superuser', action='store_true', help='Create superuser')
        parser.add_argument('--staff', action='store_true', help='Create staff user')
        parser.add_argument('--admin', action='store_true', help='Create admin user')

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password']
        is_superuser = options['superuser']
        is_staff = options['staff']
        is_admin = options['admin']

        # Check if user already exists
        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'User with username "{username}" already exists!')
            )
            return

        if User.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.WARNING(f'User with email "{email}" already exists!')
            )
            return

        try:
            if is_superuser:
                user = User.objects.create_superuser(
                    username=username,
                    email=email,
                    password=password,
                    is_admin=True
                )
                self.stdout.write(
                    self.style.SUCCESS(f'Superuser created successfully: {username}')
                )
            elif is_staff:
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    is_staff=True,
                    is_admin=True
                )
                self.stdout.write(
                    self.style.SUCCESS(f'Staff user created successfully: {username}')
                )
            elif is_admin:
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    is_admin=True
                )
                self.stdout.write(
                    self.style.SUCCESS(f'Admin user created successfully: {username}')
                )
            else:
                # Default: create superuser
                user = User.objects.create_superuser(
                    username=username,
                    email=email,
                    password=password,
                    is_admin=True
                )
                self.stdout.write(
                    self.style.SUCCESS(f'Superuser created successfully: {username}')
                )

            self.stdout.write(f'Username: {user.username}')
            self.stdout.write(f'Email: {user.email}')
            self.stdout.write(f'Password: {password}')
            self.stdout.write(f'Is Superuser: {user.is_superuser}')
            self.stdout.write(f'Is Staff: {user.is_staff}')
            self.stdout.write(f'Is Admin: {user.is_admin}')

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating user: {e}')
            ) 