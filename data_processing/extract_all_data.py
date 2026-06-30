import pdfplumber
import json
import os
import glob
import re

current_dir = os.path.dirname(os.path.abspath(__file__))
pdf_dir = os.path.join(current_dir, "PDF")
output_file = os.path.join(current_dir, "..", "public", "tide_data.json")

all_locations_data = []

print(f"Searching for PDFs in: {pdf_dir}")
pdf_files = glob.glob(os.path.join(pdf_dir, "*.pdf"))

for pdf_file in pdf_files:
    basename = os.path.basename(pdf_file)
    location_id = basename.replace('2026.pdf', '')
    print(f"Processing {location_id}...")
    
    location_name = None
    lat = None
    lng = None
    monthly_tide_data = []
    month_index = 1
    
    with pdfplumber.open(pdf_file) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if not text:
                continue
                
            # Try to extract the location name if not found yet
            if not location_name and "(Lat)" in text and "HOURS" in text:
                lines = text.splitlines()
                for j, line in enumerate(lines):
                    if "(Lat)" in line or "Lat " in line:
                        loc_line = lines[j-1]
                        loc_name_clean = re.sub(r'\d+', '', loc_line).strip()
                        eng_name_match = re.search(r'[A-Za-z\s\(\)]+', loc_name_clean)
                        if eng_name_match:
                            location_name = eng_name_match.group(0).strip()
                        else:
                            location_name = loc_line.strip()
                        
                        # Parse Lat Long
                        # Example: еԨٴ (Lat) 12 40' 22" .(N) ͧԨٴ (Long) 101 08' 20" .(E)
                        matches = re.findall(r'(\d+)', line)
                        if len(matches) >= 6:
                            lat_deg, lat_min, lat_sec = float(matches[0]), float(matches[1]), float(matches[2])
                            lng_deg, lng_min, lng_sec = float(matches[3]), float(matches[4]), float(matches[5])
                            lat = lat_deg + (lat_min / 60) + (lat_sec / 3600)
                            lng = lng_deg + (lng_min / 60) + (lng_sec / 3600)
                        break
            
            # Look for tide data table on the page
            if "HOURS" in text and "HEIGHTS OF WATER" in text:
                month_obj = {
                    "month": month_index,
                    "days": []
                }
                
                for line in text.splitlines():
                    parts = line.strip().split()
                    if parts and parts[0].isdigit():
                        numeric_parts = []
                        for p in parts:
                            try:
                                val = float(p)
                                numeric_parts.append(val)
                            except ValueError:
                                pass
                        
                        # A valid tide data line has the day and 24 hourly readings (>= 25 numbers)
                        if len(numeric_parts) >= 25:
                            day_num = int(numeric_parts[0])
                            hours = numeric_parts[1:25]
                            month_obj["days"].append({
                                "day": day_num,
                                "hours": hours
                            })
                
                if month_obj["days"]:
                    monthly_tide_data.append(month_obj)
                    month_index += 1

    if location_name and monthly_tide_data:
        all_locations_data.append({
            "id": location_id,
            "name": location_name,
            "lat": lat,
            "lng": lng,
            "data": monthly_tide_data
        })
        print(f"Successfully parsed {location_name} with {len(monthly_tide_data)} months. Lat: {lat}, Lng: {lng}")
    else:
        print(f"Warning: Failed to parse data for {location_id}")

# Sort alphabetically by name
all_locations_data.sort(key=lambda x: x["name"])

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(all_locations_data, f, indent=2)

print(f"Successfully extracted {len(all_locations_data)} locations to {output_file}")
