# Two a Day

Two a Day is a local-first mobile web app for a simple daily challenge: draw or pick two exercises, then complete 200 reps of each across the day.

## Features

- Mobile-first PWA with offline caching.
- Daily two-exercise deck with a slot-machine randomizer.
- Manual illustrated card picker: tap two cards, or tap one and add a random partner.
- Duplicate exercises are blocked for the same day.
- Reps are saved in `localStorage`.
- Progress buttons for `+1`, `+5`, `+10`, and `+25`.
- Completion status is automatic when both exercises hit 200 reps.
- Previous days are saved to local history after the date changes.
- Reset today with confirmation.

## Files

- `index.html` - App shell and UI structure.
- `styles.css` - Mobile-first rugged fitness styling.
- `app.js` - Exercise deck, localStorage state, rendering, and interactions.
- `manifest.json` - PWA install metadata and home-screen icons.
- `service-worker.js` - Offline cache.
- `assets/icon.svg` - Source install icon.
- `assets/icon-192.png` and `assets/icon-512.png` - Home-screen PWA icons.

## Run locally

Because service workers need a local server, run the app from any static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
