import pdfplumber
import glob
import re
import os

locations = {}

for f in glob.glob('data_processing/PDF/*.pdf'):
    basename = os.path.basename(f)
    location_id = basename.replace('2026.pdf', '')
    with pdfplumber.open(f) as pdf:
        for p in pdf.pages:
            text = p.extract_text()
            if text and "(Lat)" in text and "HOURS" in text:
                lines = text.splitlines()
                # Find the line with "(Lat)"
                for i, line in enumerate(lines):
                    if "(Lat)" in line or "Lat " in line:
                        # The location name is usually the line before
                        # Filter out numbers and thai characters if possible
                        loc_line = lines[i-1]
                        # Remove digits from the line
                        loc_name = re.sub(r'\d+', '', loc_line).strip()
                        # Extract only English letters, spaces, parentheses
                        eng_name_match = re.search(r'[A-Za-z\s\(\)]+', loc_name)
                        if eng_name_match:
                            loc_name = eng_name_match.group(0).strip()
                        else:
                            loc_name = loc_line
                        locations[location_id] = loc_name
                        break
                break

print(locations)
