import pdfplumber
import json
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
pdf_file = os.path.join(current_dir, "MT2026.pdf")
output_file = os.path.join(current_dir, "..", "public", "tide_data.json")

monthly_tide_data = []
month_index = 1

with pdfplumber.open(pdf_file) as pdf:
    for i, page in enumerate(pdf.pages):
        text = page.extract_text()
        
        if text and "Map Ta Phut" in text:
            print(f"Found Map Ta Phut on page {i}")
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

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(monthly_tide_data, f, indent=2)

print(f"Successfully extracted {len(monthly_tide_data)} months to {output_file}")
