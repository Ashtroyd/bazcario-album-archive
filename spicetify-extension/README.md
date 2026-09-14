# Album Archive for Spicetify — beta

Rate the track currently playing in Spotify and save it directly to
[Album Archive](https://bazcario-album-archive.vercel.app).

## Install

You need the Spotify desktop app and
[Spicetify](https://spicetify.app/docs/getting-started/).

### macOS or Linux

```sh
curl -fsSL https://raw.githubusercontent.com/Ashtroyd/bazcario-album-archive/main/spicetify-extension/install.sh | sh
```

### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/Ashtroyd/bazcario-album-archive/main/spicetify-extension/install.ps1 | iex
```

The installer downloads the beta release, enables it in Spicetify, and applies
the configuration. Rerun the same command to update it.

If you prefer to inspect everything first, download the scripts from this
directory and run them locally.

## Connect

1. Sign up or sign in to Album Archive.
2. Open [Profile](https://bazcario-album-archive.vercel.app/profile).
3. In **Spotify Extension**, create a connection token.
4. Open Album Archive from Spotify's top bar and paste the token.

Connection tokens are private credentials. Each listener must create their own,
and a token should be revoked immediately if it is ever shared.

## Manual installation

Download `album-archive.js` from the latest GitHub release and place it in:

- macOS/Linux: `~/.config/spicetify/Extensions/`
- Windows: `%appdata%\spicetify\Extensions\`

Then run:

```sh
spicetify config extensions album-archive.js
spicetify apply
```

## Build

From the repository root:

```sh
npm run spicetify:build
```

For local testing, copy `spicetify-extension/dist/album-archive.js` into your
Spicetify Extensions directory and apply it. The production site is filled in
by default; `http://127.0.0.1:3000` is also accepted for development.
