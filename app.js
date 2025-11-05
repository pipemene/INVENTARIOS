const cameraVideo = document.getElementById("camera");
const selfieVideo = document.getElementById("selfie-camera");
const startCameraBtn = document.getElementById("start-camera");
const capturePhotoBtn = document.getElementById("capture-photo");
const startSelfieBtn = document.getElementById("start-selfie-camera");
const captureSelfieBtn = document.getElementById("capture-selfie");
const photoList = document.getElementById("photo-list");
const photoCanvas = document.getElementById("photo-canvas");
const selfieCanvas = document.getElementById("selfie-canvas");
const selfiePreview = document.getElementById("selfie-preview");
const generatePdfBtn = document.getElementById("generate-pdf");
const firmaNombre = document.getElementById("firma-nombre");
const generalForm = document.getElementById("general-form");
const fechaInput = document.getElementById("fecha");

const WHATSAPP_RECIPIENTS = [
  { phone: "573178574053", label: "Arrendamientos" },
  { phone: "57300294830", label: "Reparaciones" },
];

setTodayDate();

function setTodayDate() {
  const today = new Date();
  const isoDate = today.toISOString().split("T")[0];
  fechaInput.value = isoDate;
  fechaInput.readOnly = true;
  const preventChange = (event) => {
    event.preventDefault();
    fechaInput.blur();
  };
  ["keydown", "mousedown", "touchstart"].forEach((eventName) => {
    fechaInput.addEventListener(eventName, preventChange, {
      passive: false,
    });
  });
}

let cameraStream;
let selfieStream;
let selfieImage;
const photos = [];

async function startStream(videoElement, type) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: type === "selfie" ? "user" : "environment",
      },
      audio: false,
    });
    videoElement.srcObject = stream;
    return stream;
  } catch (error) {
    console.error("No se pudo iniciar la cámara", error);
    alert(
      "No se pudo acceder a la cámara. Revisa los permisos del navegador o usa otro dispositivo."
    );
    throw error;
  }
}

startCameraBtn.addEventListener("click", async () => {
  if (cameraStream) return;
  cameraStream = await startStream(cameraVideo, "inventory");
  capturePhotoBtn.disabled = false;
});

startSelfieBtn.addEventListener("click", async () => {
  if (selfieStream) return;
  selfieStream = await startStream(selfieVideo, "selfie");
  captureSelfieBtn.disabled = false;
});

function stopStream(stream, videoElement) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
  videoElement.srcObject = null;
}

function captureFrame(videoElement, canvas) {
  const context = canvas.getContext("2d");
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

capturePhotoBtn.addEventListener("click", () => {
  if (!cameraStream) return;
  const dataUrl = captureFrame(cameraVideo, photoCanvas);
  photos.push(dataUrl);
  renderPhotos();
});

captureSelfieBtn.addEventListener("click", () => {
  if (!selfieStream) return;
  selfieImage = captureFrame(selfieVideo, selfieCanvas);
  selfiePreview.innerHTML = "";
  const img = document.createElement("img");
  img.src = selfieImage;
  img.alt = "Selfie de verificación";
  selfiePreview.appendChild(img);
});

function renderPhotos() {
  photoList.innerHTML = "";
  photos.forEach((photo, index) => {
    const item = document.createElement("li");
    item.className = "photo-item";
    const img = document.createElement("img");
    img.src = photo;
    img.alt = `Foto ${index + 1}`;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Eliminar";
    removeBtn.addEventListener("click", () => {
      photos.splice(index, 1);
      renderPhotos();
    });
    item.appendChild(img);
    item.appendChild(removeBtn);
    photoList.appendChild(item);
  });
}

// Lógica de la firma
const signatureCanvas = document.getElementById("signature-canvas");
const clearSignatureBtn = document.getElementById("clear-signature");
const signatureCtx = signatureCanvas.getContext("2d");
let isDrawing = false;
let hasSignature = false;

signatureCtx.fillStyle = "#ffffff";
signatureCtx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);

const startDrawing = (event) => {
  isDrawing = true;
  hasSignature = true;
  signatureCtx.beginPath();
  const { x, y } = getCanvasCoordinates(event);
  signatureCtx.moveTo(x, y);
};

const draw = (event) => {
  if (!isDrawing) return;
  event.preventDefault();
  const { x, y } = getCanvasCoordinates(event);
  signatureCtx.lineTo(x, y);
  signatureCtx.strokeStyle = "#111";
  signatureCtx.lineWidth = 2;
  signatureCtx.lineCap = "round";
  signatureCtx.lineJoin = "round";
  signatureCtx.stroke();
};

const stopDrawing = () => {
  if (!isDrawing) return;
  isDrawing = false;
};

function getCanvasCoordinates(event) {
  const rect = signatureCanvas.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

signatureCanvas.addEventListener("pointerdown", startDrawing);
signatureCanvas.addEventListener("pointermove", draw);
signatureCanvas.addEventListener("pointerup", stopDrawing);
signatureCanvas.addEventListener("pointerleave", stopDrawing);
signatureCanvas.addEventListener("touchstart", startDrawing, { passive: false });
signatureCanvas.addEventListener("touchmove", draw, { passive: false });
signatureCanvas.addEventListener("touchend", stopDrawing);

clearSignatureBtn.addEventListener("click", () => {
  signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  signatureCtx.fillStyle = "#ffffff";
  signatureCtx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  hasSignature = false;
});

function validateForm() {
  const formValid = generalForm.reportValidity();
  if (!formValid) return false;

  if (!photos.length) {
    alert("Captura al menos una fotografía del inventario.");
    return false;
  }
  if (!hasSignature) {
    alert("Obtén la firma del inquilino antes de continuar.");
    return false;
  }
  if (!selfieImage) {
    alert("Toma la selfie de verificación antes de generar el PDF.");
    return false;
  }
  if (!firmaNombre.value.trim()) {
    alert("Escribe el nombre del inquilino en el campo de firma.");
    return false;
  }
  return true;
}

let isGeneratingPdf = false;

function setGeneratingState(isLoading) {
  isGeneratingPdf = isLoading;
  generatePdfBtn.disabled = isLoading;
  generatePdfBtn.textContent = isLoading ? "Generando PDF..." : "Generar PDF";
}

async function generatePdf() {
  if (isGeneratingPdf) return;
  if (!validateForm()) return;

  try {
    setGeneratingState(true);

    const formData = new FormData(generalForm);
    const direccion = formData.get("direccion");
    const asesor = formData.get("asesor");
    const inquilino = formData.get("inquilino");
    const fechaActual = new Date();
    const fechaFormateada = fechaActual.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const sanitizedInquilino = inquilino.replace(/\s+/g, "_");
    const fileName = `inventario_${sanitizedInquilino}.pdf`;
    const signatureData = signatureCanvas.toDataURL("image/png");

    const pdfBlob = await buildInventoryPdf({
      direccion,
      asesor,
      inquilino,
      fechaFormateada,
      photos,
      signatureData,
      selfieImage,
      firmante: firmaNombre.value.trim(),
    });

    downloadBlob(pdfBlob, fileName);
    await sharePdfWithWhatsApp(pdfBlob, fileName, direccion, fechaFormateada);
  } catch (error) {
    console.error("Error al generar el PDF", error);
    alert("Ocurrió un error al generar el PDF. Por favor intenta nuevamente.");
  } finally {
    setGeneratingState(false);
  }
}

generatePdfBtn.addEventListener("click", generatePdf);

window.addEventListener("beforeunload", () => {
  stopStream(cameraStream, cameraVideo);
  stopStream(selfieStream, selfieVideo);
});

async function sharePdfWithWhatsApp(pdfBlob, fileName, direccion, fecha) {
  const messageBase = `Inventario del inmueble ${direccion} realizado el ${fecha}. Se adjunta el PDF.`;

  for (const recipient of WHATSAPP_RECIPIENTS) {
    try {
      const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });
      const message = `${messageBase}\nDestinatario: ${recipient.label}`;

      let shared = false;
      if (navigator.canShare && navigator.canShare({ files: [pdfFile], text: message })) {
        try {
          await navigator.share({
            files: [pdfFile],
            text: message,
            title: `Inventario ${direccion}`,
          });
          shared = true;
        } catch (error) {
          console.warn(`No se completó el uso compartido nativo para ${recipient.label}`, error);
        }
      }

      if (!shared) {
        const whatsappLink = `https://wa.me/${recipient.phone}?text=${encodeURIComponent(message)}`;
        const newWindow = window.open(whatsappLink, "_blank");
        if (!newWindow) {
          throw new Error("El navegador bloqueó la apertura de WhatsApp");
        }
        alert(
          `Se abrió el chat de WhatsApp para ${recipient.label}. Adjunta el archivo ${fileName} que se descargó automáticamente.`
        );
      }
    } catch (error) {
      console.error(`No se pudo compartir el PDF con ${recipient.label}`, error);
      alert(
        `No se pudo compartir automáticamente el PDF con ${recipient.label}. Busca el archivo ${fileName} en tus descargas y envíalo manualmente.`
      );
    }
  }
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function buildInventoryPdf({
  direccion,
  asesor,
  inquilino,
  fechaFormateada,
  photos,
  signatureData,
  selfieImage,
  firmante,
}) {
  const pageWidth = 612;
  const pageHeight = 792;
  const scale = 2;
  const margin = 40;
  const photoChunkSize = 4;

  if (!signatureData || !selfieImage) {
    throw new Error("Faltan imágenes obligatorias para el PDF");
  }

  const chunks = [];
  for (let i = 0; i < photos.length; i += photoChunkSize) {
    chunks.push(photos.slice(i, i + photoChunkSize));
  }

  const pages = [];
  const firstPagePhotos = chunks.shift() ?? [];
  const { canvas, ctx } = createPageCanvas(pageWidth, pageHeight, scale);
  drawHeader(ctx, margin, {
    direccion,
    asesor,
    inquilino,
    fechaFormateada,
  });
  await drawPhotoGrid(ctx, firstPagePhotos, {
    pageWidth,
    margin,
    startY: 220,
    startIndex: 0,
  });
  pages.push(canvasToPage(canvas));

  let processedPhotos = firstPagePhotos.length;
  for (let index = 0; index < chunks.length; index += 1) {
    const group = chunks[index];
    const { canvas: photoCanvas, ctx: photoCtx } = createPageCanvas(
      pageWidth,
      pageHeight,
      scale
    );
    drawContinuationHeader(photoCtx, margin, index + 2);
    await drawPhotoGrid(photoCtx, group, {
      pageWidth,
      margin,
      startY: 120,
      startIndex: processedPhotos,
    });
    pages.push(canvasToPage(photoCanvas));
    processedPhotos += group.length;
  }

  const { canvas: signatureCanvasPage, ctx: signatureCtxPage } =
    createPageCanvas(pageWidth, pageHeight, scale);
  await drawSignaturePage(signatureCtxPage, {
    margin,
    pageWidth,
    firmante,
    fechaFormateada,
    signatureData,
    selfieImage,
  });
  pages.push(canvasToPage(signatureCanvasPage));

  return createPdfFromImages(pages, pageWidth, pageHeight);
}

function createPageCanvas(pageWidth, pageHeight, scale) {
  const canvas = document.createElement("canvas");
  canvas.width = pageWidth * scale;
  canvas.height = pageHeight * scale;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.textBaseline = "top";
  ctx.fillStyle = "#111111";
  return { canvas, ctx };
}

function canvasToPage(canvas) {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
  return {
    dataUrl,
    width: canvas.width,
    height: canvas.height,
  };
}

function drawHeader(ctx, margin, { direccion, asesor, inquilino, fechaFormateada }) {
  ctx.fillStyle = "#111111";
  ctx.font = "700 26px 'Segoe UI', sans-serif";
  ctx.fillText("Inventario de entrega", margin, margin);

  ctx.font = "16px 'Segoe UI', sans-serif";
  const infoY = margin + 50;
  wrapText(ctx, `Dirección: ${direccion}`, margin, infoY, 532, 22);
  wrapText(ctx, `Asesor: ${asesor}`, margin, infoY + 44, 532, 22);
  wrapText(ctx, `Inquilino/Recibe: ${inquilino}`, margin, infoY + 88, 532, 22);
  ctx.fillText(`Fecha: ${fechaFormateada}`, margin, infoY + 132);

  ctx.font = "700 20px 'Segoe UI', sans-serif";
  ctx.fillText("Inventario fotográfico", margin, infoY + 176);
}

function drawContinuationHeader(ctx, margin, pageNumber) {
  ctx.fillStyle = "#111111";
  ctx.font = "700 24px 'Segoe UI', sans-serif";
  ctx.fillText(`Inventario fotográfico (página ${pageNumber})`, margin, margin);
  ctx.font = "16px 'Segoe UI', sans-serif";
  ctx.fillText("Continuación de fotografías", margin, margin + 32);
}

async function drawPhotoGrid(ctx, photosGroup, { pageWidth, margin, startY, startIndex }) {
  if (!photosGroup.length) return;
  const gap = 20;
  const columns = 2;
  const cellWidth = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;
  const cellHeight = 220;
  const labelHeight = 24;
  const padding = 10;

  const images = await Promise.all(photosGroup.map(loadImage));

  images.forEach((image, idx) => {
    const column = idx % columns;
    const row = Math.floor(idx / columns);
    const x = margin + column * (cellWidth + gap);
    const y = startY + row * (cellHeight + gap);

    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(x, y, cellWidth, cellHeight);
    ctx.strokeStyle = "#d0d0d0";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, cellWidth, cellHeight);

    const availableWidth = cellWidth - padding * 2;
    const availableHeight = cellHeight - padding * 2 - labelHeight;
    const ratio = Math.min(
      availableWidth / image.width,
      availableHeight / image.height
    );
    const drawWidth = image.width * ratio;
    const drawHeight = image.height * ratio;
    const imageX = x + padding + (availableWidth - drawWidth) / 2;
    const imageY = y + padding + (availableHeight - drawHeight) / 2;
    ctx.drawImage(image, imageX, imageY, drawWidth, drawHeight);

    ctx.fillStyle = "#111111";
    ctx.font = "600 16px 'Segoe UI', sans-serif";
    ctx.fillText(`Foto ${startIndex + idx + 1}`, x + padding, y + cellHeight - labelHeight);
  });
}

async function drawSignaturePage(ctx, {
  margin,
  pageWidth,
  firmante,
  fechaFormateada,
  signatureData,
  selfieImage,
}) {
  ctx.fillStyle = "#111111";
  ctx.font = "700 26px 'Segoe UI', sans-serif";
  ctx.fillText("Firma y verificación", margin, margin);

  ctx.font = "16px 'Segoe UI', sans-serif";
  const nombreFirmante = firmante || "Sin registrar";
  wrapText(ctx, `Nombre del firmante: ${nombreFirmante}`, margin, margin + 48, 532, 22);
  ctx.fillText(`Fecha de entrega: ${fechaFormateada}`, margin, margin + 90);

  const signatureImg = await loadImage(signatureData);
  const selfieImg = await loadImage(selfieImage);

  const signatureBox = {
    x: margin,
    y: margin + 130,
    width: pageWidth - margin * 2,
    height: 200,
  };
  const selfieBox = {
    x: margin,
    y: signatureBox.y + signatureBox.height + 60,
    width: pageWidth - margin * 2,
    height: 220,
  };

  drawLabeledImage(ctx, signatureImg, signatureBox, "Firma del inquilino");
  drawLabeledImage(ctx, selfieImg, selfieBox, "Selfie de verificación");
}

function drawLabeledImage(ctx, image, box, label) {
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(box.x, box.y, box.width, box.height);
  ctx.strokeStyle = "#d0d0d0";
  ctx.lineWidth = 1;
  ctx.strokeRect(box.x, box.y, box.width, box.height);

  const padding = 16;
  const availableWidth = box.width - padding * 2;
  const availableHeight = box.height - padding * 2 - 28;
  const ratio = Math.min(availableWidth / image.width, availableHeight / image.height);
  const drawWidth = image.width * ratio;
  const drawHeight = image.height * ratio;
  const imageX = box.x + padding + (availableWidth - drawWidth) / 2;
  const imageY = box.y + padding + (availableHeight - drawHeight) / 2;
  ctx.drawImage(image, imageX, imageY, drawWidth, drawHeight);

  ctx.fillStyle = "#111111";
  ctx.font = "600 18px 'Segoe UI', sans-serif";
  ctx.fillText(label, box.x + padding, box.y + box.height - 26);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    const { width } = ctx.measureText(testLine);
    if (width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  });

  if (line) {
    ctx.fillText(line, x, currentY);
  }
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo cargar una de las imágenes"));
    image.src = source;
  });
}

function createPdfFromImages(pages, pageWidth, pageHeight) {
  const encoder = new TextEncoder();
  const parts = [];
  const offsets = [];
  let length = 0;

  const pushUint8 = (array) => {
    parts.push(array);
    length += array.length;
  };

  const pushString = (value) => {
    pushUint8(encoder.encode(value));
  };

  pushString("%PDF-1.3\n");

  const catalogId = 1;
  const pagesId = 2;
  let nextId = 3;

  const imageIds = [];
  const contentIds = [];
  const pageIds = [];

  pages.forEach(() => {
    const imageId = nextId++;
    const contentId = nextId++;
    const pageId = nextId++;
    imageIds.push(imageId);
    contentIds.push(contentId);
    pageIds.push(pageId);
  });

  const totalObjects = nextId - 1;

  const writeObject = (id, bodyParts) => {
    offsets[id] = length;
    pushString(`${id} 0 obj\n`);
    bodyParts.forEach((part) => {
      if (typeof part === "string") {
        pushString(part);
      } else {
        pushUint8(part);
      }
    });
    pushString("\nendobj\n");
  };

  writeObject(catalogId, [`<< /Type /Catalog /Pages ${pagesId} 0 R >>`]);

  const kidsList = pageIds.map((id) => `${id} 0 R`).join(" ");
  writeObject(pagesId, [`<< /Type /Pages /Count ${pages.length} /Kids [${kidsList}] >>`]);

  pages.forEach((page, index) => {
    const imageId = imageIds[index];
    const contentId = contentIds[index];
    const pageId = pageIds[index];
    const imName = `/Im${index + 1}`;

    const contentStream = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm ${imName} Do Q\n`;
    const contentBytes = encoder.encode(contentStream);

    writeObject(pageId, [
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << ${imName} ${imageId} 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ${contentId} 0 R >>`,
    ]);

    writeObject(contentId, [
      `<< /Length ${contentBytes.length} >>\nstream\n`,
      contentBytes,
      "\nendstream",
    ]);

    const imageData = base64ToUint8Array(page.dataUrl.split(",")[1]);
    writeObject(imageId, [
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageData.length} >>\nstream\n`,
      imageData,
      "\nendstream",
    ]);
  });

  const startXref = length;
  pushString(`xref\n0 ${totalObjects + 1}\n`);
  pushString("0000000000 65535 f \n");
  for (let i = 1; i <= totalObjects; i += 1) {
    const offset = offsets[i] ?? 0;
    const offsetString = offset.toString().padStart(10, "0");
    pushString(`${offsetString} 00000 n \n`);
  }
  pushString(
    `trailer\n<< /Size ${totalObjects + 1} /Root ${catalogId} 0 R >>\nstartxref\n${startXref}\n%%EOF`
  );

  return new Blob(parts, { type: "application/pdf" });
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const length = binary.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
