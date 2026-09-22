from __future__ import annotations

from pathlib import Path
from typing import Iterable, Sequence

from PIL import Image
import fitz


def _normalize_path(value: str | Path) -> Path:
    return Path(value).expanduser().resolve()


def _ensure_directory(path: str | Path) -> Path:
    directory = _normalize_path(path)
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def pdf_to_images(
    pdf_path: str | Path,
    output_dir: str | Path,
    *,
    dpi: int = 200,
    start_page: int | None = None,
    end_page: int | None = None,
    image_format: str = "PNG",
) -> list[Path]:
    """Convert a PDF file into images, one image per page."""
    source = _normalize_path(pdf_path)
    if not source.exists():
        raise FileNotFoundError(f"PDF file not found: {source}")

    destination = _ensure_directory(output_dir)
    image_format = image_format.upper()
    if image_format not in {"PNG", "JPG", "JPEG"}:
        raise ValueError("image_format must be one of: PNG, JPG, JPEG")

    document = fitz.open(source)
    total_pages = document.page_count
    start = 1 if start_page is None else max(1, start_page)
    end = total_pages if end_page is None else min(total_pages, end_page)

    if start > end:
        document.close()
        raise ValueError("start_page must be less than or equal to end_page")

    saved_files: list[Path] = []
    try:
        for page_number in range(start - 1, end):
            page = document.load_page(page_number)
            page_matrix = fitz.Matrix(dpi / 72, dpi / 72)
            pixmap = page.get_pixmap(matrix=page_matrix)
            extension = "png" if image_format == "PNG" else "jpg"
            output_file = destination / f"page-{page_number + 1}.{extension}"
            pixmap.save(output_file)
            saved_files.append(output_file)
    finally:
        document.close()

    return saved_files


def images_to_pdf(
    image_paths: Sequence[str | Path],
    output_pdf: str | Path,
    *,
    quality: int = 95,
) -> Path:
    """Combine multiple images into a single PDF file."""
    if not image_paths:
        raise ValueError("At least one image path must be provided")

    normalized_paths = [_normalize_path(path) for path in image_paths]
    missing = [str(path) for path in normalized_paths if not path.exists()]
    if missing:
        raise FileNotFoundError(f"Image file(s) not found: {', '.join(missing)}")

    target = _normalize_path(output_pdf)
    target.parent.mkdir(parents=True, exist_ok=True)

    opened_images = [Image.open(path).convert("RGB") for path in normalized_paths]
    first_image = opened_images[0]
    try:
        first_image.save(
            target,
            "PDF",
            resolution=300.0,
            save_all=True,
            append_images=opened_images[1:],
            quality=quality,
        )
    finally:
        for image in opened_images:
            image.close()

    return target


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Convert PDFs and images to each other.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    pdf_parser = subparsers.add_parser("pdf2img", help="Convert a PDF to images")
    pdf_parser.add_argument("pdf_path")
    pdf_parser.add_argument("output_dir")
    pdf_parser.add_argument("--dpi", type=int, default=200)
    pdf_parser.add_argument("--start-page", type=int)
    pdf_parser.add_argument("--end-page", type=int)
    pdf_parser.add_argument("--format", choices=["PNG", "JPG", "JPEG"], default="PNG")

    image_parser = subparsers.add_parser("img2pdf", help="Convert images to a PDF")
    image_parser.add_argument("images", nargs="+")
    image_parser.add_argument("output_pdf")
    image_parser.add_argument("--quality", type=int, default=95)

    args = parser.parse_args()

    if args.command == "pdf2img":
        result = pdf_to_images(
            args.pdf_path,
            args.output_dir,
            dpi=args.dpi,
            start_page=args.start_page,
            end_page=args.end_page,
            image_format=args.format,
        )
        print(f"Created {len(result)} images in {args.output_dir}")
        for item in result:
            print(item)
    else:
        output = images_to_pdf(args.images, args.output_pdf, quality=args.quality)
        print(f"Created PDF: {output}")


if __name__ == "__main__":
    main()
