"use strict";
(() => {
  // spicetify-extension/src/api.ts
  var ArchiveApiError = class extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  };
  async function archiveRequest(config, path, init = {}) {
    const response = await fetch(`${config.siteUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        ...init.headers
      }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ArchiveApiError(body.error ?? "Album Archive did not respond.", response.status);
    }
    return body;
  }
  function getCurrent(config, spotifyAlbumId, spotifyTrackId) {
    const params = new URLSearchParams({ spotifyAlbumId, spotifyTrackId });
    return archiveRequest(config, `/api/extension/current?${params}`);
  }
  function importAlbum(config, spotifyAlbumId) {
    return archiveRequest(config, "/api/extension/import", {
      method: "POST",
      body: JSON.stringify({ spotifyAlbumId })
    });
  }
  function saveRating(config, input) {
    return archiveRequest(config, "/api/extension/rating", {
      method: "PUT",
      body: JSON.stringify(input)
    });
  }
  function getSongRating(config, spotifyTrackId) {
    const params = new URLSearchParams({ spotifyTrackId });
    return archiveRequest(config, `/api/extension/song-rating?${params}`);
  }
  function saveSongRating(config, input) {
    return archiveRequest(config, "/api/extension/song-rating", {
      method: "PUT",
      body: JSON.stringify(input)
    });
  }

  // spicetify-extension/src/player.ts
  function spotifyId(uri, kind) {
    if (typeof uri !== "string") return null;
    const match = uri.match(new RegExp(`^spotify:${kind}:([A-Za-z0-9]{22})$`));
    return match?.[1] ?? null;
  }
  function readPlayingTrack() {
    const item = Spicetify.Player.data?.item;
    if (!item || item.type !== "track" || item.metadata?.is_local === "true") return null;
    const spotifyTrackId = spotifyId(item.uri, "track");
    const spotifyAlbumId = spotifyId(item.metadata?.album_uri, "album");
    if (!spotifyTrackId || !spotifyAlbumId) return null;
    return {
      spotifyTrackId,
      spotifyAlbumId,
      trackName: item.name ?? item.metadata?.title ?? "Current track",
      albumName: item.album?.name ?? item.metadata?.album_title ?? "",
      artistName: item.artists?.map((artist) => artist.name).filter(Boolean).join(", ") ?? item.metadata?.artist_name ?? "",
      imageUrl: item.images?.[0]?.url ?? item.metadata?.image_xlarge_url ?? item.metadata?.image_large_url ?? null
    };
  }

  // spicetify-extension/src/storage.ts
  var STORAGE_KEY = "album-archive:connection";
  var DEFAULT_SITE_URL = "https://bazcario-album-archive.vercel.app";
  function loadConfig() {
    const raw = Spicetify.LocalStorage.get(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.siteUrl || !parsed.token) return null;
      return parsed;
    } catch {
      return null;
    }
  }
  function saveConfig(config) {
    Spicetify.LocalStorage.set(STORAGE_KEY, JSON.stringify(config));
  }
  function clearConfig() {
    Spicetify.LocalStorage.set(STORAGE_KEY, "");
  }

  // spicetify-extension/src/styles.ts
  var PANEL_STYLES = `
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

  // spicetify-extension/src/app.tsx
  var React;
  var REPLAY_VALUES = ["Low", "Medium", "High", "Very High"];
  var REPLAY_LABELS = {
    Low: "Low",
    Medium: "Med",
    High: "High",
    "Very High": "V.High"
  };
  function friendlyError(error) {
    if (error instanceof ArchiveApiError) return error.message;
    if (error instanceof TypeError) return "Could not reach Album Archive. Check the site URL and your connection.";
    return "Album Archive could not complete that request.";
  }
  function ConnectionForm({ onConnect }) {
    const [siteUrl, setSiteUrl] = React.useState(DEFAULT_SITE_URL);
    const [token, setToken] = React.useState("");
    const [error, setError] = React.useState(null);
    function submit(event) {
      event.preventDefault();
      try {
        const normalizedUrl = new URL(siteUrl.trim());
        const local = normalizedUrl.hostname === "127.0.0.1" || normalizedUrl.hostname === "localhost";
        if (normalizedUrl.protocol !== "https:" && !(local && normalizedUrl.protocol === "http:")) {
          throw new Error("invalid URL");
        }
        if (!token.trim().startsWith("baa_ext_")) throw new Error("invalid token");
        onConnect({ siteUrl: normalizedUrl.origin, token: token.trim() });
      } catch {
        setError("Enter the Album Archive URL and a connection token from your profile.");
      }
    }
    return /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-panel" }, /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-empty" }, /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-empty-mark" }, "A"), /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-kicker" }, "One-time setup"), /* @__PURE__ */ Spicetify.React.createElement("h2", { className: "baa-title" }, "Connect your archive"), /* @__PURE__ */ Spicetify.React.createElement("p", null, "Create a Spotify extension token from your Album Archive profile, then paste it here.")), /* @__PURE__ */ Spicetify.React.createElement("form", { onSubmit: submit }, /* @__PURE__ */ Spicetify.React.createElement("label", { className: "baa-section-label" }, "Album Archive URL", /* @__PURE__ */ Spicetify.React.createElement(
      "input",
      {
        className: "baa-config-input",
        value: siteUrl,
        onChange: (event) => setSiteUrl(event.target.value),
        inputMode: "url"
      }
    )), /* @__PURE__ */ Spicetify.React.createElement("label", { className: "baa-section-label baa-section" }, "Connection token", /* @__PURE__ */ Spicetify.React.createElement(
      "input",
      {
        className: "baa-config-input",
        type: "password",
        value: token,
        onChange: (event) => setToken(event.target.value),
        placeholder: "baa_ext_\u2026",
        autoComplete: "off"
      }
    )), error && /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-error" }, error), /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-actions" }, /* @__PURE__ */ Spicetify.React.createElement("button", { className: "baa-button", type: "submit" }, "Connect"), /* @__PURE__ */ Spicetify.React.createElement("a", { className: "baa-link", href: `${siteUrl.replace(/\/$/, "")}/profile`, target: "_blank", rel: "noreferrer" }, "Open profile"))));
  }
  function EmptyState({ title, body }) {
    return /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-panel" }, /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-empty" }, /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-empty-mark" }, "\u266A"), /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-kicker" }, "Album Archive"), /* @__PURE__ */ Spicetify.React.createElement("h2", { className: "baa-title" }, title), /* @__PURE__ */ Spicetify.React.createElement("p", null, body)));
  }
  function ModeSwitch({
    mode,
    onChange
  }) {
    return /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-mode", role: "tablist", "aria-label": "Rating type" }, /* @__PURE__ */ Spicetify.React.createElement("button", { type: "button", role: "tab", "aria-selected": mode === "song", onClick: () => onChange("song") }, "Song"), /* @__PURE__ */ Spicetify.React.createElement("button", { type: "button", role: "tab", "aria-selected": mode === "album", onClick: () => onChange("album") }, "Album track"));
  }
  function RatingPanel({
    data,
    playing,
    config,
    onSaved,
    onDisconnect,
    mode,
    onModeChange
  }) {
    const [rating, setRating] = React.useState(data.track.rating == null ? "" : String(data.track.rating));
    const [replay, setReplay] = React.useState(data.track.replayValue);
    const [notes, setNotes] = React.useState(data.track.notes ?? "");
    const [saveState, setSaveState] = React.useState("idle");
    const [error, setError] = React.useState(null);
    async function persist(overrides) {
      const ratingValue = overrides.rating ?? rating;
      const parsedRating = ratingValue === "" ? null : Number(ratingValue);
      if (parsedRating != null && (!Number.isFinite(parsedRating) || parsedRating < 0 || parsedRating > 10)) {
        setError("Use a score from 0 to 10.");
        return;
      }
      setSaveState("saving");
      setError(null);
      try {
        const next = await saveRating(config, {
          spotifyTrackId: playing.spotifyTrackId,
          rating: parsedRating,
          replayValue: overrides.replay === void 0 ? replay : overrides.replay,
          notes: overrides.notes === void 0 ? notes || null : overrides.notes || null
        });
        onSaved(next);
        setSaveState("saved");
        window.setTimeout(() => setSaveState("idle"), 1300);
      } catch (caught) {
        setSaveState("idle");
        setError(friendlyError(caught));
      }
    }
    function chooseReplay(value) {
      const next = replay === value ? null : value;
      setReplay(next);
      void persist({ replay: next });
    }
    const score = rating === "" ? 0 : Math.max(0, Math.min(10, Number(rating) || 0));
    return /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-panel" }, /* @__PURE__ */ Spicetify.React.createElement(ModeSwitch, { mode, onChange: onModeChange }), /* @__PURE__ */ Spicetify.React.createElement("div", { style: { display: "flex", alignItems: "start", gap: "8px" } }, /* @__PURE__ */ Spicetify.React.createElement("div", { style: { minWidth: 0, flex: 1 } }, /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-kicker" }, "Now rating"), /* @__PURE__ */ Spicetify.React.createElement("h2", { className: "baa-title" }, data.album.title), /* @__PURE__ */ Spicetify.React.createElement("p", { className: "baa-subtitle" }, data.album.artist)), /* @__PURE__ */ Spicetify.React.createElement("button", { className: "baa-settings", type: "button", onClick: onDisconnect, title: "Connection settings", "aria-label": "Connection settings" }, "\u2022\u2022\u2022")), playing.imageUrl && /* @__PURE__ */ Spicetify.React.createElement("img", { className: "baa-cover", src: playing.imageUrl, alt: "" }), /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-trackline" }, /* @__PURE__ */ Spicetify.React.createElement("span", { className: "baa-track-number" }, String(data.track.order).padStart(2, "0")), /* @__PURE__ */ Spicetify.React.createElement("span", { className: "baa-track-name", title: data.track.name }, data.track.name)), /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-score-row" }, /* @__PURE__ */ Spicetify.React.createElement("label", { className: "baa-score-label", htmlFor: "baa-score" }, "Your score", /* @__PURE__ */ Spicetify.React.createElement("br", null), "out of ten"), /* @__PURE__ */ Spicetify.React.createElement(
      "input",
      {
        id: "baa-score",
        className: "baa-score",
        type: "number",
        min: "0",
        max: "10",
        step: "0.01",
        value: rating,
        placeholder: "\u2014",
        onChange: (event) => setRating(event.target.value),
        onBlur: () => void persist({}),
        onKeyDown: (event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }
      }
    )), /* @__PURE__ */ Spicetify.React.createElement(
      "input",
      {
        className: "baa-range",
        type: "range",
        min: "0",
        max: "10",
        step: "0.1",
        value: score,
        "aria-label": `Rating for ${data.track.name}`,
        onChange: (event) => setRating(event.target.value),
        onPointerUp: (event) => void persist({ rating: event.currentTarget.value }),
        onKeyUp: (event) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            void persist({ rating: event.currentTarget.value });
          }
        }
      }
    ), /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-section" }, /* @__PURE__ */ Spicetify.React.createElement("span", { className: "baa-section-label" }, "Would replay?"), /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-replay" }, REPLAY_VALUES.map((value) => /* @__PURE__ */ Spicetify.React.createElement("button", { key: value, type: "button", "data-active": replay === value, onClick: () => chooseReplay(value) }, REPLAY_LABELS[value])))), /* @__PURE__ */ Spicetify.React.createElement("label", { className: "baa-section baa-section-label" }, "Listening note", /* @__PURE__ */ Spicetify.React.createElement(
      "textarea",
      {
        className: "baa-notes",
        value: notes,
        maxLength: 1e3,
        placeholder: "What stands out?",
        onChange: (event) => setNotes(event.target.value),
        onBlur: () => void persist({})
      }
    )), error && /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-error" }, error), /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-overall" }, /* @__PURE__ */ Spicetify.React.createElement("span", null, "Album average"), /* @__PURE__ */ Spicetify.React.createElement("strong", null, data.album.overallRating == null ? "\u2014" : data.album.overallRating.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""))), /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-actions" }, /* @__PURE__ */ Spicetify.React.createElement("a", { className: "baa-link", href: data.album.archiveUrl, target: "_blank", rel: "noreferrer" }, "Open full album"), /* @__PURE__ */ Spicetify.React.createElement("span", { className: "baa-status" }, saveState === "saving" ? "Saving\u2026" : saveState === "saved" ? "\u2713 Saved" : "")));
  }
  function SingleSongPanel({
    data,
    playing,
    config,
    onSaved,
    onDisconnect,
    mode,
    onModeChange
  }) {
    const saved = data.status === "ready" ? data.song : null;
    const [rating, setRating] = React.useState(saved?.rating == null ? "" : String(saved.rating));
    const [replay, setReplay] = React.useState(saved?.replayValue ?? null);
    const [notes, setNotes] = React.useState(saved?.notes ?? "");
    const [saveState, setSaveState] = React.useState("idle");
    const [error, setError] = React.useState(null);
    async function persist(overrides) {
      const ratingValue = overrides.rating ?? rating;
      const parsedRating = ratingValue === "" ? null : Number(ratingValue);
      if (parsedRating == null && !saved) {
        setError("Choose a score before saving this song.");
        return;
      }
      if (parsedRating != null && (!Number.isFinite(parsedRating) || parsedRating < 0 || parsedRating > 10)) {
        setError("Use a score from 0 to 10.");
        return;
      }
      setSaveState("saving");
      setError(null);
      try {
        const next = await saveSongRating(config, {
          spotifyTrackId: playing.spotifyTrackId,
          rating: parsedRating,
          replayValue: overrides.replay === void 0 ? replay : overrides.replay,
          notes: overrides.notes === void 0 ? notes || null : overrides.notes || null
        });
        onSaved(next);
        setSaveState("saved");
        window.setTimeout(() => setSaveState("idle"), 1300);
      } catch (caught) {
        setSaveState("idle");
        setError(friendlyError(caught));
      }
    }
    function chooseReplay(value) {
      const next = replay === value ? null : value;
      setReplay(next);
      void persist({ replay: next });
    }
    const score = rating === "" ? 0 : Math.max(0, Math.min(10, Number(rating) || 0));
    return /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-panel" }, /* @__PURE__ */ Spicetify.React.createElement(ModeSwitch, { mode, onChange: onModeChange }), /* @__PURE__ */ Spicetify.React.createElement("div", { style: { display: "flex", alignItems: "start", gap: "8px" } }, /* @__PURE__ */ Spicetify.React.createElement("div", { style: { minWidth: 0, flex: 1 } }, /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-kicker" }, "Standalone song"), /* @__PURE__ */ Spicetify.React.createElement("h2", { className: "baa-title" }, saved?.title ?? playing.trackName), /* @__PURE__ */ Spicetify.React.createElement("p", { className: "baa-subtitle" }, saved?.artist ?? playing.artistName)), /* @__PURE__ */ Spicetify.React.createElement("button", { className: "baa-settings", type: "button", onClick: onDisconnect, title: "Connection settings", "aria-label": "Connection settings" }, "\u2022\u2022\u2022")), playing.imageUrl && /* @__PURE__ */ Spicetify.React.createElement("img", { className: "baa-cover", src: playing.imageUrl, alt: "" }), /* @__PURE__ */ Spicetify.React.createElement("p", { className: "baa-song-album" }, saved?.albumTitle ?? playing.albumName), /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-score-row" }, /* @__PURE__ */ Spicetify.React.createElement("label", { className: "baa-score-label", htmlFor: "baa-song-score" }, "Your score", /* @__PURE__ */ Spicetify.React.createElement("br", null), "out of ten"), /* @__PURE__ */ Spicetify.React.createElement(
      "input",
      {
        id: "baa-song-score",
        className: "baa-score",
        type: "number",
        min: "0",
        max: "10",
        step: "0.01",
        value: rating,
        placeholder: "\u2014",
        onChange: (event) => setRating(event.target.value),
        onBlur: () => void persist({}),
        onKeyDown: (event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }
      }
    )), /* @__PURE__ */ Spicetify.React.createElement(
      "input",
      {
        className: "baa-range",
        type: "range",
        min: "0",
        max: "10",
        step: "0.1",
        value: score,
        "aria-label": `Standalone rating for ${playing.trackName}`,
        onChange: (event) => setRating(event.target.value),
        onPointerUp: (event) => void persist({ rating: event.currentTarget.value }),
        onKeyUp: (event) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            void persist({ rating: event.currentTarget.value });
          }
        }
      }
    ), /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-section" }, /* @__PURE__ */ Spicetify.React.createElement("span", { className: "baa-section-label" }, "Would replay?"), /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-replay" }, REPLAY_VALUES.map((value) => /* @__PURE__ */ Spicetify.React.createElement("button", { key: value, type: "button", "data-active": replay === value, onClick: () => chooseReplay(value) }, REPLAY_LABELS[value])))), /* @__PURE__ */ Spicetify.React.createElement("label", { className: "baa-section baa-section-label" }, "Listening note", /* @__PURE__ */ Spicetify.React.createElement(
      "textarea",
      {
        className: "baa-notes",
        value: notes,
        maxLength: 1e3,
        placeholder: "What makes this song stick?",
        onChange: (event) => setNotes(event.target.value),
        onBlur: () => void persist({})
      }
    )), error && /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-error" }, error), /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-actions" }, /* @__PURE__ */ Spicetify.React.createElement("a", { className: "baa-link", href: `${config.siteUrl}/songs`, target: "_blank", rel: "noreferrer" }, "Open song library"), /* @__PURE__ */ Spicetify.React.createElement("span", { className: "baa-status" }, saveState === "saving" ? "Saving\u2026" : saveState === "saved" ? "\u2713 Saved" : "")));
  }
  function ArchivePanel() {
    const [config, setConfig] = React.useState(() => loadConfig());
    const [showSettings, setShowSettings] = React.useState(false);
    const [playing, setPlaying] = React.useState(() => readPlayingTrack());
    const [current, setCurrent] = React.useState(null);
    const [songCurrent, setSongCurrent] = React.useState(null);
    const [mode, setMode] = React.useState("album");
    const [loading, setLoading] = React.useState(false);
    const [importing, setImporting] = React.useState(false);
    const [error, setError] = React.useState(null);
    const requestVersionRef = React.useRef(0);
    async function load(track, activeConfig) {
      requestVersionRef.current += 1;
      const version = requestVersionRef.current;
      setLoading(true);
      setError(null);
      try {
        const [albumResult, songResult] = await Promise.all([
          getCurrent(activeConfig, track.spotifyAlbumId, track.spotifyTrackId),
          getSongRating(activeConfig, track.spotifyTrackId)
        ]);
        if (version === requestVersionRef.current) {
          setCurrent(albumResult);
          setSongCurrent(songResult);
        }
      } catch (caught) {
        if (version === requestVersionRef.current) setError(friendlyError(caught));
      } finally {
        if (version === requestVersionRef.current) setLoading(false);
      }
    }
    React.useEffect(() => {
      const listener = () => setPlaying(readPlayingTrack());
      Spicetify.Player.addEventListener("songchange", listener);
      listener();
      return () => Spicetify.Player.removeEventListener("songchange", listener);
    }, []);
    React.useEffect(() => {
      setCurrent(null);
      setSongCurrent(null);
      if (playing && config) void load(playing, config);
    }, [playing, config]);
    function connect(next) {
      saveConfig(next);
      setConfig(next);
      setShowSettings(false);
    }
    function disconnect() {
      clearConfig();
      setConfig(null);
      setCurrent(null);
      setSongCurrent(null);
      setShowSettings(true);
    }
    async function addAlbum() {
      if (!playing || !config) return;
      setImporting(true);
      setError(null);
      try {
        await importAlbum(config, playing.spotifyAlbumId);
        await load(playing, config);
        Spicetify.showNotification("Added to Album Archive");
      } catch (caught) {
        setError(friendlyError(caught));
      } finally {
        setImporting(false);
      }
    }
    if (!config || showSettings) return /* @__PURE__ */ Spicetify.React.createElement(ConnectionForm, { onConnect: connect });
    if (!playing) return /* @__PURE__ */ Spicetify.React.createElement(EmptyState, { title: "Play an album", body: "The current track will appear here when Spotify starts playing an album." });
    if (loading && !current) return /* @__PURE__ */ Spicetify.React.createElement(EmptyState, { title: "Finding this track", body: `${playing.trackName} \xB7 ${playing.artistName}` });
    if (error && !current) {
      return /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-panel" }, /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-empty" }, /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-empty-mark" }, "!"), /* @__PURE__ */ Spicetify.React.createElement("h2", { className: "baa-title" }, "Connection interrupted"), /* @__PURE__ */ Spicetify.React.createElement("p", null, error), /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-actions", style: { justifyContent: "center" } }, /* @__PURE__ */ Spicetify.React.createElement("button", { className: "baa-button", type: "button", onClick: () => void load(playing, config) }, "Try again"), /* @__PURE__ */ Spicetify.React.createElement("button", { className: "baa-button baa-button-secondary", type: "button", onClick: disconnect }, "Reconnect"))));
    }
    if (mode === "song" && songCurrent) {
      return /* @__PURE__ */ Spicetify.React.createElement(
        SingleSongPanel,
        {
          key: playing.spotifyTrackId,
          data: songCurrent,
          playing,
          config,
          onSaved: setSongCurrent,
          onDisconnect: () => setShowSettings(true),
          mode,
          onModeChange: setMode
        }
      );
    }
    if (current?.status === "album_missing" || current?.status === "track_missing") {
      return /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-panel" }, /* @__PURE__ */ Spicetify.React.createElement(ModeSwitch, { mode, onChange: setMode }), playing.imageUrl && /* @__PURE__ */ Spicetify.React.createElement("img", { className: "baa-cover", src: playing.imageUrl, alt: "" }), /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-kicker" }, "Not linked yet"), /* @__PURE__ */ Spicetify.React.createElement("h2", { className: "baa-title" }, playing.albumName), /* @__PURE__ */ Spicetify.React.createElement("p", { className: "baa-subtitle" }, playing.artistName), /* @__PURE__ */ Spicetify.React.createElement("p", { style: { marginTop: "16px", color: "var(--baa-muted)", fontSize: "12px", lineHeight: 1.5 } }, "Add this Spotify edition to rate its tracks in Album Archive. An exact existing album will be linked automatically."), error && /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-error" }, error), /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-actions" }, /* @__PURE__ */ Spicetify.React.createElement("button", { className: "baa-button", type: "button", disabled: importing, onClick: () => void addAlbum() }, importing ? "Adding\u2026" : "Add to Archive"), /* @__PURE__ */ Spicetify.React.createElement("button", { className: "baa-settings", type: "button", onClick: disconnect }, "Connection")));
    }
    if (current?.status === "ready") {
      return /* @__PURE__ */ Spicetify.React.createElement(
        RatingPanel,
        {
          key: current.track.id,
          data: current,
          playing,
          config,
          onSaved: setCurrent,
          onDisconnect: () => setShowSettings(true),
          mode,
          onModeChange: setMode
        }
      );
    }
    return /* @__PURE__ */ Spicetify.React.createElement(EmptyState, { title: "Opening your archive", body: "Loading the current track\u2026" });
  }
  function addStyles() {
    if (document.getElementById("album-archive-extension-styles")) return;
    const style = document.createElement("style");
    style.id = "album-archive-extension-styles";
    style.textContent = PANEL_STYLES;
    document.head.appendChild(style);
  }
  function Drawer({ onClose }) {
    return /* @__PURE__ */ Spicetify.React.createElement("aside", { className: "baa-drawer", "aria-label": "Album Archive" }, /* @__PURE__ */ Spicetify.React.createElement("header", { className: "baa-drawer-header" }, /* @__PURE__ */ Spicetify.React.createElement("span", null, "Album Archive"), /* @__PURE__ */ Spicetify.React.createElement("button", { type: "button", onClick: onClose, "aria-label": "Close Album Archive" }, "\xD7")), /* @__PURE__ */ Spicetify.React.createElement("div", { className: "baa-drawer-scroll" }, /* @__PURE__ */ Spicetify.React.createElement(ArchivePanel, null)));
  }
  (async function initializeAlbumArchive() {
    while (!Spicetify?.Player || !Spicetify?.React || !Spicetify?.ReactDOM || !Spicetify?.Topbar?.Button) {
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
    React = Spicetify.React;
    addStyles();
    const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.2"/><path d="M12 4v3M20 12h-3"/></svg>';
    if (Spicetify.Panel?.registerPanel) {
      const panel = Spicetify.Panel.registerPanel({
        label: "Album Archive",
        children: /* @__PURE__ */ Spicetify.React.createElement(ArchivePanel, null)
      });
      new Spicetify.Topbar.Button("Album Archive", icon, () => panel.toggle(), false, true);
      return;
    }
    const host = document.createElement("div");
    host.id = "album-archive-drawer-root";
    document.body.appendChild(host);
    const root = Spicetify.ReactDOM.createRoot(host);
    let open = false;
    const render = () => root.render(open ? /* @__PURE__ */ Spicetify.React.createElement(Drawer, { onClose: () => {
      open = false;
      render();
    } }) : null);
    new Spicetify.Topbar.Button("Album Archive", icon, () => {
      open = !open;
      render();
    }, false, true);
  })();
})();
