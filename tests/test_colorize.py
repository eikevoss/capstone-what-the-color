"""Tests for the colorizer package and CLI.

These tests avoid network access and model downloads by patching the
``_load_model`` method with a lightweight stub that performs the same
LAB → AB channel prediction step without the Caffe DNN network.
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import cv2
import numpy as np
import pytest

# Ensure the project root is on the path when running from any directory
sys.path.insert(0, str(Path(__file__).parent.parent))

from colorizer import Colorizer
from colorizer.colorizer import ColorizationError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_grey_image(h: int = 64, w: int = 64) -> np.ndarray:
    """Return a random greyscale BGR uint8 image of size (h, w, 3)."""
    rng = np.random.default_rng(42)
    grey = rng.integers(0, 256, (h, w), dtype=np.uint8)
    return cv2.cvtColor(grey, cv2.COLOR_GRAY2BGR)


def make_color_image(h: int = 64, w: int = 64) -> np.ndarray:
    """Return a random color BGR uint8 image of size (h, w, 3)."""
    rng = np.random.default_rng(7)
    return rng.integers(0, 256, (h, w, 3), dtype=np.uint8)


def make_stub_net(h: int, w: int):
    """Build a MagicMock that mimics cv2.dnn.Net for a given image size."""
    net = MagicMock()

    def _forward():
        return np.zeros((1, 2, 28, 28), dtype=np.float32)

    net.forward.side_effect = _forward
    return net


def patched_load_model(colorizer_instance):
    """Context manager that replaces _load_model with a stub."""
    net = make_stub_net(64, 64)
    pts = np.zeros((2, 313), dtype=np.float32)
    return patch.object(
        colorizer_instance, "_load_model", return_value=(net, pts)
    )


# ---------------------------------------------------------------------------
# Colorizer unit tests
# ---------------------------------------------------------------------------

class TestColorizerArray:
    """Tests for Colorizer.colorize_array."""

    def setup_method(self):
        self.colorizer = Colorizer()

    def test_output_shape_matches_input_bgr(self):
        img = make_grey_image(64, 80)
        with patched_load_model(self.colorizer):
            result = self.colorizer.colorize_array(img)
        assert result.shape == (64, 80, 3)

    def test_output_dtype_is_uint8(self):
        img = make_grey_image()
        with patched_load_model(self.colorizer):
            result = self.colorizer.colorize_array(img)
        assert result.dtype == np.uint8

    def test_accepts_greyscale_2d_array(self):
        rng = np.random.default_rng(1)
        grey_2d = rng.integers(0, 256, (64, 64), dtype=np.uint8)
        with patched_load_model(self.colorizer):
            result = self.colorizer.colorize_array(grey_2d)
        assert result.shape == (64, 64, 3)

    def test_accepts_greyscale_3d_array(self):
        rng = np.random.default_rng(2)
        grey_3d = rng.integers(0, 256, (64, 64, 1), dtype=np.uint8)
        with patched_load_model(self.colorizer):
            result = self.colorizer.colorize_array(grey_3d)
        assert result.shape == (64, 64, 3)

    def test_accepts_color_bgr_array(self):
        img = make_color_image(32, 48)
        with patched_load_model(self.colorizer):
            result = self.colorizer.colorize_array(img)
        assert result.shape == (32, 48, 3)

    def test_raises_on_wrong_dtype(self):
        img = np.zeros((64, 64, 3), dtype=np.float32)
        with pytest.raises(ValueError, match="uint8"):
            self.colorizer.colorize_array(img)

    def test_raises_on_wrong_channel_count(self):
        img = np.zeros((64, 64, 4), dtype=np.uint8)
        with pytest.raises(ValueError, match="Unexpected image shape"):
            self.colorizer.colorize_array(img)

    def test_output_values_in_valid_range(self):
        img = make_grey_image()
        with patched_load_model(self.colorizer):
            result = self.colorizer.colorize_array(img)
        assert result.min() >= 0
        assert result.max() <= 255


class TestColorizerFile:
    """Tests for Colorizer.colorize (file-based)."""

    def setup_method(self):
        self.colorizer = Colorizer()

    def test_colorizes_greyscale_file(self, tmp_path):
        img_path = tmp_path / "grey.jpg"
        grey = np.full((64, 64, 3), 128, dtype=np.uint8)
        cv2.imwrite(str(img_path), grey)

        with patched_load_model(self.colorizer):
            result = self.colorizer.colorize(img_path)

        assert result.shape == (64, 64, 3)
        assert result.dtype == np.uint8

    def test_raises_file_not_found(self):
        with pytest.raises(FileNotFoundError):
            self.colorizer.colorize("/nonexistent/path/image.jpg")

    def test_raises_on_unreadable_file(self, tmp_path):
        bad_file = tmp_path / "bad.jpg"
        bad_file.write_bytes(b"not an image")
        with pytest.raises(ColorizationError, match="Could not read image"):
            self.colorizer.colorize(bad_file)


class TestColorizerModelCaching:
    """Tests for model caching behaviour."""

    def test_uses_custom_cache_dir(self, tmp_path):
        colorizer = Colorizer(cache_dir=tmp_path)
        assert colorizer._cache_dir == tmp_path

    def test_default_cache_dir_created(self, tmp_path):
        cache = tmp_path / "models"
        colorizer = Colorizer(cache_dir=cache)
        assert cache.exists()

    def test_model_loaded_only_once(self, tmp_path):
        """Verify that the model is not re-loaded on subsequent calls."""
        colorizer = Colorizer(cache_dir=tmp_path)
        net = make_stub_net(64, 64)
        pts = np.zeros((2, 313), dtype=np.float32)

        # Pre-populate the internal cache so _load_model returns early
        colorizer._net = net
        colorizer._pts_in_hull = pts

        img = make_grey_image()
        colorizer.colorize_array(img)
        colorizer.colorize_array(img)

        # The network should have been called twice (once per colorize call)
        # but the model files should not have been re-loaded
        assert net.forward.call_count == 2


# ---------------------------------------------------------------------------
# CLI tests
# ---------------------------------------------------------------------------

class TestCLI:
    """Tests for the colorize.py command-line interface."""

    def _run(self, argv):
        from colorize import main
        return main(argv)

    def test_colorizes_single_image(self, tmp_path):
        img_path = tmp_path / "input.jpg"
        out_path = tmp_path / "output.jpg"
        cv2.imwrite(str(img_path), np.full((64, 64, 3), 100, dtype=np.uint8))

        colorizer_inst = Colorizer()
        net = make_stub_net(64, 64)
        pts = np.zeros((2, 313), dtype=np.float32)

        with patch("colorize.Colorizer") as MockColorizer:
            instance = MockColorizer.return_value
            instance.colorize.return_value = np.full(
                (64, 64, 3), 128, dtype=np.uint8
            )
            rc = self._run([str(img_path), "--output", str(out_path)])

        assert rc == 0

    def test_default_output_path(self, tmp_path):
        img_path = tmp_path / "photo.jpg"
        expected_out = tmp_path / "photo_colorized.jpg"
        cv2.imwrite(str(img_path), np.full((32, 32, 3), 50, dtype=np.uint8))

        with patch("colorize.Colorizer") as MockColorizer:
            instance = MockColorizer.return_value
            instance.colorize.return_value = np.full(
                (32, 32, 3), 128, dtype=np.uint8
            )
            rc = self._run([str(img_path)])

        assert rc == 0
        instance.colorize.assert_called_once_with(img_path)

    def test_output_dir(self, tmp_path):
        img_path = tmp_path / "photo.png"
        out_dir = tmp_path / "results"
        cv2.imwrite(str(img_path), np.full((32, 32, 3), 50, dtype=np.uint8))

        with patch("colorize.Colorizer") as MockColorizer:
            instance = MockColorizer.return_value
            instance.colorize.return_value = np.full(
                (32, 32, 3), 128, dtype=np.uint8
            )
            rc = self._run([str(img_path), "--output-dir", str(out_dir)])

        assert rc == 0
        assert out_dir.exists()

    def test_returns_nonzero_on_error(self, tmp_path):
        missing = tmp_path / "nonexistent.jpg"
        with patch("colorize.Colorizer") as MockColorizer:
            instance = MockColorizer.return_value
            instance.colorize.side_effect = FileNotFoundError("not found")
            rc = self._run([str(missing)])
        assert rc == 1

    def test_error_multiple_inputs_with_output_flag(self, tmp_path):
        img1 = tmp_path / "a.jpg"
        img2 = tmp_path / "b.jpg"
        cv2.imwrite(str(img1), np.zeros((32, 32, 3), dtype=np.uint8))
        cv2.imwrite(str(img2), np.zeros((32, 32, 3), dtype=np.uint8))
        with pytest.raises(SystemExit):
            self._run([str(img1), str(img2), "--output", str(tmp_path / "out.jpg")])
