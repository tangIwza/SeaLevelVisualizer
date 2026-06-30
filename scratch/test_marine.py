import urllib.request
import json

url = "https://marine-api.open-meteo.com/v1/marine?latitude=12.6&longitude=100.9&hourly=wave_height&timezone=Asia%2FBangkok&start_date=2026-07-08&end_date=2026-07-08"

req = urllib.request.Request(url)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        print(json.dumps(data, indent=2))
except Exception as e:
    print(e)
