from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.utils import timezone
from .utils import get_or_create_tab_session, validate_tab_session
from .models import TabSession
import json

class TabSessionMiddleware(MiddlewareMixin):
    """
    Middleware to handle tab session validation and management
    """
    
    def process_request(self, request):
        # Skip for non-API requests
        if not request.path.startswith('/api/'):
            return None
            
        # Skip for authentication endpoints
        if request.path in ['/api/token/', '/api/user/register/']:
            return None
            
        # Get tab-specific headers
        tab_id = request.headers.get('X-Tab-ID')
        session_key = request.headers.get('X-Session-Key')
        user_agent = request.headers.get('X-User-Agent')
        
        # If no tab headers, continue (for backward compatibility)
        if not tab_id or not session_key:
            return None
            
        # For authenticated requests, validate tab session
        if hasattr(request, 'user') and request.user.is_authenticated:
            # Create or update tab session
            try:
                session = get_or_create_tab_session(
                    user=request.user,
                    tab_id=tab_id,
                    session_key=session_key,
                    user_agent=user_agent
                )
                
                # Add session info to request
                request.tab_session = session
                request.tab_id = tab_id
                request.session_key = session_key
                
            except Exception as e:
                print(f"Error managing tab session: {e}")
                # Continue without tab session validation
                pass
                
        return None
    
    def process_response(self, request, response):
        # Add tab session info to response headers for debugging
        if hasattr(request, 'tab_session'):
            response['X-Tab-Session-ID'] = request.tab_session.tab_id
            response['X-Session-Valid'] = 'true'
            
        return response 