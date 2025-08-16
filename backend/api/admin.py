from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, College, Group, GroupMember, GroupMessage, Forum, ChatConvo, UserProfile, TabSession, Conversation, Message

# Restrict admin site access to superusers only
admin.site.has_permission = lambda request: bool(request.user and request.user.is_active and request.user.is_superuser)

# Register your models here.

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'full_name', 'is_superuser', 'is_staff', 'is_admin', 'is_google_user', 'is_active')
    list_filter = ('is_superuser', 'is_staff', 'is_admin', 'is_google_user', 'is_active')
    search_fields = ('username', 'email', 'full_name')
    ordering = ('username',)
    
    fieldsets = UserAdmin.fieldsets + (
        ('StudVerse Info', {'fields': ('full_name', 'profile_picture', 'is_admin', 'is_google_user', 'google_id', 'location_lat', 'location_lng', 'last_location_update')}),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('StudVerse Info', {'fields': ('full_name', 'profile_picture', 'is_admin', 'is_google_user', 'google_id')}),
    )
    
    def get_queryset(self, request):
        """Show all users to superusers, filtered for staff"""
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(is_staff=True)

@admin.register(College)
class CollegeAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'created_at')
    search_fields = ('name', 'location')
    ordering = ('name',)

@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_by', 'created_at', 'updated_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'description', 'created_by__email')
    ordering = ('-created_at',)

@admin.register(GroupMember)
class GroupMemberAdmin(admin.ModelAdmin):
    list_display = ('group', 'user', 'role', 'joined_at')
    list_filter = ('role', 'joined_at')
    search_fields = ('group__name', 'user__email')
    ordering = ('-joined_at',)

@admin.register(GroupMessage)
class GroupMessageAdmin(admin.ModelAdmin):
    list_display = ('group', 'sender', 'message', 'timestamp')
    list_filter = ('timestamp',)
    search_fields = ('message', 'group__name', 'sender__email')
    ordering = ('-timestamp',)

@admin.register(Forum)
class ForumAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_by', 'created_at', 'updated_at')
    list_filter = ('created_at',)
    search_fields = ('title', 'description', 'created_by__email')
    ordering = ('-created_at',)

@admin.register(ChatConvo)
class ChatConvoAdmin(admin.ModelAdmin):
    list_display = ('sender', 'receiver', 'message', 'timestamp', 'is_read')
    list_filter = ('is_read', 'timestamp')
    search_fields = ('message', 'sender__email', 'receiver__email')
    ordering = ('-timestamp',)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'college_name', 'is_admin', 'location_lat', 'location_lng')
    list_filter = ('is_admin',)
    search_fields = ('user__email', 'college_name', 'description')
    ordering = ('user__email',)

@admin.register(TabSession)
class TabSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'tab_id', 'is_active', 'last_activity', 'created_at')
    list_filter = ('is_active', 'last_activity', 'created_at')
    search_fields = ('user__email', 'tab_id')
    ordering = ('-last_activity',)

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    ordering = ('-updated_at',)

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'sender', 'content', 'timestamp', 'is_read')
    list_filter = ('is_read', 'timestamp', 'attachment_type')
    search_fields = ('content', 'sender__email')
    ordering = ('-timestamp',)
