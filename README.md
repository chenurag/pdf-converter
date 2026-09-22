# Paperclip — PDF and Image Converter

Live web app: the static frontend in `index.html` runs on GitHub Pages and performs all conversions locally in the browser. No files are uploaded.

This project converts PDF files into images and combines multiple images into a single PDF.

## Features

- Convert a PDF into one PNG/JPG image per page
- Convert multiple images into a single PDF file
- Simple command-line interface
- Responsive browser app for GitHub Pages

## Install

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Usage

### PDF to images

```bash
python converter.py pdf2img sample.pdf output_dir --dpi 200 --format PNG
```

### Images to PDF

```bash
python converter.py img2pdf image1.png image2.png output.pdf --quality 95
```

## GitHub Pages

Push the `main` branch to GitHub. The included `.github/workflows/pages.yml` deploys the static web app automatically. In the repository's **Settings → Pages**, set the source to **GitHub Actions**.

## Example

```bash
python converter.py pdf2img demo.pdf pages --start-page 1 --end-page 3
python converter.py img2pdf pages/page-1.png pages/page-2.png pages/page-3.png combined.pdf
```
