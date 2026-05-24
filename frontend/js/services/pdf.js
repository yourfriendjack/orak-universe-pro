//  PDF VIEWER + POST-ITS
//  CAPA 2: PDFReader — 4 colores de notas
//  Clic → crea nota con coords (x,y)
// ════════════════════════════════════════
let _pdfDoc           = null;
let _pdfPage          = 1;
let _pdfNotas         = [];
let _pdfLibroActivo   = null;
let _pdfUrlActiva     = null;
let _colorSeleccionado = '#fef08a';  // Amarillo por defecto
let _pdfFileCache     = null;

const SUPABASE_PDF_BUCKET = 'orak-pdfs';

// Colores de post-its: Rosa, Azul, Amarillo, Verde
const POSTIT_COLORS = {
  rosa:     '#fbcfe8',
  azul:     '#bfdbfe',
  amarillo: '#fef08a',
  verde:    '#bbf7d0',
};

async function renderPDF() {
  let pdfsGuardados = [];
  try {
    const { data } = await _sb.from('pdfs').select('titulo,pdf_url,pdf_nombre,subido_en').order('subido_en',{ascending:false});
    pdfsGuardados = data || [];
  } catch(e) {
    console.warn('Error cargando PDFs:', e);
  }

  const hayPDFs = pdfsGuardados.length > 0;
  return `
    <div class="main-breadcrumb"><span>INICIO</span><span class="bc-sep">/</span><span class="bc-current">MIS LIBROS (PDF)</span></div>
    <div class="feed-header">
      <div><div class="feed-title">📄 Mis Libros</div><div class="feed-sub">PDFs del universo con notas colaborativas</div></div>
      <button class="btn btn-primary btn-sm" onclick="abrirModalSubirPDF()">⬆ Subir PDF</button>
    </div>

    ${hayPDFs?`<div class="pdf-library-grid">${pdfsGuardados.map(p=>`
      <div class="pdf-book-card" onclick="abrirPDFGuardado('${esc(p.pdf_url)}','${esc(p.titulo)}')">
        <div class="pdf-book-thumb">📄<div class="pdf-notas-count" id="notasCount-${esc(p.id)}">✨ notas</div></div>
        <div class="pdf-book-info">
          <div class="pdf-book-titulo">${esc(p.pdf_nombre||p.titulo+'.pdf')}</div>
          <div class="pdf-book-libro">📖 ${esc(p.titulo)}</div>
          <div class="pdf-book-btns">
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();abrirPDFGuardado('${esc(p.pdf_url)}','${esc(p.titulo)}')">📖 Leer</button>
            <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();eliminarPDF('${esc(p.titulo)}','${esc(p.pdf_url)}')">🗑</button>
          </div>
        </div>
      </div>`).join('')}</div>`:`
    <div class="pdf-upload-zone" style="margin-bottom:24px" onclick="document.getElementById('pdfInputZona').click()"
      ondragover="event.preventDefault();this.classList.add('dragover')"
      ondragleave="this.classList.remove('dragover')"
      ondrop="event.preventDefault();this.classList.remove('dragover');manejarDropPDF(event)">
      <input type="file" id="pdfInputZona" accept=".pdf" style="display:none" onchange="seleccionarArchivoPDFYAbrir(this)">
      <div style="font-size:48px;margin-bottom:16px">📚</div>
      <div style="font-weight:700;font-size:16px;margin-bottom:6px">Sube el primer PDF al universo</div>
      <div style="font-size:13px;color:var(--text2)">Arrastra aquí o haz clic para seleccionar</div>
    </div>`}

    ${_pdfDoc?`<div style="margin-top:8px">
      <div class="pdf-toolbar" style="border-radius:12px 12px 0 0">
        <span style="font-size:13px;font-weight:600;color:var(--gold-lt)">📖 ${esc(_pdfLibroActivo||'PDF')}</span>
        <button class="btn btn-ghost btn-sm" id="btnPrevPage" onclick="cambiarPagina(-1)">◀</button>
        <span id="pdfPagInfo" style="font-size:12px;color:var(--text2)">—</span>
        <button class="btn btn-ghost btn-sm" id="btnNextPage" onclick="cambiarPagina(1)">▶</button>
        <div style="margin-left:auto;display:flex;gap:6px;align-items:center">
          <span style="font-size:11px;color:var(--text2)">🖊 Nota:</span>
          ${Object.entries(POSTIT_COLORS).map(([nombre,color])=>`
            <div class="color-opt ${_colorSeleccionado===color?'sel':''}" style="background:${color}" title="${nombre}"
              onclick="selColor('${color}',this)"></div>`).join('')}
        </div>
      </div>
      <div class="pdf-container" id="pdfContainer" style="border-radius:0 0 12px 12px">
        <div style="text-align:center;padding:40px;color:var(--text2)">Cargando PDF...</div>
      </div>
    </div>`:''}`;
}

async function initPDF() {
  cargarPDFjs();
  if(_pdfDoc) renderPaginaPDF();
}

function cargarPDFjs() {
  if(window.pdfjsLib) return Promise.resolve();
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve();
    };
    document.head.appendChild(s);
  });
}

function abrirModalSubirPDF() {
  const sel = document.getElementById('pdfLibroAsociar');
  if(sel) {
    sel.innerHTML = '<option value="">— Selecciona un libro existente —</option>' +
      _libros.map(l => `<option value="${esc(l.titulo)}">${esc(l.titulo)}</option>`).join('');
  }
  document.getElementById('modalSubirPDFOverlay').classList.add('open');
}

function cerrarModalSubirPDF() {
  document.getElementById('modalSubirPDFOverlay').classList.remove('open');
  document.getElementById('pdfFileNombre').textContent = '';
  document.getElementById('pdfUploadProgress').style.display = 'none';
  document.getElementById('pdfLibroNuevo').value = '';
  _pdfFileCache = null;
}

function seleccionarArchivoPDF(input) {
  const file = input.files?.[0];
  if(!file) return;
  if(!file.name.toLowerCase().endsWith('.pdf')) { toast('Solo se aceptan archivos PDF','err'); return; }
  _pdfFileCache = file;
  const el = document.getElementById('pdfFileNombre');
  if(el) el.textContent = '📄 ' + file.name;
}

function manejarDropPDF(event) {
  const file = event.dataTransfer?.files?.[0];
  if(!file || !file.name.endsWith('.pdf')) { toast('Solo se aceptan archivos PDF','err'); return; }
  _pdfFileCache = file;
  abrirModalSubirPDF();
  requestAnimationFrame(() => {
    const el = document.getElementById('pdfFileNombre');
    if(el) el.textContent = '📄 ' + file.name;
  });
}

function seleccionarArchivoPDFYAbrir(input) {
  const file = input.files?.[0];
  if(!file) return;
  _pdfFileCache = file;
  abrirModalSubirPDF();
  requestAnimationFrame(() => {
    const el = document.getElementById('pdfFileNombre');
    if(el) el.textContent = '📄 ' + file.name;
  });
}

async function subirPDFASupabase() {
  if(!_pdfFileCache) return toast('Selecciona un archivo PDF primero', 'err');
  const libroExistente = document.getElementById('pdfLibroAsociar').value.trim();
  const libroNuevo     = document.getElementById('pdfLibroNuevo').value.trim();
  const tituloLibro    = libroExistente || libroNuevo;
  if(!tituloLibro) return toast('Asocia el PDF a un libro', 'err');

  // Mostrar progress
  const prog = document.getElementById('pdfUploadProgress');
  const progBar = document.getElementById('pdfUploadBar');
  if(prog) prog.style.display = 'block';

  try {
    // 1. Subir a Supabase Storage
    const nombreArchivo = `${Date.now()}_${_pdfFileCache.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const arrayBuffer   = await _pdfFileCache.arrayBuffer();

    if(progBar) progBar.style.width = '40%';

    const { data: uploadData, error: uploadError } = await _sb
      .storage
      .from(SUPABASE_PDF_BUCKET)
      .upload(nombreArchivo, arrayBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if(uploadError) throw new Error(uploadError.message);

    if(progBar) progBar.style.width = '70%';

    // 2. Obtener URL pública
    const { data: urlData } = _sb.storage.from(SUPABASE_PDF_BUCKET).getPublicUrl(nombreArchivo);
    const pdfUrl = urlData.publicUrl;

    // 3. Guardar referencia en la tabla libros de Supabase
    await _sb.from('pdfs').upsert({
      titulo:     tituloLibro,
      pdf_url:    pdfUrl,
      pdf_nombre: _pdfFileCache.name,
      subido_en:  new Date().toISOString()
    }, { onConflict: 'titulo' });

    if(progBar) progBar.style.width = '100%';

    // 4. Si es libro nuevo, crearlo también (ignorar error si ya existe)
    if(libroNuevo && !_libros.find(l => l.titulo === libroNuevo)) {
      try {
        await POST('/libros', { titulo: libroNuevo, descripcion: 'Libro con PDF' });
      } catch(e) {
        console.warn('Libro ya existe o error al crear:', e);
      }
    }

    await abrirPDFDesdeURL(pdfUrl, tituloLibro, _pdfFileCache.name);
    cerrarModalSubirPDF();
    toast('📄 PDF guardado en la nube ✓', 'ok');

  } catch(e) {
    console.error('Error subiendo PDF:', e);
    // Fallback: abrir localmente sin guardar
    const localUrl = URL.createObjectURL(_pdfFileCache);
    await abrirPDFDesdeURL(localUrl, tituloLibro, _pdfFileCache.name);
    cerrarModalSubirPDF();
    toast(`⚠ PDF abierto en modo local (${e.message})`, 'err');
  }
}

async function abrirPDFGuardado(url, titulo) {
  await cargarPDFjs();
  await abrirPDFDesdeURL(url, titulo, titulo + '.pdf');
  setVista('pdf');
}

async function abrirPDFDesdeURL(url, titulo, nombre) {
  _pdfLibroActivo = titulo;
  _pdfUrlActiva   = url;
  _pdfPage        = 1;
  try {
    _pdfDoc = await pdfjsLib.getDocument(url).promise;
    // Cargar notas desde Supabase (fuente de verdad)
    try {
      const { data: notasData } = await _sb.from('notas_pdf').select('*').eq('libro', titulo);
      _pdfNotas = notasData || [];
      // Actualizar cache local
      const otras = JSON.parse(localStorage.getItem('orak_notas')||'[]').filter(n => n.libro !== titulo);
      localStorage.setItem('orak_notas', JSON.stringify([...otras, ..._pdfNotas]));
    } catch(e) {
      // Fallback a localStorage si Supabase falla
      _pdfNotas = JSON.parse(localStorage.getItem('orak_notas') || '[]').filter(n => n.libro === titulo);
    }
    const container = document.getElementById('pdfContainer');
    if(container) await renderPaginaPDF();
    else {
      const main = document.getElementById('mainContent');
      if(main) main.innerHTML = await renderPDF();
      await renderPaginaPDF();
    }
  } catch(e) {
    console.error(e); toast('Error al abrir el PDF', 'err');
  }
}

// Guardar notas en localStorage + Supabase si hay sesión
async function guardarNotasLocal(nota) {
  // 1. Guardar en localStorage (cache inmediato)
  const todas = JSON.parse(localStorage.getItem('orak_notas') || '[]');
  const idx   = todas.findIndex(n => n.id === nota.id);
  if(idx >= 0) todas[idx] = nota;
  else todas.push(nota);
  localStorage.setItem('orak_notas', JSON.stringify(todas));

  // 2. Persistir en Supabase (fuente de verdad)
  try {
    await _sb.from('notas_pdf').upsert({
      id:     nota.id,
      libro:  nota.libro,
      pagina: nota.pagina,
      texto:  nota.texto,
      color:  nota.color,
      x:      nota.x,
      y:      nota.y,
    }, { onConflict: 'id' });
  } catch(e) {
    console.warn('Error guardando nota en Supabase:', e);
  }
}

async function renderPaginaPDF() {
  if(!_pdfDoc) return;
  const page     = await _pdfDoc.getPage(_pdfPage);
  const viewport = page.getViewport({ scale: 1.5 });
  const container = document.getElementById('pdfContainer');
  if(!container) return;

  container.innerHTML = `<div class="pdf-canvas-wrap" id="pdfWrap" style="width:${viewport.width}px;max-width:100%">
    <canvas id="pdfCanvas" width="${viewport.width}" height="${viewport.height}" style="max-width:100%;height:auto"></canvas>
  </div>`;

  const canvas = document.getElementById('pdfCanvas');
  const ctx    = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;

  const pagInfo = document.getElementById('pdfPagInfo');
  if(pagInfo) pagInfo.textContent = `${_pdfPage} / ${_pdfDoc.numPages}`;

  // Eventos: clic en el PDF crea un post-it en esas coordenadas (x,y)
  const wrap = document.getElementById('pdfWrap');
  let holdTimer;
  const startHold = (e) => {
    holdTimer = setTimeout(() => {
      const rect   = wrap.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = ((clientX - rect.left) / rect.width)  * 100;
      const y = ((clientY - rect.top)  / rect.height) * 100;
      crearPostit(x, y, wrap);
    }, 400);
  };
  wrap.addEventListener('click', (e) => {
    const rect   = wrap.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width)  * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    crearPostit(x, y, wrap);
  });
  wrap.addEventListener('touchstart', startHold, { passive: true });
  wrap.addEventListener('mouseup',  () => clearTimeout(holdTimer));
  wrap.addEventListener('touchend', () => clearTimeout(holdTimer));

  // Renderizar notas existentes de esta página
  const notasPag = _pdfNotas.filter(n => n.pagina === _pdfPage);
  notasPag.forEach(n => renderPostit(n, wrap));
}

function cambiarPagina(dir) {
  if(!_pdfDoc) return;
  const nueva = _pdfPage + dir;
  if(nueva < 1 || nueva > _pdfDoc.numPages) return;
  _pdfPage = nueva;
  renderPaginaPDF();
}

function selColor(color, el) {
  _colorSeleccionado = color;
  document.querySelectorAll('.color-opt').forEach(x => x.classList.remove('sel'));
  el.classList.add('sel');
}

/**
 * Crear post-it vinculado a coordenadas (x, y) dentro del PDF.
 * Al guardar, dispara +25 Glimmers (engine.js — economía).
 */
function crearPostit(x, y, wrap) {
  const nota = {
    id:     Date.now().toString(),
    libro:  _pdfLibroActivo || '',
    pagina: _pdfPage,
    x, y,
    texto:  '',
    color:  _colorSeleccionado,
    autor:  'Yo',
    ts:     Date.now(),
  };
  const texto = prompt('Escribe tu nota:');
  if(!texto) return;
  nota.texto = texto;
  _pdfNotas.push(nota);
  guardarNotasLocal(nota);
  renderPostit(nota, wrap);
  // +25 Glimmers al crear nota (CAPA 3: engine.js)
  ganarGlimmers(25, wrap);
  notifLocal('nota', `Nueva nota en <strong>${esc(_pdfLibroActivo||'PDF')}</strong>`, 'pdf', _pdfLibroActivo);
}

function renderPostit(nota, wrap) {
  const el = document.createElement('div');
  el.className = 'postit';
  el.dataset.id = nota.id;
  el.style.cssText = `left:${nota.x}%;top:${nota.y}%;background:${nota.color};transform:rotate(${(Math.random()-.5)*6}deg)`;
  el.innerHTML = `
    <div class="postit-header">
      <span class="postit-autor">${esc(nota.autor)}</span>
      <button class="postit-del" onclick="eliminarPostit('${nota.id}',this.closest('.postit'))">✕</button>
    </div>
    <div class="postit-texto">${esc(nota.texto)}</div>`;
  // Drag (mouse + touch) — Mobile-First
  let ox=0, oy=0, dx=0, dy=0;
  const md = (e) => {
    e.preventDefault();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = wrap.getBoundingClientRect();
    ox = cx - (parseFloat(el.style.left)/100 * rect.width);
    oy = cy - (parseFloat(el.style.top)/100  * rect.height);
    el.classList.add('dragging');
    const mm = (ev) => {
      const mx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const my = ev.touches ? ev.touches[0].clientY : ev.clientY;
      dx = Math.max(0, Math.min(100, (mx-ox)/rect.width*100));
      dy = Math.max(0, Math.min(100, (my-oy)/rect.height*100));
      el.style.left = dx+'%'; el.style.top = dy+'%';
    };
    const mu = () => {
      nota.x = dx; nota.y = dy; guardarNotasLocal(nota);
      el.classList.remove('dragging');
      document.removeEventListener('mousemove',mm); document.removeEventListener('mouseup',mu);
      document.removeEventListener('touchmove',mm); document.removeEventListener('touchend',mu);
    };
    document.addEventListener('mousemove',mm); document.addEventListener('mouseup',mu);
    document.addEventListener('touchmove',mm,{passive:false}); document.addEventListener('touchend',mu);
  };
  el.querySelector('.postit-header').addEventListener('mousedown', md);
  el.querySelector('.postit-header').addEventListener('touchstart', md, {passive:false});
  wrap.appendChild(el);
}

async function eliminarPostit(id, el) {
  _pdfNotas = _pdfNotas.filter(n => n.id !== id);
  // Local
  const todas = JSON.parse(localStorage.getItem('orak_notas')||'[]').filter(n => n.id !== id);
  localStorage.setItem('orak_notas', JSON.stringify(todas));
  // Supabase
  try { await _sb.from('notas_pdf').delete().eq('id', id); } catch(e) {}
  el.style.transition = 'all .2s'; el.style.opacity='0'; el.style.transform='scale(0)';
  setTimeout(() => el.remove(), 200);
}

