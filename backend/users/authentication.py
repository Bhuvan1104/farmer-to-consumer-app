import json
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.request import Request


class LenientJWTAuthentication(JWTAuthentication):
    """A tolerant JWTAuthentication that tries multiple places for a token.

    It handles cases where the Authorization header contains an object string
    (e.g. "[object Object]"), or when the token was sent in the request body
    (common in misconfigured frontends). This improves developer DX while
    debugging token format issues.
    """

    def authenticate(self, request: Request):
        # Try normal flow first
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')

        # If header is missing or clearly malformed, try to find token elsewhere
        token_candidate = None

        if not auth_header or '[object Object]' in auth_header or auth_header.strip().startswith('{'):
            # Look in common places: request.data, query params, cookies
            for key in ('access', 'access_token', 'token', 'auth'):
                try:
                    # request.data may not be parsed for GET; use POST-safe access
                    val = request.data.get(key) if hasattr(request, 'data') else None
                except Exception:
                    val = None
                if not val:
                    val = request.query_params.get(key) if hasattr(request, 'query_params') else None
                if not val:
                    val = request.COOKIES.get(key)
                if val:
                    token_candidate = val
                    break

            # If Authorization header contains JSON, try to parse it
            if not token_candidate and auth_header and auth_header.strip().startswith('Bearer {'):
                try:
                    raw = auth_header.split(' ', 1)[1]
                    parsed = json.loads(raw)
                    token_candidate = parsed.get('access') or parsed.get('token')
                except Exception:
                    token_candidate = None

            # If we found a candidate, rewrite the header so parent can decode it
            if token_candidate:
                if isinstance(token_candidate, dict):
                    token_candidate = token_candidate.get('access') or token_candidate.get('token')
                request.META['HTTP_AUTHORIZATION'] = f'Bearer {token_candidate}'

            # If header clearly contains an object placeholder and we couldn't
            # locate a usable token elsewhere, raise a helpful error for the client.
            if ('[object Object]' in auth_header or auth_header.strip().startswith('{')) and not token_candidate:
                raise AuthenticationFailed('Malformed Authorization header: header contains an object rather than a token. Ensure the client sends the raw access token string (e.g. "Bearer <access_token>").')

        # Fall back to the parent implementation which will raise TokenError/Invalid
        try:
            return super().authenticate(request)
        except (InvalidToken, TokenError) as e:
            # Re-raise so DRF can return the usual 401 with detailed message
            raise
