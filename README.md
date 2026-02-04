# tetris-clone

## Web version

The mobile web build lives in `./tetris_web`.

GitHub Pages (after the workflow runs):
- https://ericargyle.github.io/tetris-clone/

Two small Tetris clones:

- Ubuntu (pygame): tetris_clone/ — runs locally with Python + pygame.
- Mobile web: tetris_web/ — HTML/JS canvas version with touch controls.

## Quick start (Ubuntu pygame)

sudo apt-get update -y
sudo apt-get install -y python3 python3-pygame

cd tetris_clone
python3 tetris.py

## Windows EXE (pygame)

This repo includes a GitHub Actions workflow that builds a standalone Windows EXE using **PyInstaller**.

1) Go to the repo → **Actions**
2) Open **Build Windows EXE (pygame)**
3) Download the artifact **TetrisClone-windows-exe**
4) Extract and run `TetrisClone.exe`

## Quick start (mobile web)

cd tetris_web
python3 -m http.server 8000

Open:
- http://localhost:8000 (same machine)
- http://<your-ip>:8000 (phone on same Wi‑Fi)

## Controls

See each subfolder README for controls.
