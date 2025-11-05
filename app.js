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

async function generatePdf() {
  if (!validateForm()) return;

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
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("Inventario de entrega", 40, 60);

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Dirección: ${direccion}`, 40, 90);
  pdf.text(`Asesor: ${asesor}`, 40, 110);
  pdf.text(`Inquilino/Recibe: ${inquilino}`, 40, 130);
  pdf.text(`Fecha: ${fechaFormateada}`, 40, 150);

  pdf.setFont("helvetica", "bold");
  pdf.text("Inventario fotográfico", 40, 190);

  const photoWidth = 220;
  const photoHeight = 160;
  const photosPerRow = 2;
  const rowSpacing = 40;
  const marginTop = 210;
  const marginLeft = 40;
  const pageHeight = pdf.internal.pageSize.getHeight();
  let currentY = marginTop;
  let itemsInRow = 0;

  pdf.setFont("helvetica", "normal");

  photos.forEach((photo, index) => {
    if (itemsInRow === photosPerRow) {
      itemsInRow = 0;
      currentY += photoHeight + rowSpacing;
    }

    if (currentY + photoHeight > pageHeight - 160) {
      pdf.addPage();
      pdf.setFont("helvetica", "normal");
      currentY = 60;
      itemsInRow = 0;
    }

    const xPos = marginLeft + itemsInRow * (photoWidth + 20);
    pdf.addImage(photo, "JPEG", xPos, currentY, photoWidth, photoHeight);
    pdf.text(`Foto ${index + 1}`, xPos, currentY + photoHeight + 15);

    itemsInRow += 1;
  });

  pdf.addPage();
  pdf.setFont("helvetica", "bold");
  pdf.text("Firma y selfie de verificación", 40, 80);

  const signatureData = signatureCanvas.toDataURL("image/png");
  pdf.setFont("helvetica", "normal");
  pdf.text(`Nombre del firmante: ${firmaNombre.value}`, 40, 110);
  pdf.text("Firma:", 40, 140);
  pdf.addImage(signatureData, "PNG", 40, 150, 300, 120);

  pdf.text("Selfie de verificación:", 40, 300);
  pdf.addImage(selfieImage, "JPEG", 40, 310, 220, 180);

  const sanitizedInquilino = inquilino.replace(/\s+/g, "_");
  const fileName = `inventario_${sanitizedInquilino}.pdf`;
  const pdfBlob = pdf.output("blob");
  pdf.save(fileName);
  await sharePdfWithWhatsApp(pdfBlob, fileName, direccion, fechaFormateada);
}

generatePdfBtn.addEventListener("click", generatePdf);

window.addEventListener("beforeunload", () => {
  stopStream(cameraStream, cameraVideo);
  stopStream(selfieStream, selfieVideo);
});

async function sharePdfWithWhatsApp(pdfBlob, fileName, direccion, fecha) {
  const messageBase = `Inventario del inmueble ${direccion} realizado el ${fecha}. Se adjunta el PDF.`;

  for (const recipient of WHATSAPP_RECIPIENTS) {
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
      window.open(whatsappLink, "_blank");
      alert(
        `Se abrió el chat de WhatsApp para ${recipient.label}. Adjunta el archivo ${fileName} que se descargó automáticamente.`
      );
    }
  }
}
