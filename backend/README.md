# Backend — Flask Colorization API

The backend is a Flask server that receives a black-and-white image from the frontend, runs it through the DDColor deep learning model, and returns a colorized JPEG. It exposes two endpoints and is runnable locally or via Docker.
<!--

---

## Stack

| Component | Technology |
|---|---|
| Server | Python · Flask · Flask-CORS |
| Image processing | OpenCV · NumPy |
| Model inference | PyTorch · DDColor (`piddnad/ddcolor_modelscope`) |
| Model distribution | Hugging Face Hub |

--->

## Prerequisites

- Python 3.11.3
- `pyenv` (recommended for version pinning)
- CUDA-capable GPU recommended — CPU fallback is supported but significantly slower

---

## Setup

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

**Windows (GitBash CLI)**
```bash
pyenv local 3.11.3
python -m venv .venv
source .venv/Scripts/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```


> **Note:** DDColor is not on PyPI. Install it directly from GitHub before the rest of the dependencies:
> ```bash
> pip install git+https://github.com/piddnad/DDColor.git
> ```

### 2. Cache the model (first run only)

Downloads the DDColor weights from Hugging Face and stores them in the local model cache:

```bash
python cache_model.py
```

This only needs to run once. Subsequent starts of `app.py` load the weights from the local cache.

### 3. Start the server

```bash
python app.py
```

The API will be available at `http://localhost:5000`. On startup it prints which device (CUDA / CPU) is being used and confirms the model loaded successfully.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check — returns model name and active device |
| `POST` | `/upload` | Accepts a multipart `image` field, returns a colorized JPEG |

### `POST /upload`

**Request** — `multipart/form-data` with a single field:

| Field | Type | Description |
|---|---|---|
| `image` | file | JPG or PNG image to colorize |

**Response** — `image/jpeg` binary on success, or a JSON error object on failure.

**Error responses**

| Status | Reason |
|---|---|
| `400` | No image field in the request, or the image could not be decoded |
| `500` | Colorization pipeline raised an exception |

---

## Docker

A `dockerfile` is included for containerized deployment.

### Build

```bash
docker build -t colorlab-backend .
```

The image uses a CPU PyTorch build by default. To enable GPU support, replace the `--index-url` line in the Dockerfile:

```dockerfile
# CPU (default)
--index-url https://download.pytorch.org/whl/cpu

# GPU (CUDA 11.8)
--index-url https://download.pytorch.org/whl/cu118
```

The DDColor weights are pre-cached at image build time via `cache_model.py`, so inference containers start immediately without downloading anything.

### Run

```bash
docker run -p 5000:5000 colorlab-backend
```

---

## Project Structure

```
backend/
├── app.py                  # Flask server — endpoints and inference pipeline
├── cache_model.py          # One-time model download script
├── requirements.txt        # Python dependencies
├── dockerfile              # Container build definition
└── model_development/
    ├── colorization_gan.ipynb   # Exploration notebook
    ├── ddcolor/                 # Local DDColor source reference
    ├── knowledge_base.md        # Research notes
    ├── literature/              # Papers and references
    ├── pred_samples/            # Sample predictions
    └── services/                # Utility scripts
```

<!--
---
## Configuration

Two values at the top of `app.py` control inference behaviour:

| Variable | Default | Description |
|---|---|---|
| `INPUT_SIZE` | `512` | Resolution the image is resized to before colorization. Lower values reduce memory use at the cost of detail. |
| `device` | auto | Detected automatically (`cuda` if available, otherwise `cpu`). |

CORS is restricted to `http://localhost:4200` (the Angular dev server). Update the `origins` value in `app.py` for production deployments.
--- -->


## Troubleshooting

**`pip install --upgrade pip` fails on Windows**
```bash
python.exe -m pip install --upgrade pip
```

<!-- **Out of memory on GPU**
Reduce `INPUT_SIZE` in `app.py`. The model also runs on CPU if no CUDA device is detected.

**CORS error in the browser**
The Flask server only accepts requests from `http://localhost:4200`. Ensure the Angular dev server is running on that port, or update `origins` in `app.py`.-->

**`ModuleNotFoundError: No module named 'ddcolor'`**
DDColor is not on PyPI. Install it from GitHub:
```bash
pip install git+https://github.com/piddnad/DDColor.git
```
