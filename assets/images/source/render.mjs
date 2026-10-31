// Mezatonline simge seti: SVG kaynaklarını üretir ve PNG'ye çevirir.
// Gerekli paketler (projeye eklenmez): npm i @resvg/resvg-js pngjs
// Kullanım: node render.mjs assets/images/source assets/images
/* eslint-disable import/no-unresolved -- geliştirme aracı; paketler projeye eklenmez */
import { Resvg } from '@resvg/resvg-js';
import pngjs from 'pngjs';
import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const { PNG } = pngjs;
const [svgDir, pngDir] = process.argv.slice(2);
mkdirSync(svgDir, { recursive: true });
mkdirSync(pngDir, { recursive: true });

const TOP = '#14B8A6';
const BOTTOM = '#0F766E';

// Tokmak geometrisi (yerel koordinat, pivot = baş merkezi). -40° döndürülür.
// Sınır kutusu (döndürülmüş): x [-300, 384], y [-216, 450] → merkez (42, 117), boyut 684 x 666
const BBOX = { cx: 42, cy: 117, w: 684, h: 666 };

function gavelShapes(fill) {
  return `
    <g transform="rotate(-40)">
      <rect x="-142" y="-80" width="284" height="160" rx="32" fill="${fill}"/>
      <rect x="-216" y="-106" width="64" height="212" rx="26" fill="${fill}"/>
      <rect x="152" y="-106" width="64" height="212" rx="26" fill="${fill}"/>
      <rect x="-40" y="94" width="80" height="460" rx="40" fill="${fill}"/>
    </g>
    <rect x="-250" y="262" width="204" height="80" rx="18" fill="${fill}"/>
    <rect x="-304" y="320" width="312" height="66" rx="22" fill="${fill}"/>`;
}

/** Tokmağı (cx, cy) merkezli, en büyük kenarı `size` olacak şekilde yerleştir */
function gavel({ cx, cy, size, fill = '#FFFFFF', shadow = false }) {
  const s = size / Math.max(BBOX.w, BBOX.h);
  const t = `translate(${cx} ${cy}) scale(${s.toFixed(4)}) translate(${-BBOX.cx} ${-BBOX.cy})`;
  const shadowLayer = shadow
    ? `<g transform="translate(0 ${(size * 0.018).toFixed(1)})" opacity="0.28" filter="url(#blur)"><g transform="${t}">${gavelShapes('#04312E')}</g></g>`
    : '';
  return `${shadowLayer}<g transform="${t}">${gavelShapes(fill)}</g>`;
}

function defs(size) {
  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${TOP}"/>
      <stop offset="1" stop-color="${BOTTOM}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.3" cy="0.18" r="0.75">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${(size * 0.012).toFixed(1)}"/></filter>
  </defs>`;
}

const svg = (size, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>\n`;

const files = {
  // iOS / genel uygulama simgesi: tam kare (köşeleri işletim sistemi yuvarlar), saydamlık yok
  icon: [
    1024,
    svg(1024, `${defs(1024)}<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#glow)"/>${gavel({ cx: 512, cy: 512, size: 600, shadow: true })}`),
  ],
  // Android uyarlanabilir simge: ön plan güvenli alan (ortadaki %66) içinde
  'android-icon-foreground': [1024, svg(1024, gavel({ cx: 512, cy: 512, size: 440 }))],
  'android-icon-background': [1024, svg(1024, `${defs(1024)}<rect width="1024" height="1024" fill="url(#bg)"/>`)],
  'android-icon-monochrome': [1024, svg(1024, gavel({ cx: 512, cy: 512, size: 440 }))],
  // Açılış ekranı: turkuaz zemin (app.json) üstünde beyaz tokmak
  'splash-icon': [512, svg(512, gavel({ cx: 256, cy: 256, size: 420 }))],
  // Web favicon: yuvarlatılmış kare (köşe = boyutun %28'i)
  favicon: [
    96,
    svg(96, `${defs(96)}<rect width="96" height="96" rx="${(96 * 0.28).toFixed(2)}" fill="url(#bg)"/>${gavel({ cx: 48, cy: 48, size: 62 })}`),
  ],
};

for (const [name, [size, source]] of Object.entries(files)) {
  writeFileSync(join(svgDir, `${name}.svg`), source);
  const img = new Resvg(source, { fitTo: { mode: 'width', value: size } }).render();
  // iOS uygulama simgesi alfa kanalı içermemeli: opak simgeleri RGB olarak yaz
  const opaque = name === 'icon' || name === 'android-icon-background';
  const png = opaque ? PNG.sync.write(Object.assign(new PNG({ width: img.width, height: img.height }), { data: Buffer.from(img.pixels) }), { colorType: 2 }) : img.asPng();
  writeFileSync(join(pngDir, `${name}.png`), png);
  console.log(name, size, png.length);
}
