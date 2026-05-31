# Work Hours Tracker AU ⏱

> Track work hours and earnings — built for hourly workers and international students in Australia.

A production-quality Progressive Web App (PWA). Works fully offline. Installable on Android. No account required.

---

## Features

- **Three entry methods** — Manual, Start/End Time, Live Stopwatch
- **Active shift persistence** — Survives browser close, refresh, and device lock
- **Payment workflow** — Mark shifts as paid, track pending earnings
- **Payment summary** — Export CSV, print, or share with your employer
- **Backup & restore** — Full data backup to JSON
- **Dark mode first** — Material 3-inspired design
- **Offline** — Works completely without internet
- **Installable** — Add to Android home screen as a native-like app

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Generating App Icons

Before deploying, generate PNG icons from the SVG source:

**Option A — Online (recommended):**
1. Go to https://realfavicongenerator.net/
2. Upload `public/icons/icon.svg`
3. Download and extract into `public/icons/`
4. Rename to match:
   - `icon-192.png`
   - `icon-512.png`
   - `icon-maskable-192.png`
   - `icon-maskable-512.png`

**Option B — Node.js canvas:**
```bash
npm install -D canvas
node scripts/generate-icons.js
```

> The app builds and runs without icons — they're only needed for the install prompt and launcher.

---

## GitHub Pages Deployment

1. Build the project:
```bash
npm run build
```

2. The `dist/` folder contains everything needed.

3. Push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/work-hours-tracker-au.git
git push -u origin main
```

4. Enable GitHub Pages:
   - Go to **Settings → Pages**
   - Source: **GitHub Actions**
   - Or deploy the `dist/` folder contents to the `gh-pages` branch

5. If using a subdirectory URL (e.g. `username.github.io/work-hours-tracker-au`), update `vite.config.ts`:
```ts
export default defineConfig({
  base: '/work-hours-tracker-au/',
  // ...
})
```

---

## Android WebView App

To convert to an Android app:

1. Deploy to GitHub Pages (above)
2. Use **Capacitor** or a **WebView wrapper**:

```bash
npm install -g @capacitor/cli
npx cap init "Work Hours Tracker AU" "au.workhours.tracker"
npm install @capacitor/android
npx cap add android
npm run build
npx cap copy android
npx cap open android
```

Or use **PWA Builder** at https://www.pwabuilder.com/ — paste your GitHub Pages URL and download the Android package directly.

---

## GitHub Actions CI/CD (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

---

## Project Structure

```
work-hours-tracker-au/
├── public/
│   └── icons/          # App icons (SVG + PNG)
├── scripts/
│   └── generate-icons.js
├── src/
│   ├── components/
│   │   ├── ActiveShiftCard.tsx   # Live shift display on dashboard
│   │   ├── BottomNav.tsx         # Android-style bottom navigation
│   │   ├── Modal.tsx             # Bottom sheet + centered dialogs
│   │   ├── ShiftCard.tsx         # Shift history item with edit/delete
│   │   ├── StopwatchEntry.tsx    # Live shift timer UI
│   │   └── Toast.tsx             # Notification toasts
│   ├── context/
│   │   └── AppContext.tsx        # Global state + active shift management
│   ├── db/
│   │   └── database.ts           # IndexedDB layer (via idb)
│   ├── pages/
│   │   ├── Dashboard.tsx         # Home screen with stats
│   │   ├── AddShift.tsx          # Three-method shift entry
│   │   ├── History.tsx           # Pending/paid shift history
│   │   ├── PaymentSummary.tsx    # Export + summary for employer
│   │   └── Settings.tsx          # All app settings + danger zone
│   ├── types/
│   │   └── index.ts              # TypeScript type definitions
│   └── utils/
│       ├── export.ts             # CSV, print, share utilities
│       └── format.ts             # Date, time, currency formatters
├── index.html
├── vite.config.ts                # Vite + PWA configuration
└── package.json
```

---

## Technology Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool + dev server |
| vite-plugin-pwa | PWA manifest + service worker |
| idb | IndexedDB wrapper |
| react-router-dom | Client-side routing |
| DM Sans + DM Mono | Typography |

---

## Data Storage

All data is stored locally in **IndexedDB** on the user's device.

- No account required
- No internet needed after first load
- Data never leaves the device
- Full backup/restore via JSON export

---

## License

MIT — Free to use, modify, and deploy.
