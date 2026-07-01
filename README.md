# Sea Level Visualizer

Sea Level Visualizer is a web-based interactive application designed to visualize sea level and tide data. Built with React, TypeScript, and Vite, the app parses official tide table PDFs and displays them interactively on an interactive map along with detailed charts.

## Features

- **Interactive Maps**: Browse and select locations from a geographic map using React Leaflet.
- **Tide Data Charts**: Interactive time-series charts visualizing hourly tide heights using Recharts.
- **Lunar Phases**: View the lunar phase associated with any given date.
- **Weather & Wave Data**: Modals integrating local weather and wave forecasts.
- **Data Processing Pipeline**: Python scripts leveraging `pdfplumber` to automatically extract structural tide data from standard PDF documents into a structured JSON format.
- **PWA Support**: Installable progressive web app capabilities for offline access and native-like experience.

## Tech Stack

### Frontend
- **Framework:** React 19, TypeScript, Vite
- **Mapping:** Leaflet, React Leaflet
- **Charts:** Recharts
- **Icons:** Lucide React
- **Utils:** Suncalc (for lunar/solar calculations)
- **PWA:** vite-plugin-pwa

### Data Processing
- **Language:** Python
- **Libraries:** `pdfplumber` (for PDF text extraction)

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.x (only if you need to run the data processing scripts)

### Installation

1. Clone the repository and install frontend dependencies:
   ```bash
   npm install
   ```

2. (Optional) Set up Python environment for data processing:
   ```bash
   pip install pdfplumber
   ```

### Running the App

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

### Updating Tide Data

To update or add new tide data from PDFs:
1. Place your target PDFs into the `data_processing/PDF` directory.
2. Run the extraction script:
   ```bash
   python data_processing/extract_all_data.py
   ```
3. The script will parse the PDFs and output a formatted `tide_data.json` directly into the `public` directory, making it immediately available to the web app.
