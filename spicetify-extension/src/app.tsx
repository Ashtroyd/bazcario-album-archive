import {
  ArchiveApiError,
  getAccount,
  getCurrent,
  getSongRating,
  importAlbum,
  saveRating,
  saveSongRating,
  type CurrentResponse,
  type ExtensionAccount,
  type ReadyTrack,
  type ReplayValue,
  type SongRatingResponse,
} from "./api";
import { readPlayingTrack, type PlayingTrack } from "./player";
import {
  clearConfig,
  DEFAULT_SITE_URL,
  loadConfig,
  saveConfig,
  type ExtensionConfig,
} from "./storage";
import { PANEL_STYLES } from "./styles";
import type { ChangeEvent, FormEvent, KeyboardEvent, PointerEvent } from "react";

let React: typeof import("react");
const REPLAY_VALUES: ReplayValue[] = ["Low", "Medium", "High", "Very High"];
const REPLAY_LABELS: Record<ReplayValue, string> = {
  Low: "Low",
  Medium: "Med",
  High: "High",
  "Very High": "V.High",
};

function friendlyError(error: unknown): string {
  if (error instanceof ArchiveApiError) return error.message;
  if (error instanceof TypeError) return "Could not reach Album Archive. Check the site URL and your connection.";
  return "Album Archive could not complete that request.";
}

function ConnectionForm({ onConnect }: { onConnect: (config: ExtensionConfig) => Promise<void> }) {
  const [siteUrl, setSiteUrl] = React.useState(DEFAULT_SITE_URL);
  const [token, setToken] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [connecting, setConnecting] = React.useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const normalizedUrl = new URL(siteUrl.trim());
      const local = normalizedUrl.hostname === "127.0.0.1" || normalizedUrl.hostname === "localhost";
      if (normalizedUrl.protocol !== "https:" && !(local && normalizedUrl.protocol === "http:")) {
        throw new Error("invalid URL");
      }
      if (!token.trim().startsWith("baa_ext_")) throw new Error("invalid token");
      setConnecting(true);
      setError(null);
      await onConnect({ siteUrl: normalizedUrl.origin, token: token.trim() });
    } catch (caught) {
      if (caught instanceof ArchiveApiError || caught instanceof TypeError) {
        setError(friendlyError(caught));
      } else {
        setError("Enter the Album Archive URL and a connection token from your profile.");
      }
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="baa-panel">
      <div className="baa-empty">
        <div className="baa-empty-mark">A</div>
        <div className="baa-kicker">One-time setup</div>
        <h2 className="baa-title">Connect your archive</h2>
        <p>Create a Spotify extension token from your Album Archive profile, then paste it here.</p>
      </div>
      <form onSubmit={submit}>
        <label className="baa-section-label">
          Album Archive URL
          <input
            className="baa-config-input"
            value={siteUrl}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setSiteUrl(event.target.value)}
            inputMode="url"
          />
        </label>
        <label className="baa-section-label baa-section">
          Connection token
          <input
            className="baa-config-input"
            type="password"
            value={token}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setToken(event.target.value)}
            placeholder="baa_ext_…"
            autoComplete="off"
          />
        </label>
        {error && <div className="baa-error">{error}</div>}
        <div className="baa-actions">
          <button className="baa-button" type="submit" disabled={connecting}>
            {connecting ? "Checking…" : "Connect"}
          </button>
          <a className="baa-link" href={`${siteUrl.replace(/\/$/, "")}/profile`} target="_blank" rel="noreferrer">
            Open profile
          </a>
        </div>
      </form>
    </div>
  );
}

function accountInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "A";
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function AccountCue({
  account,
  onChange,
}: {
  account: ExtensionAccount;
  onChange: () => void;
}) {
  return (
    <div className="baa-account" aria-label={`Ratings save to ${account.displayName}`}>
      <div className="baa-account-avatar" aria-hidden="true">
        <span>{accountInitials(account.displayName)}</span>
        {account.avatarUrl && <img src={account.avatarUrl} alt="" />}
      </div>
      <div className="baa-account-copy">
        <span>Saving to</span>
        <strong title={account.displayName}>{account.displayName}</strong>
      </div>
      <button type="button" onClick={onChange} aria-label={`Change from ${account.displayName}`}>
        Change
      </button>
    </div>
  );
}

function EmptyState({
  title,
  body,
  account,
  onChangeAccount,
}: {
  title: string;
  body: string;
  account?: ExtensionAccount | null;
  onChangeAccount?: () => void;
}) {
  return (
    <div className="baa-panel">
      {account && onChangeAccount && <AccountCue account={account} onChange={onChangeAccount} />}
      <div className="baa-empty">
        <div className="baa-empty-mark">♪</div>
        <div className="baa-kicker">Album Archive</div>
        <h2 className="baa-title">{title}</h2>
        <p>{body}</p>
      </div>
    </div>
  );
}

function ModeSwitch({
  mode,
  onChange,
}: {
  mode: "song" | "album";
  onChange: (mode: "song" | "album") => void;
}) {
  return (
    <div className="baa-mode" role="tablist" aria-label="Rating type">
      <button type="button" role="tab" aria-selected={mode === "song"} onClick={() => onChange("song")}>
        Song
      </button>
      <button type="button" role="tab" aria-selected={mode === "album"} onClick={() => onChange("album")}>
        Album track
      </button>
    </div>
  );
}

function RatingPanel({
  data,
  playing,
  config,
  onSaved,
  onDisconnect,
  account,
  mode,
  onModeChange,
}: {
  data: ReadyTrack;
  playing: PlayingTrack;
  config: ExtensionConfig;
  onSaved: (next: ReadyTrack) => void;
  onDisconnect: () => void;
  account: ExtensionAccount;
  mode: "song" | "album";
  onModeChange: (mode: "song" | "album") => void;
}) {
  const [rating, setRating] = React.useState(data.track.rating == null ? "" : String(data.track.rating));
  const [replay, setReplay] = React.useState<ReplayValue | null>(data.track.replayValue);
  const [notes, setNotes] = React.useState(data.track.notes ?? "");
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = React.useState<string | null>(null);

  async function persist(overrides: Partial<{ rating: string; replay: ReplayValue | null; notes: string }>) {
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
        replayValue: overrides.replay === undefined ? replay : overrides.replay,
        notes: overrides.notes === undefined ? notes || null : overrides.notes || null,
      });
      onSaved(next);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1300);
    } catch (caught) {
      setSaveState("idle");
      setError(friendlyError(caught));
    }
  }

  function chooseReplay(value: ReplayValue) {
    const next = replay === value ? null : value;
    setReplay(next);
    void persist({ replay: next });
  }

  const score = rating === "" ? 0 : Math.max(0, Math.min(10, Number(rating) || 0));
  return (
    <div className="baa-panel">
      <AccountCue account={account} onChange={onDisconnect} />
      <ModeSwitch mode={mode} onChange={onModeChange} />
      <div style={{ display: "flex", alignItems: "start", gap: "8px" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="baa-kicker">Now rating</div>
          <h2 className="baa-title">{data.album.title}</h2>
          <p className="baa-subtitle">{data.album.artist}</p>
        </div>
      </div>

      {playing.imageUrl && <img className="baa-cover" src={playing.imageUrl} alt="" />}

      <div className="baa-trackline">
        <span className="baa-track-number">{String(data.track.order).padStart(2, "0")}</span>
        <span className="baa-track-name" title={data.track.name}>{data.track.name}</span>
      </div>

      <div className="baa-score-row">
        <label className="baa-score-label" htmlFor="baa-score">Your score<br />out of ten</label>
        <input
          id="baa-score"
          className="baa-score"
          type="number"
          min="0"
          max="10"
          step="0.01"
          value={rating}
          placeholder="—"
          onChange={(event: ChangeEvent<HTMLInputElement>) => setRating(event.target.value)}
          onBlur={() => void persist({})}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
        />
      </div>
      <input
        className="baa-range"
        type="range"
        min="0"
        max="10"
        step="0.1"
        value={score}
        aria-label={`Rating for ${data.track.name}`}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setRating(event.target.value)}
        onPointerUp={(event: PointerEvent<HTMLInputElement>) => void persist({ rating: event.currentTarget.value })}
        onKeyUp={(event: KeyboardEvent<HTMLInputElement>) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            void persist({ rating: event.currentTarget.value });
          }
        }}
      />

      <div className="baa-section">
        <span className="baa-section-label">Would replay?</span>
        <div className="baa-replay">
          {REPLAY_VALUES.map((value) => (
            <button key={value} type="button" data-active={replay === value} onClick={() => chooseReplay(value)}>
              {REPLAY_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <label className="baa-section baa-section-label">
        Listening note
        <textarea
          className="baa-notes"
          value={notes}
          maxLength={1000}
          placeholder="What stands out?"
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNotes(event.target.value)}
          onBlur={() => void persist({})}
        />
      </label>

      {error && <div className="baa-error">{error}</div>}
      <div className="baa-overall">
        <span>Album average</span>
        <strong>{data.album.overallRating == null ? "—" : data.album.overallRating.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}</strong>
      </div>
      <div className="baa-actions">
        <a className="baa-link" href={data.album.archiveUrl} target="_blank" rel="noreferrer">Open full album</a>
        <span className="baa-status">{saveState === "saving" ? "Saving…" : saveState === "saved" ? "✓ Saved" : ""}</span>
      </div>
    </div>
  );
}

function SingleSongPanel({
  data,
  playing,
  config,
  onSaved,
  onDisconnect,
  account,
  mode,
  onModeChange,
}: {
  data: SongRatingResponse;
  playing: PlayingTrack;
  config: ExtensionConfig;
  onSaved: (next: SongRatingResponse) => void;
  onDisconnect: () => void;
  account: ExtensionAccount;
  mode: "song" | "album";
  onModeChange: (mode: "song" | "album") => void;
}) {
  const saved = data.status === "ready" ? data.song : null;
  const [rating, setRating] = React.useState(saved?.rating == null ? "" : String(saved.rating));
  const [replay, setReplay] = React.useState<ReplayValue | null>(saved?.replayValue ?? null);
  const [notes, setNotes] = React.useState(saved?.notes ?? "");
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = React.useState<string | null>(null);

  async function persist(overrides: Partial<{ rating: string; replay: ReplayValue | null; notes: string }>) {
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
        replayValue: overrides.replay === undefined ? replay : overrides.replay,
        notes: overrides.notes === undefined ? notes || null : overrides.notes || null,
      });
      onSaved(next);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1300);
    } catch (caught) {
      setSaveState("idle");
      setError(friendlyError(caught));
    }
  }

  function chooseReplay(value: ReplayValue) {
    const next = replay === value ? null : value;
    setReplay(next);
    void persist({ replay: next });
  }

  const score = rating === "" ? 0 : Math.max(0, Math.min(10, Number(rating) || 0));
  return (
    <div className="baa-panel">
      <AccountCue account={account} onChange={onDisconnect} />
      <ModeSwitch mode={mode} onChange={onModeChange} />
      <div style={{ display: "flex", alignItems: "start", gap: "8px" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="baa-kicker">Standalone song</div>
          <h2 className="baa-title">{saved?.title ?? playing.trackName}</h2>
          <p className="baa-subtitle">{saved?.artist ?? playing.artistName}</p>
        </div>
      </div>

      {playing.imageUrl && <img className="baa-cover" src={playing.imageUrl} alt="" />}
      <p className="baa-song-album">{saved?.albumTitle ?? playing.albumName}</p>

      <div className="baa-score-row">
        <label className="baa-score-label" htmlFor="baa-song-score">Your score<br />out of ten</label>
        <input
          id="baa-song-score"
          className="baa-score"
          type="number"
          min="0"
          max="10"
          step="0.01"
          value={rating}
          placeholder="—"
          onChange={(event: ChangeEvent<HTMLInputElement>) => setRating(event.target.value)}
          onBlur={() => void persist({})}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </div>
      <input
        className="baa-range"
        type="range"
        min="0"
        max="10"
        step="0.1"
        value={score}
        aria-label={`Standalone rating for ${playing.trackName}`}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setRating(event.target.value)}
        onPointerUp={(event: PointerEvent<HTMLInputElement>) => void persist({ rating: event.currentTarget.value })}
        onKeyUp={(event: KeyboardEvent<HTMLInputElement>) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            void persist({ rating: event.currentTarget.value });
          }
        }}
      />

      <div className="baa-section">
        <span className="baa-section-label">Would replay?</span>
        <div className="baa-replay">
          {REPLAY_VALUES.map((value) => (
            <button key={value} type="button" data-active={replay === value} onClick={() => chooseReplay(value)}>
              {REPLAY_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <label className="baa-section baa-section-label">
        Listening note
        <textarea
          className="baa-notes"
          value={notes}
          maxLength={1000}
          placeholder="What makes this song stick?"
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNotes(event.target.value)}
          onBlur={() => void persist({})}
        />
      </label>

      {error && <div className="baa-error">{error}</div>}
      <div className="baa-actions">
        <a className="baa-link" href={`${config.siteUrl}/songs`} target="_blank" rel="noreferrer">Open song library</a>
        <span className="baa-status">{saveState === "saving" ? "Saving…" : saveState === "saved" ? "✓ Saved" : ""}</span>
      </div>
    </div>
  );
}

function ArchivePanel() {
  const [config, setConfig] = React.useState<ExtensionConfig | null>(() => loadConfig());
  const [account, setAccount] = React.useState<ExtensionAccount | null>(null);
  const [showSettings, setShowSettings] = React.useState(false);
  const [playing, setPlaying] = React.useState<PlayingTrack | null>(() => readPlayingTrack());
  const [current, setCurrent] = React.useState<CurrentResponse | null>(null);
  const [songCurrent, setSongCurrent] = React.useState<SongRatingResponse | null>(null);
  const [mode, setMode] = React.useState<"song" | "album">("album");
  const [loading, setLoading] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [accountError, setAccountError] = React.useState<string | null>(null);
  const [accountAttempt, setAccountAttempt] = React.useState(0);
  const requestVersionRef = React.useRef(0);

  async function load(track: PlayingTrack, activeConfig: ExtensionConfig) {
    requestVersionRef.current += 1;
    const version = requestVersionRef.current;
    setLoading(true);
    setError(null);
    try {
      const [albumResult, songResult] = await Promise.all([
        getCurrent(activeConfig, track.spotifyAlbumId, track.spotifyTrackId),
        getSongRating(activeConfig, track.spotifyTrackId),
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
    if (!config || account) return;
    let active = true;
    void getAccount(config)
      .then((next) => {
        if (active) {
          setAccount(next);
          setAccountError(null);
        }
      })
      .catch((caught) => {
        if (active) setAccountError(friendlyError(caught));
      });
    return () => {
      active = false;
    };
  }, [config, account, accountAttempt]);

  React.useEffect(() => {
    setCurrent(null);
    setSongCurrent(null);
    if (playing && config) void load(playing, config);
  }, [playing, config]);

  async function connect(next: ExtensionConfig) {
    const nextAccount = await getAccount(next);
    saveConfig(next);
    setAccount(nextAccount);
    setAccountError(null);
    setAccountAttempt(0);
    setConfig(next);
    setShowSettings(false);
  }

  function disconnect() {
    clearConfig();
    setConfig(null);
    setAccount(null);
    setAccountError(null);
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

  if (!config || showSettings) return <ConnectionForm onConnect={connect} />;
  if (accountError && !account) {
    return (
      <div className="baa-panel">
        <div className="baa-empty">
          <div className="baa-empty-mark">!</div>
          <h2 className="baa-title">Account check failed</h2>
          <p>{accountError}</p>
          <div className="baa-actions" style={{ justifyContent: "center" }}>
            <button className="baa-button" type="button" onClick={() => { setAccountError(null); setAccountAttempt((value) => value + 1); }}>Try again</button>
            <button className="baa-button baa-button-secondary" type="button" onClick={disconnect}>Reconnect</button>
          </div>
        </div>
      </div>
    );
  }
  if (!playing) return <EmptyState title="Play an album" body="The current track will appear here when Spotify starts playing an album." account={account} onChangeAccount={() => setShowSettings(true)} />;
  if (loading && !current) return <EmptyState title="Finding this track" body={`${playing.trackName} · ${playing.artistName}`} account={account} onChangeAccount={() => setShowSettings(true)} />;
  if (error && !current) {
    return (
      <div className="baa-panel">
        {account && <AccountCue account={account} onChange={() => setShowSettings(true)} />}
        <div className="baa-empty">
          <div className="baa-empty-mark">!</div>
          <h2 className="baa-title">Connection interrupted</h2>
          <p>{error}</p>
          <div className="baa-actions" style={{ justifyContent: "center" }}>
            <button className="baa-button" type="button" onClick={() => void load(playing, config)}>Try again</button>
            <button className="baa-button baa-button-secondary" type="button" onClick={disconnect}>Reconnect</button>
          </div>
        </div>
      </div>
    );
  }
  if (mode === "song" && songCurrent) {
    if (!account) return <EmptyState title="Confirming your account" body="Checking where your ratings will be saved…" />;
    return (
      <SingleSongPanel
        key={playing.spotifyTrackId}
        data={songCurrent}
        playing={playing}
        config={config}
        onSaved={setSongCurrent}
        onDisconnect={() => setShowSettings(true)}
        account={account}
        mode={mode}
        onModeChange={setMode}
      />
    );
  }
  if (current?.status === "album_missing" || current?.status === "track_missing") {
    if (!account) return <EmptyState title="Confirming your account" body="Checking where your ratings will be saved…" />;
    return (
      <div className="baa-panel">
        <AccountCue account={account} onChange={() => setShowSettings(true)} />
        <ModeSwitch mode={mode} onChange={setMode} />
        {playing.imageUrl && <img className="baa-cover" src={playing.imageUrl} alt="" />}
        <div className="baa-kicker">Not linked yet</div>
        <h2 className="baa-title">{playing.albumName}</h2>
        <p className="baa-subtitle">{playing.artistName}</p>
        <p style={{ marginTop: "16px", color: "var(--baa-muted)", fontSize: "12px", lineHeight: 1.5 }}>
          Add this Spotify edition to rate its tracks in Album Archive. An exact existing album will be linked automatically.
        </p>
        {error && <div className="baa-error">{error}</div>}
        <div className="baa-actions">
          <button className="baa-button" type="button" disabled={importing} onClick={() => void addAlbum()}>
            {importing ? "Adding…" : "Add to Archive"}
          </button>
        </div>
      </div>
    );
  }
  if (current?.status === "ready") {
    if (!account) return <EmptyState title="Confirming your account" body="Checking where your ratings will be saved…" />;
    return (
      <RatingPanel
        key={current.track.id}
        data={current}
        playing={playing}
        config={config}
        onSaved={setCurrent}
        onDisconnect={() => setShowSettings(true)}
        account={account}
        mode={mode}
        onModeChange={setMode}
      />
    );
  }
  return <EmptyState title="Opening your archive" body="Loading the current track…" />;
}

function addStyles() {
  if (document.getElementById("album-archive-extension-styles")) return;
  const style = document.createElement("style");
  style.id = "album-archive-extension-styles";
  style.textContent = PANEL_STYLES;
  document.head.appendChild(style);
}

function Drawer({ onClose }: { onClose: () => void }) {
  return (
    <aside className="baa-drawer" aria-label="Album Archive">
      <header className="baa-drawer-header">
        <span>Album Archive</span>
        <button type="button" onClick={onClose} aria-label="Close Album Archive">×</button>
      </header>
      <div className="baa-drawer-scroll">
        <ArchivePanel />
      </div>
    </aside>
  );
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
      children: <ArchivePanel />,
    });
    new Spicetify.Topbar.Button("Album Archive", icon, () => panel.toggle(), false, true);
    return;
  }

  const host = document.createElement("div");
  host.id = "album-archive-drawer-root";
  document.body.appendChild(host);
  const root = Spicetify.ReactDOM.createRoot(host);
  let open = false;
  const render = () => root.render(open ? <Drawer onClose={() => { open = false; render(); }} /> : null);
  new Spicetify.Topbar.Button("Album Archive", icon, () => {
    open = !open;
    render();
  }, false, true);
})();
