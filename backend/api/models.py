from django.db import models
from django.contrib.auth.models import User
import os


class College(models.Model):
    name = models.CharField(max_length=200, unique=True)
    location = models.CharField(max_length=200, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class Group(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_groups')
    members = models.ManyToManyField(User, related_name='joined_groups', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-created_at']


class Forum(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_forums')
    participants = models.ManyToManyField(User, related_name='joined_forums', blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    description = models.TextField(max_length=500, blank=True, null=True)
    college_name = models.CharField(max_length=200, blank=True, null=True, help_text="Name of the college/university")
    college = models.ForeignKey(College, on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
    is_admin = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s profile"

    def save(self, *args, **kwargs):
        # Delete old profile picture when updating
        if self.pk:
            try:
                old_instance = UserProfile.objects.get(pk=self.pk)
                if old_instance.profile_picture and self.profile_picture and old_instance.profile_picture != self.profile_picture:
                    print(f"Deleting old profile picture: {old_instance.profile_picture.path}")
                    if os.path.isfile(old_instance.profile_picture.path):
                        os.remove(old_instance.profile_picture.path)
                        print("Old profile picture deleted successfully")
            except UserProfile.DoesNotExist:
                print("Old profile instance not found")
                pass
            except Exception as e:
                print(f"Error deleting old profile picture: {e}")
        
        print(f"Saving profile for user: {self.user.username}")
        print(f"Profile picture: {self.profile_picture}")
        super().save(*args, **kwargs)
        print(f"Profile saved successfully. Picture path: {self.profile_picture.path if self.profile_picture else 'None'}")

    def delete(self, *args, **kwargs):
        # Delete profile picture file when profile is deleted
        if self.profile_picture:
            if os.path.isfile(self.profile_picture.path):
                os.remove(self.profile_picture.path)
        super().delete(*args, **kwargs)


class UserLocation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='locations')
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_online = models.BooleanField(default=True)
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-timestamp']
        unique_together = ('user', 'timestamp')

    def __str__(self):
        return f"{self.user.username} at ({self.latitude}, {self.longitude})"


class ChatConvo(models.Model):
    sender = models.ForeignKey(User, related_name='sent_messages', on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name='received_messages', on_delete=models.CASCADE)
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender} to {self.receiver} at {self.timestamp}"

    class Meta:
        ordering = ['timestamp']  # Order messages by timestamp
        unique_together = ('sender', 'receiver', 'timestamp')  # Prevent duplicate messages



# The cmd migrate is responsible for provision the database so it has the correct tables and everything setup
# ORM Object relational mapping, it writes the model defintion in python and then Django automatically handels
#converting this into the correct database code.
# Inisde of model we define the python version of our models which type of fields we want to store on this model
#on in this data {Note} or table and then Django automatically map it for us {ORM} and add the corresponding rows tables rows Etc...