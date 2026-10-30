/* FotoLista OSS — MIT — Funciona enteramente en el navegador, sin subir imágenes. */
'use strict';

const $ = (id) => document.getElementById(id);
const DPI = 300;
const MAX_FILES = 10;
let chosenFiles = [];

const fileInput = $('fileInput');
const dropzone = $('dropzone');
const convertButton = $('convertButton');
const controls = ['sizePreset', 'orientation', 'fitMode', 'backgroundColor'];

// Centímetros a píxeles, redondeando a la medida más cercana.
function outputDimensions() {
  const [first, second] = $('sizePreset').value.split('x').map(Number);
  const portrait = $('orientation').value === 'portrait';
  const [widthCm, heightCm] = portrait ? [Math.min(first,second), Math.max(first,second)]
                                        : [Math.max(first,second), Math.min(first,second)];
  return {
    widthCm, heightCm,
    width: Math.round(widthCm * DPI / 2.54),
    height: Math.round(heightCm * DPI / 2.54)
  };
}

function updateDimensions() {
  const {width, height, widthCm, heightCm} = outputDimensions();
  $('dimensions').textContent = `${widthCm} × ${heightCm} cm · ${width} × ${height} píxeles · ${DPI} DPI`;
}

function setStatus(message, kind = '') {
  $('status').textContent = message;
  $('status').className = 'status' + (kind ? ' ' + kind : '');
}

function selectFiles(files) {
  const candidates = [...files].filter(f => ['image/jpeg','image/png','image/webp'].includes(f.type));
  if (candidates.length > MAX_FILES) {
    setStatus(`Selecciona como máximo ${MAX_FILES} imágenes por lote.`, 'error');
    return;
  }
  if (!candidates.length) {
    chosenFiles = [];
    convertButton.disabled = true;
    $('selection').textContent = 'No se encontraron imágenes JPG, PNG o WebP.';
    setStatus('Selecciona imágenes compatibles para continuar.', 'error');
    return;
  }
  chosenFiles = candidates;
  convertButton.disabled = false;
  $('selection').textContent = `${candidates.length} imagen(es): ${candidates.map(f => f.name).join(' · ')}`;
  setStatus('Todo listo. Pulsa «Preparar fotografías».');
}

// Utilizar img.decode() y canvas respeta la proporción; nunca estiramos los rostros.
async function readImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // Se conserva el objeto imagen decodificado, pero el object URL ya no es necesario.
    URL.revokeObjectURL(url);
  }
}

function blobFromCanvas(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo generar el archivo JPG.')),
                  'image/jpeg', 0.94);
  });
}

async function convertPhoto(file, settings) {
  const img = await readImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = settings.width;
  canvas.height = settings.height;
  const ctx = canvas.getContext('2d', {alpha:false});
  if (!ctx) throw new Error('Este navegador no permite procesar imágenes.');

  ctx.fillStyle = settings.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const scale = settings.fitMode === 'cover'
    ? Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight)
    : Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
  const drawnWidth = img.naturalWidth * scale;
  const drawnHeight = img.naturalHeight * scale;
  ctx.drawImage(img, (canvas.width - drawnWidth) / 2, (canvas.height - drawnHeight) / 2,
    drawnWidth, drawnHeight);
  const jpgBlob = await blobFromCanvas(canvas);
  // Los JPG del navegador a menudo se etiquetan como 96 DPI. Reescribimos JFIF a 300 DPI.
  return setJpegDensity(jpgBlob, DPI);
}

// JFIF: unidad 1 = puntos por pulgada; campos Xdensity e Ydensity.
// Si el JPG no contiene un segmento JFIF, insertamos uno después de SOI.
async function setJpegDensity(blob, dpi) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('El navegador devolvió un archivo JPG inválido.');
  let offset = 2;
  while (offset + 4 < bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break; // inicio de datos o fin
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue; }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) break;
    if (marker === 0xe0 && length >= 16 &&
        bytes[offset+4] === 0x4a && bytes[offset+5] === 0x46 &&
        bytes[offset+6] === 0x49 && bytes[offset+7] === 0x46 && bytes[offset+8] === 0x00) {
      bytes[offset+11] = 1; // pulgadas
      bytes[offset+12] = (dpi >> 8) & 255;
      bytes[offset+13] = dpi & 255;
      bytes[offset+14] = (dpi >> 8) & 255;
      bytes[offset+15] = dpi & 255;
      return new Blob([bytes], {type:'image/jpeg'});
    }
    offset += 2 + length;
  }
  const jfif = new Uint8Array([0xff,0xe0,0x00,0x10,0x4a,0x46,0x49,0x46,0x00,
                               0x01,0x01,0x01,(dpi>>8)&255,dpi&255,(dpi>>8)&255,dpi&255,0,0]);
  return new Blob([bytes.slice(0,2), jfif, bytes.slice(2)], {type:'image/jpeg'});
}

function safeFilename(name) {
  return name.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0,70) || 'foto';
}
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// ZIP sin compresión adicional, válido para JPG y sin dependencias externas.
function crc32(bytes) {
  let crc = -1;
  for (const b of bytes) {
    crc ^= b;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
}
function dosDateTime() {
  const now = new Date();
  const date = ((Math.max(1980, now.getFullYear())-1980) << 9) | ((now.getMonth()+1) << 5) | now.getDate();
  const time = (now.getHours()<<11) | (now.getMinutes()<<5) | Math.floor(now.getSeconds()/2);
  return {date,time};
}
function zipFiles(files) {
  const chunks = [], centralChunks = [];
  let offset = 0;
  const {date,time} = dosDateTime();
  const encoder = new TextEncoder();
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = file.bytes;
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true); // versión
    lv.setUint16(6, 0x0800, true); // codificación UTF-8
    lv.setUint16(8, 0, true); // sin compresión
    lv.setUint16(10, time, true); lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name,30);
    chunks.push(local,data);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(12, time, true); cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name,46);
    centralChunks.push(central);
    offset += local.length + data.length;
  }
  const cdSize = centralChunks.reduce((sum,chunk)=>sum+chunk.length,0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  return new Blob([...chunks,...centralChunks,end], {type:'application/zip'});
}

async function processImages() {
  if (!chosenFiles.length) return;
  convertButton.disabled = true;
  controls.forEach(id => $(id).disabled = true);
  fileInput.disabled = true;
  const settings = {...outputDimensions(), fitMode:$('fitMode').value, background:$('backgroundColor').value};
  const processed = [];
  const usedNames = new Set();
  try {
    for (let i=0; i<chosenFiles.length; i++) {
      setStatus(`Preparando fotografía ${i+1} de ${chosenFiles.length}: ${chosenFiles[i].name}`);
      await new Promise(resolve => setTimeout(resolve,0));
      const output = await convertPhoto(chosenFiles[i], settings);
      let stem = safeFilename(chosenFiles[i].name);
      let filename = `${stem}_${settings.widthCm}x${settings.heightCm}cm_300dpi.jpg`;
      let n = 2;
      while (usedNames.has(filename)) filename = `${stem}_${n++}_${settings.widthCm}x${settings.heightCm}cm_300dpi.jpg`;
      usedNames.add(filename);
      processed.push({name: filename, bytes:new Uint8Array(await output.arrayBuffer()), blob:output});
    }
    if (processed.length === 1) {
      download(processed[0].blob, processed[0].name);
    } else {
      const zip = zipFiles(processed);
      download(zip, 'FotoLista_OSS_fotos_300dpi.zip');
    }
    setStatus(`¡Listo! Se prepararon ${processed.length} fotografía(s). Revisa tu carpeta de descargas.`, 'success');
  } catch (error) {
    console.error(error);
    setStatus(`No se pudo completar: ${error.message} Prueba con imágenes más pequeñas o menos archivos.`, 'error');
  } finally {
    controls.forEach(id => $(id).disabled = false);
    fileInput.disabled = false;
    convertButton.disabled = false;
  }
}

dropzone.addEventListener('click', () => { if (!fileInput.disabled) fileInput.click(); });
dropzone.addEventListener('keydown', ev => {
  if ((ev.key === 'Enter' || ev.key === ' ') && !fileInput.disabled) {ev.preventDefault();fileInput.click();}
});
dropzone.addEventListener('dragover', ev => { ev.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', ev => {
  ev.preventDefault(); dropzone.classList.remove('dragover');
  if (!fileInput.disabled) selectFiles(ev.dataTransfer.files);
});
fileInput.addEventListener('change', () => selectFiles(fileInput.files));
controls.forEach(id => $(id).addEventListener('change', updateDimensions));
convertButton.addEventListener('click', processImages);
updateDimensions();
