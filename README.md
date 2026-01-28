# tetris-clone

Two small Tetris clones:

- Ubuntu (pygame): tetris_clone/ — runs locally with Python + pygame.
- Mobile web: tetris_web/ — HTML/JS canvas version with touch controls.

## Quick start (Ubuntu pygame)

sudo apt-get update -y
sudo apt-get install -y python3 python3-pygame

cd tetris_clone
python3 tetris.py

## Quick start (mobile web)

cd tetris_web
python3 -m http.server 8000

Open:
- http://localhost:8000 (same machine)
- http://<your-ip>:8000 (phone on same Wi‑Fi)

## Controls

See each subfolder README for controls.
