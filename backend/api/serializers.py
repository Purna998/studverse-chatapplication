from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import (
    College, Group, GroupMember, GroupMessage, Forum, ForumMember, ForumChannel, ForumChannelMessage, ChatConvo, 
    UserProfile, TabSession, Conversation, Message
)
import os

User = get_user_model()


class CollegeSerializer(serializers.ModelSerializer):
    class Meta:
        model = College
        fields = '__all__'


class GroupSerializer(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source='created_by.username')
    member_count = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()
    
    class Meta:
        model = Group
        fields = ['id', 'name', 'description', 'image', 'created_by', 'created_at', 'updated_at', 'member_count', 'is_member', 'is_admin']
    
    def get_member_count(self, obj):
        return obj.members.count()
    
    def get_is_member(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.members.filter(user=request.user).exists()
        return False
    
    def get_is_admin(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.members.filter(user=request.user, role='admin').exists()
        return False


class GroupMemberSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    email = serializers.ReadOnlyField(source='user.email')
    first_name = serializers.ReadOnlyField(source='user.first_name')
    last_name = serializers.ReadOnlyField(source='user.last_name')
    profile_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = GroupMember
        fields = ['id', 'user', 'username', 'email', 'first_name', 'last_name', 'profile_picture', 'role', 'joined_at']
    
    def get_profile_picture(self, obj):
        try:
            if obj.user.profile.profile_picture:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.user.profile.profile_picture.url)
                return obj.user.profile.profile_picture.url
            return None
        except:
            return None


class GroupMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.ReadOnlyField(source='sender.username')
    sender_first_name = serializers.ReadOnlyField(source='sender.first_name')
    sender_last_name = serializers.ReadOnlyField(source='sender.last_name')
    sender_profile_picture = serializers.SerializerMethodField()
    attachment_url = serializers.SerializerMethodField()
    
    class Meta:
        model = GroupMessage
        fields = ['id', 'group', 'sender', 'sender_username', 'sender_first_name', 'sender_last_name', 'sender_profile_picture', 'message', 'attachment', 'attachment_url', 'timestamp']
    
    def get_sender_profile_picture(self, obj):
        try:
            if obj.sender.profile.profile_picture:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.sender.profile.profile_picture.url)
                return obj.sender.profile.profile_picture.url
            return None
        except:
            return None
    
    def get_attachment_url(self, obj):
        if obj.attachment:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.attachment.url)
            return obj.attachment.url
        return None


class ForumSerializer(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source='created_by.username')
    channel_count = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    participant_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Forum
        fields = ['id', 'title', 'description', 'image', 'image_url', 'created_by', 'created_at', 'updated_at', 'channel_count', 'participant_count']
    
    def get_channel_count(self, obj):
        return obj.channels.count()

    def get_image_url(self, obj):
        try:
            if obj.image:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.image.url)
                return obj.image.url
        except:
            pass
        return None

    def get_participant_count(self, obj):
        return obj.members.count()


class ForumMemberSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    email = serializers.ReadOnlyField(source='user.email')

    class Meta:
        model = ForumMember
        fields = ['id', 'forum', 'user', 'username', 'email', 'role', 'joined_at']


class ForumChannelSerializer(serializers.ModelSerializer):
    forum_title = serializers.ReadOnlyField(source='forum.title')
    created_by = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = ForumChannel
        fields = ['id', 'forum', 'forum_title', 'name', 'created_by', 'created_at', 'updated_at']


class ForumChannelMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.ReadOnlyField(source='sender.username')
    sender_profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = ForumChannelMessage
        fields = ['id', 'channel', 'sender', 'sender_username', 'sender_profile_picture', 'content', 'timestamp']
    
    def get_sender_profile_picture(self, obj):
        try:
            if obj.sender.profile.profile_picture:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.sender.profile.profile_picture.url)
                return obj.sender.profile.profile_picture.url
            return None
        except:
            return None


class ChatConvoSerializer(serializers.ModelSerializer):
    sender_username = serializers.ReadOnlyField(source='sender.username')
    receiver_username = serializers.ReadOnlyField(source='receiver.username')
    
    class Meta:
        model = ChatConvo
        fields = '__all__'


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['description', 'college_name']


class TabSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TabSession
        fields = '__all__'


class ConversationSerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'last_message', 'other_participant', 'created_at', 'updated_at']
    
    def get_participants(self, obj):
        request = self.context.get('request')
        participants_data = []
        for participant in obj.participants.all():
            participant_data = {
                'id': participant.id,
                'username': participant.username,
                'email': participant.email,
                'first_name': participant.first_name,
                'last_name': participant.last_name,
                'full_name': participant.get_full_name() or participant.username,
                'profile_picture': None
            }
            
            # Get profile picture
            try:
                if hasattr(participant, 'profile') and participant.profile.profile_picture:
                    if request:
                        participant_data['profile_picture'] = request.build_absolute_uri(participant.profile.profile_picture.url)
                    else:
                        participant_data['profile_picture'] = participant.profile.profile_picture.url
            except:
                pass
            
            participants_data.append(participant_data)
        return participants_data
    
    def get_last_message(self, obj):
        try:
            last_message = obj.messages.order_by('-timestamp').first()
            if last_message:
                return {
                    'id': last_message.id,
                    'content': last_message.content,
                    'sender_id': last_message.sender.id,
                    'sender_username': last_message.sender.username,
                    'timestamp': last_message.timestamp,
                    'is_read': last_message.is_read
                }
            return None
        except:
            return None
    
    def get_other_participant(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        
        # Get the other participant (not the current user)
        other_participant = obj.participants.exclude(id=request.user.id).first()
        if other_participant:
            other_data = {
                'id': other_participant.id,
                'username': other_participant.username,
                'email': other_participant.email,
                'first_name': other_participant.first_name,
                'last_name': other_participant.last_name,
                'full_name': other_participant.get_full_name() or other_participant.username,
                'profile_picture': None
            }
            
            # Get profile picture
            try:
                if hasattr(other_participant, 'profile') and other_participant.profile.profile_picture:
                    if request:
                        other_data['profile_picture'] = request.build_absolute_uri(other_participant.profile.profile_picture.url)
                    else:
                        other_data['profile_picture'] = other_participant.profile.profile_picture.url
            except:
                pass
            
            return other_data
        return None


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.ReadOnlyField(source='sender.username')
    sender_full_name = serializers.SerializerMethodField()
    sender_profile_picture = serializers.SerializerMethodField()
    attachment_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_username', 'sender_full_name', 'sender_profile_picture', 'content', 'attachment', 'attachment_url', 'attachment_type', 'timestamp', 'is_read']
    
    def get_sender_full_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.username
    
    def get_sender_profile_picture(self, obj):
        try:
            if obj.sender.profile.profile_picture:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.sender.profile.profile_picture.url)
                return obj.sender.profile.profile_picture.url
            return None
        except:
            return None
    
    def get_attachment_url(self, obj):
        if obj.attachment:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.attachment.url)
            return obj.attachment.url
        return None


class UserSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    college_name = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'profile_picture', 'description', 'college_name', 'is_admin']
    
    def get_profile_picture(self, obj):
        try:
            if hasattr(obj, 'profile') and obj.profile.profile_picture:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.profile.profile_picture.url)
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
            # Check both User model is_admin field and UserProfile is_admin field
            user_is_admin = getattr(obj, 'is_admin', False)
            profile_is_admin = False
            if hasattr(obj, 'profile') and obj.profile:
                profile_is_admin = obj.profile.is_admin
            return user_is_admin or profile_is_admin
        except:
            return False

    def create(self, validated_data):
        # Extract password and other fields
        password = validated_data.pop('password', None)
        
        # Create user with create_user method (this handles password hashing)
        user = User.objects.create_user(
            username=validated_data.get('username'),
            email=validated_data.get('email'),
            password=password,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            **{k: v for k, v in validated_data.items() if k not in ['username', 'email', 'first_name', 'last_name']}
        )
        
        # Create user profile
        UserProfile.objects.create(user=user)
        return user
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value