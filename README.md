# Bhoomi — India Land Rate Estimator

Founders: Divyansh Choudhary, Piyush Sharma, Shikhar Pandey

Frontend: HTML/CSS/JS (`frontend/`) · Backend: Node.js + Express (`backend/server.js`) · Database: SQLite built into Node.js (`backend/db.js`, file `backend/bhoomi.db`, created on first run).
The page is identical to `standalone/index.html`; the difference is that the reference data and the model run on the server.

## Requirements
Node.js 22.13 or newer (https://nodejs.org). Check with `node -v`. Only express and cors are installed from npm; nothing is compiled.

## Run it
Windows: double-click `start-windows.bat`.  Mac/Linux: `sh start-mac-linux.sh`.
Or by hand, inside the `backend` folder:

    cd backend
    npm install
    npm start

Then open http://localhost:3000

## Standalone version
Open `standalone/index.html` in Chrome or Edge. No server or database needed.

## API
- `GET /api/points` cleaned reference points
- `GET /api/estimate?lat=&lon=&mode=market|circle`
- `GET /api/compare?points=lat,lon;lat,lon;...&mode=`
- `GET /api/method` tuning results
- `GET /api/resolve?url=` expands a Google Maps short link (needs internet)
- `GET /api/history` this browser's own searches

## Troubleshooting
- `npm install` cannot find package.json: run `cd backend` first.
- "Needs Node.js 22.13 or newer": install the current LTS and reopen the terminal.
- "Port 3000 is already in use": close the other server, or run with `PORT=3001`.
- Location permission denied: open http://localhost:3000, click the lock icon beside the address bar, set Location to Allow, reload.
