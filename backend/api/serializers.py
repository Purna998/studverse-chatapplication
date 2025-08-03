from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UserProfile, College, Group, Forum
import os


class CollegeSerializer(serializers.ModelSerializer):
    class Meta:
        model = College
        fields = ['id', 'name', 'location']


class GroupSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ['id', 'name', 'description', 'created_by', 'created_by_username', 'member_count', 'created_at', 'updated_at']

    def get_member_count(self, obj):
        return obj.members.count()


class ForumSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    participant_count = serializers.SerializerMethodField()

    class Meta:
        model = Forum
        fields = ['id', 'title', 'description', 'created_by', 'created_by_username', 'participant_count', 'is_active', 'created_at', 'updated_at']

    def get_participant_count(self, obj):
        return obj.participants.count()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['profile_picture', 'description', 'college_name', 'college', 'is_admin', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    college_name = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'profile_picture', 'description', 'college_name', 'is_admin', 'password']
        extra_kwargs = {
            'password': {'write_only': True}  # Password should not be returned in responses
        }

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_profile_picture(self, obj):
        try:
            if hasattr(obj, 'profile') and obj.profile.profile_picture:
                return obj.profile.profile_picture.url
            return None
        except:
            return None

    def get_description(self, obj):
        try:
            if hasattr(obj, 'profile') and obj.profile.description:
                return obj.profile.description
            return None
        except:
            return None

    def get_college_name(self, obj):
        try:
            if hasattr(obj, 'profile') and obj.profile.college_name:
                return obj.profile.college_name
            return None
        except:
            return None

    def get_is_admin(self, obj):
        try:
            if hasattr(obj, 'profile'):
                return obj.profile.is_admin
            return False
        except:
            return False

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        # Create a profile for the new user
        UserProfile.objects.create(user=user)
        return user
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['profile_picture', 'description', 'college_name', 'college', 'is_admin']

    def update(self, instance, validated_data):
        # Handle profile picture update
        if 'profile_picture' in validated_data:
            # Delete old profile picture if it exists
            if instance.profile_picture:
                try:
                    if os.path.isfile(instance.profile_picture.path):
                        os.remove(instance.profile_picture.path)
                except:
                    pass
            instance.profile_picture = validated_data['profile_picture']
        
        # Handle description update
        if 'description' in validated_data:
            instance.description = validated_data['description']
        
        # Handle college_name update
        if 'college_name' in validated_data:
            instance.college_name = validated_data['college_name']
        
        # Handle college update
        if 'college' in validated_data:
            instance.college = validated_data['college']
        
        # Handle is_admin update
        if 'is_admin' in validated_data:
            instance.is_admin = validated_data['is_admin']
        
        instance.save()
        return instance