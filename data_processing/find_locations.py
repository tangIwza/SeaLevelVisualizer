import pdfplumber
import glob
import re

for f in glob.glob('data_processing/PDF/*.pdf'):
    with pdfplumber.open(f) as pdf:
        found = False
        for p in pdf.pages:
            text = p.extract_text()
            if text:
                lines = text.splitlines()
                data_lines = [l for l in lines if l.strip() and l.strip()[0].isdigit() and len(l.split()) > 10]
                if len(data_lines) > 10: # Found a data page
                    # Look for English words in the first 10 lines
                    header = '\n'.join(lines[:10])
                    eng_words = re.findall(r'[A-Za-z]+(?:\s+[A-Za-z]+)*', header)
                    eng_words = [w.strip() for w in eng_words if len(w.strip()) > 2 and w.strip() not in ['LAT', 'LONG', 'YEAR', 'N', 'E']]
                    if eng_words:
                        print(f"{f}: {eng_words[0]}")
                        found = True
                        break
        if not found:
            print(f"{f}: NOT FOUND")
