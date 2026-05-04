# What the Color — Greyscale Image Colorizer

Capstone project to colorize greyscale images using deep learning.

The program uses the **Zhang et al. (ECCV 2016)** colorization approach:
> *Colorful Image Colorization*, Richard Zhang, Phillip Isola, Alexei A. Efros.
> https://arxiv.org/abs/1603.08511

A convolutional neural network trained on ImageNet takes the **L** (lightness)
channel of a greyscale image in LAB color space and predicts the **AB** color
channels, which are then combined with the original lightness to produce a
naturally-colorized RGB image.

---

## Quick start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Colorize an image

```bash
# Output is saved as <name>_colorized.<ext> next to the input file
python colorize.py photo.jpg

# Specify an explicit output path
python colorize.py photo.jpg --output colorized_photo.jpg

# Colorize multiple images into a directory
python colorize.py *.jpg --output-dir results/
```

> **Note:** On first run the program downloads the pre-trained model weights
> (~130 MB) and caches them in `~/.cache/what-the-color/`.  Subsequent runs
> use the cached files and start immediately.

### 3. Use the Python API

```python
from colorizer import Colorizer

colorizer = Colorizer()

# From a file path
colorized_bgr = colorizer.colorize("photo.jpg")

# From a NumPy array (H×W, H×W×1, or H×W×3 uint8)
import numpy as np
grey = np.random.randint(0, 256, (480, 640), dtype=np.uint8)
colorized_bgr = colorizer.colorize_array(grey)
```

---

## Project structure

```
capstone-what-the-color/
├── colorize.py          # CLI entry point
├── colorizer/
│   ├── __init__.py
│   └── colorizer.py     # Colorizer class
├── tests/
│   └── test_colorize.py # Unit tests
├── requirements.txt
└── README.md
```

---

## Running tests

```bash
pytest tests/ -v
```

---

## CLI reference

```
usage: colorize [-h] [--output PATH | --output-dir DIR] [--cache-dir DIR]
                IMAGE [IMAGE ...]

Re-colorize greyscale images using deep learning (Zhang et al., ECCV 2016).

positional arguments:
  IMAGE               Path(s) to greyscale input image(s).

options:
  -h, --help          show this help message and exit
  --output, -o PATH   Output file path (single input only).
  --output-dir, -d DIR
                      Directory to write colorized images into.
  --cache-dir DIR     Directory for cached model files.
                      Default: ~/.cache/what-the-color
```
