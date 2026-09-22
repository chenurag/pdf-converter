const pdfjsLibPromise = import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs");
const pdfjsWorkerUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
const $ = (id) => document.getElementById(id);

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function wireDropzone(inputId, zoneId, onFiles) {
  const input = $(inputId), zone = $(zoneId);
  input.addEventListener("change", () => onFiles([...input.files]));
  ["dragenter", "dragover"].forEach((event) => zone.addEventListener(event, (e) => {
    e.preventDefault(); zone.classList.add("dragging");
  }));
  ["dragleave", "drop"].forEach((event) => zone.addEventListener(event, (e) => {
    e.preventDefault(); zone.classList.remove("dragging");
    if (event === "drop") onFiles([...e.dataTransfer.files]);
  }));
}

let pdfFile;
wireDropzone("pdf-input", "pdf-dropzone", (files) => {
  pdfFile = files.find((file) => file.type === "application/pdf" || file.name.endsWith(".pdf"));
  $("pdf-options").classList.toggle("hidden", !pdfFile);
  $("pdf-status").textContent = pdfFile ? `${pdfFile.name} ready` : "Please choose a PDF file.";
  $("pdf-status").classList.toggle("error", !pdfFile);
});

$("pdf-convert").addEventListener("click", async () => {
  if (!pdfFile) return;
  const button = $("pdf-convert"); button.disabled = true; $("pdf-status").textContent = "Rendering pages…";
  try {
    const pdfjsLib = await pdfjsLibPromise;
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
    const pdf = await pdfjsLib.getDocument({ data: await pdfFile.arrayBuffer() }).promise;
    const format = $("image-format").value, scale = Number($("image-scale").value);
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber), viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, `image/${format}`, .92));
      download(blob, `page-${pageNumber}.${format === "jpeg" ? "jpg" : "png"}`);
    }
    $("pdf-status").textContent = `${pdf.numPages} image${pdf.numPages === 1 ? "" : "s"} downloaded`;
  } catch (error) { $("pdf-status").textContent = `Conversion failed: ${error.message}`; $("pdf-status").classList.add("error"); }
  button.disabled = false;
});

let imageFiles = [];
wireDropzone("image-input", "image-dropzone", (files) => {
  imageFiles = files.filter((file) => file.type.startsWith("image/"));
  $("image-options").classList.toggle("hidden", !imageFiles.length);
  $("image-count").textContent = `${imageFiles.length} image${imageFiles.length === 1 ? "" : "s"} selected`;
  $("image-status").textContent = imageFiles.length ? "Images will be combined in selection order." : "Please choose image files.";
});

$("image-convert").addEventListener("click", async () => {
  if (!imageFiles.length) return;
  const button = $("image-convert"); button.disabled = true; $("image-status").textContent = "Building PDF…";
  try {
    const pdf = new window.jspdf.jsPDF({ unit: "px", format: "a4" });
    for (let index = 0; index < imageFiles.length; index += 1) {
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(imageFiles[index]);
      });
      const image = await new Promise((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.src = dataUrl; });
      if (index) pdf.addPage();
      const ratio = Math.min(pdf.internal.pageSize.getWidth() / image.width, pdf.internal.pageSize.getHeight() / image.height);
      const width = image.width * ratio, height = image.height * ratio;
      pdf.addImage(dataUrl, imageFiles[index].type.includes("png") ? "PNG" : "JPEG", (pdf.internal.pageSize.getWidth() - width) / 2, (pdf.internal.pageSize.getHeight() - height) / 2, width, height);
    }
    pdf.save("paperclip-images.pdf"); $("image-status").textContent = "PDF downloaded";
  } catch (error) { $("image-status").textContent = `Conversion failed: ${error.message}`; $("image-status").classList.add("error"); }
  button.disabled = false;
});
