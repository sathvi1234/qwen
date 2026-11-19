(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const cv = $('#poster'), g = cv.getContext('2d');
  const S = { tpl: null, img: null, zoom: 1, ox: 0, oy: 0, name: '' };
  // Photo frame geometry, in the tilted card's own coordinates
  const CARD = { cx: 522, cy: 555, rot: -8 * Math.PI / 180 };
  const PHOTO = { x: -195, y: -225, w: 390, h: 340, r: 22 };
  const PILL = { x: -195, y: 130, w: 390, h: 76 };

  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };

  function paintMessage(text) {
    g.fillStyle = '#f3effd';
    g.fillRect(0, 0, 1254, 1254);
    g.fillStyle = '#22124f';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '600 36px Inter, sans-serif';
    const words = text.split(' '), lines = [];
    let line = '';
    words.forEach(word => {
      const next = line ? line + ' ' + word : word;
      if (g.measureText(next).width > 900 && line) { lines.push(line); line = word; }
      else line = next;
    });
    if (line) lines.push(line);
    lines.forEach((row, i) => g.fillText(row, 627, 627 + (i - (lines.length - 1) / 2) * 48));
    g.textBaseline = 'alphabetic';
  }

  function draw() {
    try {
      g.clearRect(0, 0, 1254, 1254);
      if (!S.tpl) { paintMessage(S.tplError || 'Loading the event poster…'); return; }
      g.drawImage(S.tpl, 0, 0, 1254, 1254);
      drawFrame();
    } catch (err) {
      console.error(err);
      try { paintMessage('The poster could not be drawn. Reload the page and try again.'); }
      catch (inner) { console.error(inner); }
      toast('The poster could not be drawn. Reload the page and try again.');
    }
  }

  function drawFrame() {
    const name = S.name.trim();
    if (!S.img && !name) return;
    g.save(); g.translate(CARD.cx, CARD.cy); g.rotate(CARD.rot);
    if (S.img) {
      g.save(); rr(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h, PHOTO.r); g.clip();
      const base = Math.max(PHOTO.w / S.img.width, PHOTO.h / S.img.height) * S.zoom;
      const w = S.img.width * base, h = S.img.height * base;
      clamp(w, h);
      g.drawImage(S.img, PHOTO.x + (PHOTO.w - w) / 2 + S.ox, PHOTO.y + (PHOTO.h - h) / 2 + S.oy, w, h);
      g.restore();
    }
    if (name) {
      rr(PILL.x, PILL.y, PILL.w, PILL.h, 38); g.fillStyle = '#efe9fd'; g.fill();
      let size = 40; const fam = 'Fraunces, Georgia, serif';
      do { g.font = `italic 600 ${size}px ${fam}`; size -= 2; } while (g.measureText(name).width > PILL.w - 60 && size > 16);
      g.fillStyle = '#22124f'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(name, 0, PILL.y + PILL.h / 2 + 2); g.textBaseline = 'alphabetic';
    }
    g.restore();
  }
  function clamp(w, h) {
    const mx = Math.max(0, (w - PHOTO.w) / 2), my = Math.max(0, (h - PHOTO.h) / 2);
    S.ox = Math.min(mx, Math.max(-mx, S.ox)); S.oy = Math.min(my, Math.max(-my, S.oy));
  }

  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); };

  function loadFile(f) {
    if (!f || !/^image\/(jpeg|png|webp|gif|bmp)$/.test(f.type)) return toast('Please choose an image file (JPG, PNG or WebP).');
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      if (!im.naturalWidth || !im.naturalHeight) {
        URL.revokeObjectURL(url);
        return toast('That image could not be read. Try a JPG or PNG.');
      }
      S.img = im; S.zoom = 1; S.ox = S.oy = 0; $('#zoom').value = 1; $('#adjust').hidden = false;
      $('#drop').classList.add('has'); $('#drop-text').textContent = 'Photo added. Click to change it.';
      draw(); URL.revokeObjectURL(url);
    };
    im.onerror = () => { URL.revokeObjectURL(url); toast('That image could not be read. Try a JPG or PNG.'); };
    im.src = url;
  }

  // Controls
  const drop = $('#drop'), file = $('#file');
  drop.addEventListener('click', () => file.click());
  drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
  file.addEventListener('change', () => loadFile(file.files[0]));
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));
  $('#name').addEventListener('input', e => { S.name = e.target.value; draw(); });
  $('#zoom').addEventListener('input', e => { S.zoom = +e.target.value; draw(); });

  // Drag to reposition (pointer events cover mouse and touch)
  let last = null;
  cv.addEventListener('pointerdown', e => { if (!S.img) return; last = e; cv.setPointerCapture(e.pointerId); cv.classList.add('drag'); });
  cv.addEventListener('pointermove', e => {
    if (!last) return;
    const k = 1254 / cv.getBoundingClientRect().width, dx = (e.clientX - last.clientX) * k, dy = (e.clientY - last.clientY) * k;
    const c = Math.cos(CARD.rot), s = Math.sin(CARD.rot); // rotate screen delta into card space
    S.ox += dx * c + dy * s; S.oy += -dx * s + dy * c; last = e; draw();
  });
  const end = () => { last = null; cv.classList.remove('drag'); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);

  const blob = () => new Promise(r => cv.toBlob(r, 'image/png'));
  const fname = () => 'im-attending-' + ((S.name.trim() || 'poster').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'poster') + '.png';
  const need = () => { if (!S.name.trim() || !S.img) { toast('Add your name and photo first.'); return true; } };

  $('#download').addEventListener('click', async () => {
    if (need()) return;
    if (!S.tpl) return toast('The poster background is still missing, so there is nothing to download yet.');
    let b;
    try { b = await blob(); } catch (err) { console.error(err); return toast('The poster could not be exported. Try again.'); }
    if (!b) return toast('The poster could not be exported. Try again.');
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fname();
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Poster downloaded');
  });
  $('#share').addEventListener('click', async () => {
    if (need()) return;
    if (!S.tpl) return toast('The poster background is still missing, so there is nothing to share yet.');
    const text = "I'm attending Qwen Hyderabad × Kramer's Community #3 on Nov 21, 2026 at DevX, Hyderabad!";
    try {
      const png = await blob();
      if (!png) return toast('The poster could not be exported. Download it instead.');
      const file = new File([png], fname(), { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) return await navigator.share({ files: [file], text });
      if (navigator.share) return await navigator.share({ text, url: location.href });
      await navigator.clipboard.writeText(`${text} ${location.href}`); toast('Link copied. Download the poster to attach it.');
    } catch (e) { if (e.name !== 'AbortError') toast('Sharing is unavailable here. Download the poster instead.'); }
  });

  // Init
  const tpl = new Image();
  tpl.onload = () => {
    if (!tpl.naturalWidth) { S.tplError = 'The poster template loaded, but it is not a usable image.'; draw(); return; }
    S.tpl = tpl; S.tplError = ''; draw();
  };
  tpl.onerror = () => { S.tplError = 'The poster background could not be loaded. Check that assets/poster-template.jpg is available, then reload.'; draw(); toast(S.tplError); };
  tpl.src = 'assets/poster-template.jpg';
  draw();
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('italic 600 40px Fraunces'),
      document.fonts.load('600 34px Inter')
    ]).then(() => draw()).catch(() => draw());
  }
})();
