#!/usr/bin/env python3
"""CLI entry point for the What-the-Color greyscale image colorizer.

Usage examples::

    # Colorize a single image (output saved next to the input)
    python colorize.py photo.jpg

    # Specify an explicit output path
    python colorize.py photo.jpg --output colorized.jpg

    # Colorize multiple images into an output directory
    python colorize.py *.jpg --output-dir results/

    # Use a custom model cache directory
    python colorize.py photo.jpg --cache-dir /tmp/models
"""

import argparse
import sys
from pathlib import Path

from colorizer import Colorizer
from colorizer.colorizer import ColorizationError
import cv2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="colorize",
        description=(
            "Re-colorize greyscale images using deep learning "
            "(Zhang et al., ECCV 2016)."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "inputs",
        metavar="IMAGE",
        nargs="+",
        help="Path(s) to greyscale input image(s).",
    )
    output_group = parser.add_mutually_exclusive_group()
    output_group.add_argument(
        "--output",
        "-o",
        metavar="PATH",
        help=(
            "Output file path. Only valid when a single input image is given. "
            "Defaults to <input_stem>_colorized.<ext>."
        ),
    )
    output_group.add_argument(
        "--output-dir",
        "-d",
        metavar="DIR",
        help=(
            "Directory to write colorized images into. "
            "Each output file will be named <input_stem>_colorized.<ext>."
        ),
    )
    parser.add_argument(
        "--cache-dir",
        metavar="DIR",
        default=None,
        help=(
            "Directory used to cache downloaded model files. "
            "Defaults to ~/.cache/what-the-color."
        ),
    )
    return parser


def default_output_path(input_path: Path) -> Path:
    """Return ``<stem>_colorized<suffix>`` next to the input file."""
    return input_path.with_name(
        f"{input_path.stem}_colorized{input_path.suffix}"
    )


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    inputs = [Path(p) for p in args.inputs]

    # Validate --output can only be used with a single input
    if args.output and len(inputs) > 1:
        parser.error("--output can only be used with a single input image.")

    # Determine output paths
    if args.output:
        output_paths = [Path(args.output)]
    elif args.output_dir:
        out_dir = Path(args.output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        output_paths = [
            out_dir / f"{p.stem}_colorized{p.suffix}" for p in inputs
        ]
    else:
        output_paths = [default_output_path(p) for p in inputs]

    colorizer = Colorizer(cache_dir=args.cache_dir)

    errors = 0
    for in_path, out_path in zip(inputs, output_paths):
        try:
            print(f"Colorizing: {in_path}")
            colorized = colorizer.colorize(in_path)
            cv2.imwrite(str(out_path), colorized)
            print(f"  Saved  : {out_path}")
        except (FileNotFoundError, ColorizationError, OSError) as exc:
            print(f"  ERROR  : {exc}", file=sys.stderr)
            errors += 1

    if errors:
        print(
            f"\n{errors} image(s) could not be processed.", file=sys.stderr
        )

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
