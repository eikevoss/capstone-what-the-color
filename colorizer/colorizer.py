"""Image colorization using the Zhang et al. (ECCV 2016) approach.

The colorization model takes a greyscale image (L channel in LAB space)
and predicts the AB color channels using a convolutional neural network
trained on ImageNet.

References:
    Zhang, R., Isola, P., & Efros, A. A. (2016).
    Colorful image colorization. ECCV 2016.
    https://arxiv.org/abs/1603.08511
"""

import os
import urllib.request
from pathlib import Path

import cv2
import numpy as np


# Model file URLs (Zhang et al. ECCV 2016)
_MODEL_URL = (
    "https://github.com/richzhang/colorization/raw/caffe/"
    "colorization/models/colorization_release_v2.caffemodel"
)
_PROTO_URL = (
    "https://github.com/richzhang/colorization/raw/caffe/"
    "colorization/models/colorization_deploy_v2.prototxt"
)
_HULL_URL = (
    "https://github.com/richzhang/colorization/raw/caffe/"
    "colorization/resources/pts_in_hull.npy"
)

# Default cache directory for model files
_DEFAULT_CACHE_DIR = Path.home() / ".cache" / "what-the-color"


class ColorizationError(Exception):
    """Raised when colorization fails."""


class Colorizer:
    """Colorizes greyscale images using a pre-trained deep learning model.

    The model uses the Zhang et al. (ECCV 2016) approach:
    1. Convert the input image to LAB color space.
    2. Feed the L (lightness) channel through a CNN.
    3. The CNN predicts the AB (color) channels.
    4. Combine L + predicted AB to produce the colorized image.

    Model weights are downloaded automatically on first use and cached
    in ``~/.cache/what-the-color/`` (or a custom directory).

    Args:
        cache_dir: Directory used to store downloaded model files.
            Defaults to ``~/.cache/what-the-color``.

    Example::

        colorizer = Colorizer()
        colorized = colorizer.colorize("photo.jpg")
        colorized.save("colorized_photo.jpg")
    """

    def __init__(self, cache_dir: str | os.PathLike | None = None) -> None:
        self._cache_dir = Path(cache_dir) if cache_dir else _DEFAULT_CACHE_DIR
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        self._net: cv2.dnn.Net | None = None
        self._pts_in_hull: np.ndarray | None = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def colorize(self, image_path: str | os.PathLike) -> np.ndarray:
        """Colorize a greyscale image and return the result as a BGR array.

        The image at *image_path* may already be greyscale or may be a
        colour image whose luma channel will be used for inference.

        Args:
            image_path: Path to the input image (JPEG, PNG, BMP, …).

        Returns:
            Colorized image as a uint8 BGR NumPy array with the same
            spatial dimensions as the input.

        Raises:
            FileNotFoundError: If *image_path* does not exist.
            ColorizationError: If the image cannot be read or the model
                fails to produce output.
        """
        image_path = Path(image_path)
        if not image_path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")

        img_bgr = cv2.imread(str(image_path))
        if img_bgr is None:
            raise ColorizationError(f"Could not read image: {image_path}")

        return self.colorize_array(img_bgr)

    def colorize_array(self, image: np.ndarray) -> np.ndarray:
        """Colorize an image given as a NumPy array.

        Args:
            image: Input image as a uint8 NumPy array.  Both greyscale
                (H×W or H×W×1) and BGR (H×W×3) arrays are accepted.

        Returns:
            Colorized BGR uint8 NumPy array of the same spatial size.

        Raises:
            ColorizationError: If the model fails.
            ValueError: If *image* has an unexpected shape or dtype.
        """
        if image.dtype != np.uint8:
            raise ValueError(f"Expected uint8 array, got {image.dtype}")

        # Ensure 3-channel BGR
        if image.ndim == 2:
            img_bgr = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        elif image.ndim == 3 and image.shape[2] == 1:
            img_bgr = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        elif image.ndim == 3 and image.shape[2] == 3:
            img_bgr = image
        else:
            raise ValueError(
                f"Unexpected image shape: {image.shape}. "
                "Expected H×W, H×W×1, or H×W×3."
            )

        net, pts = self._load_model()

        # Convert to float32 LAB
        img_float = img_bgr.astype(np.float32) / 255.0
        img_lab = cv2.cvtColor(img_float, cv2.COLOR_BGR2Lab)

        # L channel scaled to [0, 100]
        l_channel = img_lab[:, :, 0]

        # Resize to the network input size (224×224)
        h, w = img_lab.shape[:2]
        l_resized = cv2.resize(l_channel, (224, 224))

        # Subtract 50 (mean lightness) as expected by the network
        net.setInput(
            cv2.dnn.blobFromImage(
                l_resized[:, :, np.newaxis],
                scalefactor=1.0,
                size=(224, 224),
                mean=(50,),
                swapRB=False,
            )
        )

        ab_pred = net.forward()[0, :, :, :].transpose(1, 2, 0)  # H×W×2

        # Resize predicted AB back to original size
        ab_pred = cv2.resize(ab_pred, (w, h))

        # Compose the colorized LAB image
        colorized_lab = np.concatenate(
            [l_channel[:, :, np.newaxis], ab_pred], axis=2
        )

        # Convert back to BGR uint8
        colorized_bgr = cv2.cvtColor(colorized_lab, cv2.COLOR_Lab2BGR)
        colorized_bgr = np.clip(colorized_bgr, 0, 1)
        return (colorized_bgr * 255).astype(np.uint8)

    # ------------------------------------------------------------------
    # Model management
    # ------------------------------------------------------------------

    def _load_model(self) -> tuple[cv2.dnn.Net, np.ndarray]:
        """Return (net, pts_in_hull), downloading files if necessary."""
        if self._net is not None and self._pts_in_hull is not None:
            return self._net, self._pts_in_hull

        proto_path = self._cache_dir / "colorization_deploy_v2.prototxt"
        model_path = self._cache_dir / "colorization_release_v2.caffemodel"
        hull_path = self._cache_dir / "pts_in_hull.npy"

        self._ensure_file(proto_path, _PROTO_URL, "network architecture")
        self._ensure_file(model_path, _MODEL_URL, "model weights (~130 MB)")
        self._ensure_file(hull_path, _HULL_URL, "cluster centres")

        net = cv2.dnn.readNetFromCaffe(str(proto_path), str(model_path))

        pts = np.load(str(hull_path))  # shape (2, 313)

        # Add the cluster centres as a 1×1 conv layer (standard trick)
        pts_reshaped = pts.transpose().reshape(313, 2, 1, 1).astype(np.float32)
        class8_ab = net.getLayerId("class8_ab")
        conv8_313_rh = net.getLayerId("conv8_313_rh")
        net.getLayer(class8_ab).blobs = [pts_reshaped]
        net.getLayer(conv8_313_rh).blobs = [
            np.full((1, 313), 2.606, dtype=np.float32)
        ]

        self._net = net
        self._pts_in_hull = pts
        return self._net, self._pts_in_hull

    @staticmethod
    def _ensure_file(path: Path, url: str, description: str) -> None:
        """Download *url* to *path* if *path* does not yet exist."""
        if path.exists():
            return
        print(f"Downloading {description} …")
        print(f"  From : {url}")
        print(f"  To   : {path}")
        try:
            urllib.request.urlretrieve(url, path)
        except Exception as exc:
            raise ColorizationError(
                f"Failed to download {description} from {url}: {exc}"
            ) from exc
        print("  Done.")
