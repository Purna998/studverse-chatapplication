import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from .models import ChatConvo, Conversation, Message, Group, GroupMember, GroupMessage
from .utils import get_or_create_tab_session, validate_tab_session
from urllib.parse import parse_qsl
import logging
import time

logger = logging.getLogger(__name__)

class ApiConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.message_queue = asyncio.Queue()
        self.processing_task = None
        self.recent_messages = set()  # Track recent messages to prevent duplicates
        self.max_recent_messages = 100  # Keep last 100 messages in memory

    async def connect(self):
        # Get token from query parameters
        query_string = self.scope['query_string'].decode()
        print(f"DEBUG: WebSocket query string: {query_string}")
        
        token = None
        if 'token=' in query_string:
            try:
                token = query_string.split('token=')[1].split('&')[0]
                print(f"DEBUG: Extracted token: {token[:20]}...")
            except Exception as e:
                print(f"DEBUG: Error extracting token: {e}")
        
        if not token:
            logger.warning("WebSocket REJECT: No token provided")
            await self.close(code=4001, reason="No token provided")
            return

        # Authenticate user
        user = await self.get_user_from_token(token)
        if not user:
            logger.warning("WebSocket REJECT: Invalid or expired token")
            await self.close(code=4001, reason="Invalid or expired token")
            return

        self.user = user
        self.username = user.username
        
        # Create user-specific room
        self.room_group_name = f'chat_{user.username}'

        # Join user-specific room
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # Start message processing task
        self.processing_task = asyncio.create_task(self.process_message_queue())

        await self.accept()
        logger.info(f"WebSocket connected for user: {user.username}")

    async def disconnect(self, close_code):
        # Cancel processing task
        if self.processing_task:
            self.processing_task.cancel()
            try:
                await self.processing_task
            except asyncio.CancelledError:
                pass

        # Leave room group only if room_group_name exists
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    # Receive message from WebSocket - ULTRA FAST PATH
    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            
            # Handle ping/pong for connection health
            if text_data_json.get('type') == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': text_data_json.get('timestamp', asyncio.get_event_loop().time())
                }))
                return
            
            # Handle regular messages
            message = text_data_json['message']
            sender = text_data_json['sender']
            receiver = text_data_json['receiver']
            
            # Use the timestamp from the frontend or generate a new one
            frontend_timestamp = text_data_json.get('timestamp')
            if frontend_timestamp:
                # Frontend sends milliseconds, convert to seconds for consistency
                server_timestamp = frontend_timestamp / 1000
                logger.info(f"Using frontend timestamp: {frontend_timestamp}ms -> {server_timestamp}s")
            else:
                # Fallback to server timestamp
                server_timestamp = asyncio.get_event_loop().time()
                logger.info(f"Using server timestamp: {server_timestamp}s")
            
            # Generate unique message ID for tracking
            message_id = f"{sender}_{receiver}_{int(server_timestamp * 1000)}"
            
            # Check for duplicate messages
            if message_id in self.recent_messages:
                logger.info(f"Duplicate message detected, ignoring: {message_id}")
                return
            
            # Add to recent messages
            self.recent_messages.add(message_id)
            if len(self.recent_messages) > self.max_recent_messages:
                # Remove oldest messages
                self.recent_messages = set(list(self.recent_messages)[-self.max_recent_messages:])
            
            # IMMEDIATE delivery to receiver (before database save)
            if receiver != sender:  # Don't send to receiver if it's the same as sender
                await self.channel_layer.group_send(
                    f'chat_{receiver}',
                    {
                        'type': 'chat_message',
                        'message': message,
                        'sender': sender,
                        'receiver': receiver,
                        'message_id': message_id,
                        'timestamp': server_timestamp
                    }
                )

            # IMMEDIATE confirmation to sender via group message
            await self.channel_layer.group_send(
                f'chat_{sender}',
                {
                    'type': 'chat_message',
                    'message': message,
                    'sender': sender,
                    'receiver': receiver,
                    'message_id': message_id,
                    'timestamp': server_timestamp
                }
            )
            
            logger.info(f"Message sent to receiver: {receiver}, confirmation sent to sender: {sender}")

            # Queue database save for background processing (non-blocking)
            await self.message_queue.put({
                'sender': sender,
                'receiver': receiver,
                'message': message,
                'message_id': message_id
            })

        except Exception as e:
            logger.error(f"Error processing message: {e}")
            # Send error back to sender
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Failed to send message'
            }))

    # Background message processing
    async def process_message_queue(self):
        while True:
            try:
                # Process messages in batches for efficiency
                messages_to_save = []
                
                # Collect up to 10 messages or wait 100ms
                try:
                    message_data = await asyncio.wait_for(self.message_queue.get(), timeout=0.1)
                    messages_to_save.append(message_data)
                    
                    # Try to get more messages without blocking
                    while len(messages_to_save) < 10:
                        try:
                            message_data = self.message_queue.get_nowait()
                            messages_to_save.append(message_data)
                        except asyncio.QueueEmpty:
                            break
                            
                except asyncio.TimeoutError:
                    continue

                # Save messages to database in batch
                if messages_to_save:
                    await self.save_messages_batch(messages_to_save)
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in message processing: {e}")

    # Receive message from room group - OPTIMIZED
    async def chat_message(self, event):
        try:
            # Check for duplicate messages using message_id
            message_id = event.get('message_id')
            if message_id and message_id in self.recent_messages:
                logger.info(f"Duplicate message in chat_message, ignoring: {message_id}")
                return
            
            # Add to recent messages if not already present
            if message_id:
                self.recent_messages.add(message_id)
                if len(self.recent_messages) > self.max_recent_messages:
                    self.recent_messages = set(list(self.recent_messages)[-self.max_recent_messages:])
            
            # Log timestamp being sent
            logger.info(f"Sending message with timestamp: {event.get('timestamp')}s to {event.get('receiver')}")
            
            # Determine message type based on whether this is the sender or receiver
            current_user = self.username
            sender = event['sender']
            receiver = event['receiver']
            
            # Check if this is a message_sent type from the backend
            if event.get('message_type') == 'message_sent':
                message_type = 'message_sent'
            else:
                message_type = 'message_sent' if current_user == sender else 'message'
            
            is_new_conversation = event.get('is_new_conversation', False)
            
            # Enhanced message data with more information
            message_data = {
                'type': message_type,
                'message': event['message'],
                'sender': event['sender'],
                'receiver': event['receiver'],
                'message_id': event.get('message_id'),
                'timestamp': event.get('timestamp'),
                'conversation_id': event.get('conversation_id'),
                'is_new_conversation': is_new_conversation,
                'sender_full_name': event.get('sender_full_name', sender),
                'sender_email': event.get('sender_email', ''),
                'receiver_full_name': receiver,  # Will be updated by frontend
                'receiver_email': event.get('receiver_email', '')
            }
            
            # Send message to WebSocket with enhanced data
            await self.send(text_data=json.dumps(message_data))
            
            # If this is a new conversation and the current user is the receiver,
            # send a conversation refresh notification
            if is_new_conversation and current_user == receiver:
                refresh_data = {
                    'type': 'conversation_refresh',
                    'message': 'New conversation created',
                    'conversation_id': event.get('conversation_id'),
                    'sender': event['sender'],
                    'sender_full_name': event.get('sender_full_name', sender),
                    'sender_email': event.get('sender_email', ''),
                    'timestamp': event.get('timestamp')
                }
                await self.send(text_data=json.dumps(refresh_data))
                logger.info(f"Conversation refresh sent to {current_user} for new conversation {event.get('conversation_id')}")
            
            logger.info(f"Message sent successfully to WebSocket: {event['sender']} -> {event['receiver']} (type: {message_type}, new_conversation: {is_new_conversation})")
            logger.info(f"Message data: {message_data}")
        except Exception as e:
            logger.error(f"Error sending message to WebSocket: {e}")

    @database_sync_to_async
    def save_messages_batch(self, messages_data):
        """Save multiple messages to database efficiently"""
        try:
            for msg_data in messages_data:
                sender = User.objects.get(username=msg_data['sender'])
                receiver = User.objects.get(username=msg_data['receiver'])
                
                # Find or create conversation using participants
                conversation = None
                try:
                    # Try to find existing conversation between these two users
                    conversation = Conversation.objects.filter(
                        participants=sender
                    ).filter(
                        participants=receiver
                    ).first()
                except Exception as e:
                    logger.error(f"Error finding conversation: {e}")
                
                if not conversation:
                    # Create new conversation
                    conversation = Conversation.objects.create()
                    conversation.participants.add(sender, receiver)
                
                # Create the message
                Message.objects.create(
                    conversation=conversation,
                    sender=sender,
                    content=msg_data['message']
                )
                
        except Exception as e:
            logger.error(f"Error saving messages batch: {e}")

    @database_sync_to_async
    def save_message_new(self, sender_username, receiver_username, message):
        try:
            sender = User.objects.get(username=sender_username)
            receiver = User.objects.get(username=receiver_username)
            
            # Find or create conversation using participants
            conversation = None
            try:
                # Try to find existing conversation between these two users
                conversation = Conversation.objects.filter(
                    participants=sender
                ).filter(
                    participants=receiver
                ).first()
            except Exception as e:
                logger.error(f"Error finding conversation: {e}")
            
            if not conversation:
                # Create new conversation
                conversation = Conversation.objects.create()
                conversation.participants.add(sender, receiver)
            
            # Create the message
            message_obj = Message.objects.create(
                conversation=conversation,
                sender=sender,
                content=message
            )
            
            return conversation.id
        except User.DoesNotExist:
            return None

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            User = get_user_model()
            user = User.objects.get(id=user_id)
            logger.info(f"Token validation successful for user: {user.username}")
            return user
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            return None

    @database_sync_to_async
    def save_message(self, sender_username, receiver_username, message):
        try:
            sender = User.objects.get(username=sender_username)
            receiver = User.objects.get(username=receiver_username)
            ChatConvo.objects.create(
                sender=sender,
                receiver=receiver,
                message=message
            )
        except User.DoesNotExist:
            pass


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Check if this is a general chat connection or room-based
        if 'room_name' in self.scope['url_route']['kwargs']:
            self.room_name = self.scope['url_route']['kwargs']['room_name']
            self.room_group_name = 'chat_%s' % self.room_name
        else:
            # General chat connection
            self.room_name = 'general'
            self.room_group_name = 'chat_general'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message
            }
        )

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message
        }))


class GroupChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_id = self.scope['url_route']['kwargs']['group_id']
        self.room_group_name = f'group_{self.group_id}'
        
        # Get token from query parameters
        query_string = self.scope.get('query_string', b'').decode()
        query_params = dict(parse_qsl(query_string))
        token = query_params.get('token')
        
        if not token:
            await self.close()
            return
        
        # Validate token and get user
        self.user = await self.get_user_from_token(token)
        if not self.user:
            await self.close()
            return

        # Check if user is a member of the group
        is_member = await self.is_group_member(self.user, self.group_id)
        if not is_member:
            await self.close()
            return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': f'Connected to group {self.group_id}'
        }))

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    @database_sync_to_async
    def is_group_member(self, user, group_id):
        try:
            group = Group.objects.get(id=group_id)
            return group.members.filter(user=user).exists()
        except Group.DoesNotExist:
            return False

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            User = get_user_model()
            user = User.objects.get(id=user_id)
            print(f"Token validation successful for user: {user.username}")
            return user
        except Exception as e:
            print(f"Token validation error: {e}")
            return None

    @database_sync_to_async
    def save_group_message(self, group_id, sender, message, attachment=None):
        try:
            group = Group.objects.get(id=group_id)
            message_obj = GroupMessage.objects.create(
                group=group,
                sender=sender,
                message=message,
                attachment=attachment
            )
            return {
                'id': message_obj.id,
                'sender_username': message_obj.sender.username,
                'sender_first_name': message_obj.sender.first_name,
                'sender_last_name': message_obj.sender.last_name,
                'message': message_obj.message,
                'timestamp': message_obj.timestamp.isoformat(),
                'attachment_url': message_obj.attachment.url if message_obj.attachment else None
            }
        except Group.DoesNotExist:
            return None

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type', 'message')
        message = text_data_json.get('message', '')

        if message_type == 'message':
            # Save message to database
            message_data = await self.save_group_message(
                self.group_id, 
                self.user, 
                message
            )

            if message_data:
                # Send message to room group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'group_message',
                        'message': message_data
                    }
                )

    # Receive message from room group
    async def group_message(self, event):
        message_data = event['message']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'group_message',
            'message': message_data
        })) 