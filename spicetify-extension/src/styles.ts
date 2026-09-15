export const PANEL_STYLES = `
:root {
  --baa-drawer-width: min(380px, calc(100vw - 32px));
}

.baa-drawer {
  position: fixed;
  z-index: 10000;
  top: 64px;
  right: 8px;
  bottom: 98px;
  width: var(--baa-drawer-width);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--spice-text, #fff);
  background: color-mix(in srgb, var(--spice-main, #121212) 96%, #000);
  border: 1px solid color-mix(in srgb, var(--spice-text, #fff) 12%, transparent);
  border-radius: 10px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, .55);
}

.baa-drawer-header {
  min-height: 52px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid color-mix(in srgb, var(--spice-text, #fff) 10%, transparent);
  font-size: 14px;
  font-weight: 700;
}

.baa-drawer-header button,
.baa-settings {
  border: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.baa-drawer-header button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 24px;
  line-height: 1;
}

.baa-drawer-header button:hover { background: rgba(255, 255, 255, .08); }
.baa-drawer-scroll { min-height: 0; overflow: auto; }

.baa-panel {
  --baa-ink: #f5f3ee;
  --baa-muted: #aaa6a0;
  --baa-line: rgba(255,255,255,.11);
  --baa-surface: rgba(255,255,255,.065);
  --baa-accent: #e47a5b;
  --baa-accent-bright: #f29879;
  color: var(--baa-ink);
  min-height: 100%;
  padding: 18px 16px 28px;
  font-family: var(--encore-body-font-stack, CircularSp, system-ui, sans-serif);
}
.baa-mode {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  margin-bottom: 18px;
  padding: 3px;
  border: 1px solid var(--baa-line);
  border-radius: 999px;
  background: rgba(255,255,255,.035);
}
.baa-mode button {
  border: 0;
  border-radius: 999px;
  padding: 7px 9px;
  color: var(--baa-muted);
  background: transparent;
  font-size: 11px;
  font-weight: 650;
  cursor: pointer;
}
.baa-mode button[aria-selected="true"] {
  color: #171717;
  background: var(--baa-accent);
}
.baa-song-album {
  margin: -7px 0 15px;
  color: var(--baa-muted);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.baa-panel * { box-sizing: border-box; }
.baa-kicker { color: var(--baa-muted); font-size: 10px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; }
.baa-title { margin: 4px 0 0; font: 600 23px/1.08 Iowan Old Style, Georgia, serif; letter-spacing: -.02em; }
.baa-subtitle { margin: 5px 0 0; color: var(--baa-muted); font-size: 12px; line-height: 1.35; }
.baa-cover { display: block; width: 100%; aspect-ratio: 1; margin: 16px 0; border-radius: 5px; object-fit: cover; box-shadow: 0 14px 36px rgba(0,0,0,.35); }
.baa-trackline { display: flex; align-items: baseline; gap: 8px; padding-bottom: 13px; border-bottom: 1px solid var(--baa-line); }
.baa-track-number { color: var(--baa-muted); font: 600 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
.baa-track-name { min-width: 0; overflow: hidden; font-size: 14px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.baa-score-row { display: grid; grid-template-columns: 1fr 88px; align-items: end; gap: 14px; margin: 20px 0 10px; }
.baa-score-label { align-self: center; color: var(--baa-muted); font-size: 11px; line-height: 1.4; text-transform: uppercase; letter-spacing: .1em; }
.baa-score { width: 100%; border: 0; border-bottom: 1px solid var(--baa-line); border-radius: 0; outline: 0; background: transparent; color: var(--baa-accent-bright); font: 750 50px/.9 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: -.08em; text-align: right; }
.baa-score:focus { border-color: var(--baa-accent); }
.baa-range { width: 100%; accent-color: var(--baa-accent); cursor: pointer; }
.baa-section { margin-top: 20px; }
.baa-section-label { display: block; margin-bottom: 8px; color: var(--baa-muted); font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.baa-replay { display: grid; grid-template-columns: repeat(4, 1fr); overflow: hidden; border: 1px solid var(--baa-line); border-radius: 8px; }
.baa-replay button { min-width: 0; border: 0; border-right: 1px solid var(--baa-line); padding: 8px 2px; background: transparent; color: var(--baa-muted); font: inherit; font-size: 10px; cursor: pointer; }
.baa-replay button:last-child { border-right: 0; }
.baa-replay button[data-active="true"] { background: var(--baa-accent); color: #1b100d; font-weight: 750; }
.baa-notes, .baa-config-input { width: 100%; border: 1px solid var(--baa-line); border-radius: 8px; outline: none; background: var(--baa-surface); color: var(--baa-ink); font: inherit; font-size: 12px; }
.baa-notes { min-height: 72px; padding: 10px; resize: vertical; }
.baa-config-input { margin-top: 5px; padding: 9px 10px; }
.baa-notes:focus, .baa-config-input:focus { border-color: var(--baa-accent); }
.baa-actions { display: flex; align-items: center; gap: 8px; margin-top: 16px; }
.baa-button { border: 0; border-radius: 999px; padding: 9px 14px; background: var(--baa-accent); color: #1b100d; font: inherit; font-size: 12px; font-weight: 750; cursor: pointer; }
.baa-button:hover { background: var(--baa-accent-bright); }
.baa-button:disabled { cursor: wait; opacity: .55; }
.baa-button-secondary { background: var(--baa-surface); color: var(--baa-ink); }
.baa-button-secondary:hover { background: rgba(255,255,255,.12); }
.baa-status { margin-left: auto; color: var(--baa-muted); font-size: 10px; }
.baa-overall { display: flex; justify-content: space-between; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--baa-line); color: var(--baa-muted); font-size: 11px; }
.baa-overall strong { color: var(--baa-ink); font: 700 14px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
.baa-empty { display: grid; min-height: 340px; place-content: center; text-align: center; }
.baa-empty-mark { margin: 0 auto 14px; color: var(--baa-accent); font: 700 48px/1 Iowan Old Style, Georgia, serif; }
.baa-empty p { max-width: 240px; margin: 7px auto 0; color: var(--baa-muted); font-size: 12px; line-height: 1.5; }
.baa-error { margin-top: 12px; border-left: 2px solid var(--baa-accent); padding-left: 10px; color: #f0b3a0; font-size: 11px; line-height: 1.45; }
.baa-link { color: var(--baa-muted); font-size: 11px; text-decoration: none; }
.baa-link:hover { color: var(--baa-ink); text-decoration: underline; }
.baa-settings { margin-left: auto; border: 0; padding: 2px; background: transparent; color: var(--baa-muted); cursor: pointer; }
@media (prefers-reduced-motion: no-preference) {
  .baa-score, .baa-button, .baa-replay button { transition: border-color .15s, background-color .15s, color .15s; }
}
`;
