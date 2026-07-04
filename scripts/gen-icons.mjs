// One-off: generate PWA icons from an inline SVG (vinyl disc on violet).
//   node scripts/gen-icons.mjs
import sharp from "sharp";

const svg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="#7c3aed"/>
    <circle cx="256" cy="256" r="150" fill="none" stroke="#ffffff" stroke-width="24"/>
    <circle cx="256" cy="256" r="46" fill="#ffffff"/>
    <circle cx="256" cy="256" r="13" fill="#7c3aed"/>
  </svg>`,
);

const targets = [
  { size: 512, file: "public/icon-512.png" },
  { size: 192, file: "public/icon-192.png" },
  { size: 180, file: "public/apple-touch-icon.png" },
];

for (const t of targets) {
  await sharp(svg).resize(t.size, t.size).png().toFile(t.file);
  console.log("wrote", t.file);
}
