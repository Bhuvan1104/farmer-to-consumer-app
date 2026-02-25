import requests
import sys

BASE = 'http://127.0.0.1:8000'

s = requests.Session()
print('Logging in...')
login = s.post(BASE + '/api/auth/login/', json={'username':'testuser','password':'testpass123'})
print('login', login.status_code)
if not login.ok:
    print(login.text)
    sys.exit(1)

tokens = login.json()
access = tokens.get('access')
refresh = tokens.get('refresh')
print('access length', len(access or ''))
print('refresh length', len(refresh or ''))

# successful request with correct access
r = s.get(BASE + '/api/products/', headers={'Authorization': f'Bearer {access}'})
print('products with good access', r.status_code)

# simulate bad access to force refresh
bad_access = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.bad.invalidsig'
r2 = s.get(BASE + '/api/products/', headers={'Authorization': f'Bearer {bad_access}'})
print('products with bad access', r2.status_code, r2.text[:200])

# attempt refresh
ref = s.post(BASE + '/api/token/refresh/', json={'refresh': refresh})
print('refresh status', ref.status_code, ref.text[:200])
if ref.ok:
    new_access = ref.json().get('access')
    r3 = s.get(BASE + '/api/products/', headers={'Authorization': f'Bearer {new_access}'})
    print('products after refresh', r3.status_code)
    print(r3.text[:300])
else:
    print('refresh failed')
