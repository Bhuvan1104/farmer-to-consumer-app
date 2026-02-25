import requests
import sys

BASE='http://127.0.0.1:8000'
USERNAME='farmer1'
PASSWORD='farmerpass'

s=requests.Session()
login=s.post(f'{BASE}/api/auth/login/', json={'username':USERNAME,'password':PASSWORD})
print('login', login.status_code, login.text)
if login.status_code!=200:
    sys.exit(1)

token=login.json().get('access')
headers={'Authorization':f'Bearer {token}'}

files={'image':('test_upload.jpg', b'dummy image bytes', 'image/jpeg')}
data={'name':'Test Product','category':'Vegetables','price':'12.5','quantity':'10'}

r=s.post(f'{BASE}/api/products/', data=data, files=files, headers=headers)
print('upload', r.status_code, r.text)

r2=s.get(f'{BASE}/api/products/', headers=headers)
print('list', r2.status_code, r2.text)
