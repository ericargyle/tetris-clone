# Tetris (Mobile Web)

A mobile-friendly Tetris clone (HTML/JS Canvas). Works on phone browsers + desktop.

## Run locally on Ubuntu

```bash
cd /home/moltbot/clawd/tetris_web
python3 -m http.server 8000
```

Then open in a browser:
- On the same machine: http://localhost:8000
- On your phone (same Wi‑Fi): http://<THIS_UBUNTU_IP>:8000

To find the IP:
```bash
hostname -I
```

## Mobile controls
- Tap left/right side of the board: move
- Tap center of the board: rotate
- Swipe down: soft drop
- Swipe up: hard drop
- Buttons: ◀ ▶ ⟳ ▼ ⤓ Hold Pause Restart

## Keyboard controls
- ← → move
- ↓ soft drop
- Space hard drop
- ↑ / X rotate
- Z rotate CCW
- C hold
- P pause
- R restart
