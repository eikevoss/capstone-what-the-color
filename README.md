# ColorLab — AI Photo Colorization

<img width="3000" height="2000" alt="lab-logo" src="https://github.com/user-attachments/assets/308dc6cd-b559-4ad6-80a4-1bc217ada768" />

ColorLab is a full-stack web app that automatically colorizes black-and-white photos using the [DDColor](https://github.com/piddnad/DDColor) deep learning model. Upload one image or a batch, drag a slider to compare before/after, and download the results.

---

## Architecture

| Layer | Stack |
|---|---|
| Frontend | Angular 21 (standalone components) |
| Backend | Python · Flask · OpenCV |
| Model | DDColor (`piddnad/ddcolor_modelscope`) via Hugging Face Hub |

---

## Prerequisites

- Python 3.11.3
- Node.js 18+ and Angular CLI (`npm i -g @angular/cli`)
- CUDA-capable GPU recommended (CPU fallback supported)

---

## Backend Setup

### 1. Create a virtual environment

**macOS / Linux**
```bash
pyenv local 3.11.3
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

**Windows (PowerShell)**
```powershell
pyenv local 3.11.3
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

> **Note:** On Apple Silicon, remove version pins from any failing packages in `requirements.txt` and retry.

### 2. Cache the model (first run only)

Downloads the DDColor weights from Hugging Face and caches them locally:

```bash
python cache_model.py
```

### 3. Start the server

```bash
python app.py
```

The API will be available at `http://localhost:5000`. On startup it prints which device (CUDA/CPU) it's using and confirms the model loaded.

**Endpoints**

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check — returns model and device info |
| `POST` | `/upload` | Accepts a multipart `image` field, returns a colorized JPEG |

---

## Frontend Setup

From the `frontend/` directory:

```bash
npm install
ng serve
```

Open `http://localhost:4200` in your browser. The app hot-reloads on file changes.

### Build for production

```bash
ng build
```

Output goes to `dist/`.

---

## How It Works

1. **Upload** — drag and drop or click to select one or more JPG/PNG images.
2. **Processing** — the image is sent to the Flask backend, converted to BGR with OpenCV, and passed through the DDColor colorization pipeline at 512 × 512 resolution.
3. **Compare** — the result is shown in a full-screen before/after slider. Drag left or right to reveal the colorized version.
4. **Batch mode** — upload multiple images at once; use the arrow buttons to page through results and download individually or all at once.

---

## Project Structure

```
├── app.py                  # Flask API server
├── cache_model.py          # One-time model download script
├── requirements.txt        # Python dependencies
└── frontend/
    ├── src/app/
    │   ├── app.component.ts      # Main component logic
    │   ├── app.component.html    # Template (upload / loading / result views)
    │   ├── app.component.css     # Component styles
    │   └── services/
    │       └── api.service.ts    # HTTP client wrapper
    └── src/
        └── app.css               # Global styles & design tokens
```

---

## Model

ColorLab uses **DDColor** (ModelScope variant), a dual-decoder transformer architecture that colorizes images by predicting color queries in a learned embedding space. The model runs entirely on-device — no external API calls are made during inference.

- Paper: *DDColor: Towards Photo-Realistic Image Colorization via Dual Decoders* (ICCV 2023)
- Weights: [`piddnad/ddcolor_modelscope`](https://huggingface.co/piddnad/ddcolor_modelscope) on Hugging Face

---


## UI Dashboard States

The app has five distinct UI states. Screenshots should be placed in `docs/assets/` and referenced below.

### 1. Upload
<img width="1440" height="785" alt="Dropzone" src="https://github.com/user-attachments/assets/bb16def5-0663-47b6-887f-00a6983d0aaf" />

### 2. Processing

<img width="1435" height="784" alt="Processing01" src="https://github.com/user-attachments/assets/198b9ab3-a5ce-4391-9dc2-71eee58c4154" />

### 3. Result — Before/After Comparison

<img width="1435" height="787" alt="Comparison01" src="https://github.com/user-attachments/assets/df86f80f-8825-447d-9894-6b855af4ac16" />


### 4. Batch Mode

<img width="1436" height="786" alt="Batch" src="https://github.com/user-attachments/assets/d9afa746-d853-4828-beab-65721faed3fb" />

When multiple images are uploaded at once, each result can be downloaded individually or all at once via Download all (.zip). Use New Images to clear the queue and start a fresh upload.


## Troubleshooting

**`pip install --upgrade pip` fails on Windows**
```bash
python.exe -m pip install --upgrade pip
```

**CORS error in the browser**
The Flask server only allows requests from `http://localhost:4200`. Make sure the Angular dev server is running on that port, or update the `origins` value in `app.py`.

**Out of memory on GPU**
Reduce `INPUT_SIZE` in `app.py` (default `512`). The model also runs on CPU if no CUDA device is detected, though significantly slower.
