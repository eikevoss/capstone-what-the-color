# Automatic Dataset Downloader for Image Colorization Projects
# Supports: COCO, Kaggle (manual API token), and direct URL downloads

import os
import zipfile
import requests
from tqdm import tqdm

# Optional: COCO API
try:
    from pycocotools.coco import COCO
except ImportError:
    COCO = None


# -----------------------------
# 1. Utility: download file
# -----------------------------

def download_file(url, output_path):
    """Download a file with progress bar"""

    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length', 0))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'wb') as f, tqdm(
        desc=output_path,
        total=total_size,
        unit='iB',
        unit_scale=True,
        unit_divisor=1024,
    ) as bar:
        for data in response.iter_content(chunk_size=1024):
            size = f.write(data)
            bar.update(size)


# -----------------------------
# 2. COCO Downloader (recommended)
# -----------------------------

def download_coco(output_dir="data/coco"):
    """
    Downloads COCO 2017 training images.
    ~18GB dataset (you can reduce subset later)
    """

    base_url = "http://images.cocodataset.org/zips/"

    files = {
        "train2017.zip": base_url + "train2017.zip",
        "val2017.zip": base_url + "val2017.zip",
    }

    os.makedirs(output_dir, exist_ok=True)

    for filename, url in files.items():
        zip_path = os.path.join(output_dir, filename)

        if not os.path.exists(zip_path):
            print(f"Downloading {filename}...")
            download_file(url, zip_path)
        else:
            print(f"Already exists: {filename}")

        # extract
        extract_folder = zip_path.replace(".zip", "")

        if not os.path.exists(extract_folder):
            print(f"Extracting {filename}...")
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(output_dir)


# -----------------------------
# 3. Kaggle Downloader (requires API token)
# -----------------------------

def download_kaggle(dataset, output_dir="data/kaggle"):
    """
    Requires kaggle.json in ~/.kaggle/

    Example:
        dataset = "nikhil1e9/natural-images"
    """

    os.system(f"kaggle datasets download -d {dataset} -p {output_dir} --unzip")


# -----------------------------
# 4. Lightweight sample dataset (quick start)
# -----------------------------

def download_sample_images(output_dir="../data/train"):
    """
    Small free image set for quick testing
    """

    urls = [
        "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d",
        "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
    ]

    os.makedirs(output_dir, exist_ok=True)

    for i, url in enumerate(urls):
        path = os.path.join(output_dir, f"img_{i}.jpg")
        download_file(url, path)


# -----------------------------
# 5. Main entry
# -----------------------------

if __name__ == "__main__":

    print("Choose dataset:")
    print("1 - COCO (best quality, large)")
    print("2 - Kaggle dataset")
    print("3 - Small sample (fast test)")

    choice = input("Enter choice: ")

    if choice == "1":
        download_coco()

    elif choice == "2":
        name = input("Enter Kaggle dataset name (e.g. owner/dataset): ")
        download_kaggle(name)

    elif choice == "3":
        download_sample_images()

    else:
        print("Invalid choice")
