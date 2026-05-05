import requests
from pathlib import Path

path = Path(__file__).resolve().parents[0] / 'uploads' / 'Amulya resume-7181030859565120486.pdf'
print('sending', path)
with open(path, 'rb') as f:
    files = {'file': (path.name, f, 'application/pdf')}
    data = {'job_description': 'Software Engineer'}
    resp = requests.post('http://localhost:8000/api/analyze', files=files, data=data)
    print('status:', resp.status_code)
    print(resp.text)
