#!/usr/bin/env python3
"""A small Tetris clone for Ubuntu using pygame.

Controls:
  Left/Right: move
  Down: soft drop
  Up or X: rotate clockwise
  Z: rotate counter-clockwise
  Space: hard drop
  C: hold
  P: pause
  R: restart
  Esc: quit

No music/assets required.
"""

from __future__ import annotations

import random
import sys
import time
from dataclasses import dataclass

import pygame


W, H = 10, 20
VISIBLE_H = 20

CELL = 28
MARGIN = 16
SIDE = 180
TOP = 56

SCREEN_W = MARGIN * 2 + W * CELL + SIDE
SCREEN_H = TOP + MARGIN + VISIBLE_H * CELL + MARGIN

FPS = 60

BG = (14, 16, 20)
PANEL = (22, 25, 33)
GRID = (34, 39, 52)
TEXT = (230, 233, 240)
SUBTLE = (150, 155, 170)
GHOST = (255, 255, 255, 45)

# Classic-ish colors
COLORS = {
    "I": (80, 227, 230),
    "O": (245, 211, 92),
    "T": (168, 113, 255),
    "S": (105, 235, 120),
    "Z": (235, 90, 90),
    "J": (92, 145, 255),
    "L": (255, 165, 80),
}

# 4x4 matrices, 1 = block
SHAPES = {
    "I": [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    "O": [
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    "T": [
        [0, 1, 0, 0],
        [1, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    "S": [
        [0, 1, 1, 0],
        [1, 1, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    "Z": [
        [1, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    "J": [
        [1, 0, 0, 0],
        [1, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    "L": [
        [0, 0, 1, 0],
        [1, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
}


def rotate_cw(m):
    return [list(row) for row in zip(*m[::-1])]


def rotate_ccw(m):
    return [list(row) for row in zip(*m)][::-1]


@dataclass
class Piece:
    kind: str
    mat: list[list[int]]
    x: int
    y: int

    @property
    def color(self):
        return COLORS[self.kind]


class Bag:
    def __init__(self):
        self.bag: list[str] = []

    def next(self) -> str:
        if not self.bag:
            self.bag = list(SHAPES.keys())
            random.shuffle(self.bag)
        return self.bag.pop()


def new_piece(kind: str) -> Piece:
    mat = [row[:] for row in SHAPES[kind]]
    # Spawn near top, centered
    return Piece(kind=kind, mat=mat, x=W // 2 - 2, y=0)


def mat_cells(mat):
    for r in range(4):
        for c in range(4):
            if mat[r][c]:
                yield r, c


def collides(board, p: Piece) -> bool:
    for r, c in mat_cells(p.mat):
        x = p.x + c
        y = p.y + r
        if x < 0 or x >= W or y < 0 or y >= H:
            return True
        if board[y][x] is not None:
            return True
    return False


def lock_piece(board, p: Piece):
    for r, c in mat_cells(p.mat):
        x = p.x + c
        y = p.y + r
        if 0 <= x < W and 0 <= y < H:
            board[y][x] = p.kind


def clear_lines(board) -> int:
    new = [row for row in board if any(cell is None for cell in row)]
    cleared = H - len(new)
    while len(new) < H:
        new.insert(0, [None] * W)
    board[:] = new
    return cleared


def ghost_drop_y(board, p: Piece) -> int:
    tmp = Piece(p.kind, [row[:] for row in p.mat], p.x, p.y)
    while True:
        tmp.y += 1
        if collides(board, tmp):
            return tmp.y - 1


def draw_cell(surf, x, y, color, alpha=None, border=True):
    rect = pygame.Rect(MARGIN + x * CELL, TOP + y * CELL, CELL, CELL)
    if alpha is None:
        pygame.draw.rect(surf, color, rect)
    else:
        s = pygame.Surface((CELL, CELL), pygame.SRCALPHA)
        r, g, b = color
        s.fill((r, g, b, alpha))
        surf.blit(s, rect.topleft)
    if border:
        pygame.draw.rect(surf, GRID, rect, 1)


def draw_piece(surf, p: Piece, offset_x=0, offset_y=0, alpha=None):
    for r, c in mat_cells(p.mat):
        x = offset_x + p.x + c
        y = offset_y + p.y + r
        if y >= 0:
            draw_cell(surf, x, y, p.color, alpha=alpha)


def draw_mini(surf, kind: str | None, cx: int, cy: int, label: str, font, small):
    pygame.draw.rect(surf, PANEL, pygame.Rect(cx, cy, SIDE - 24, 110), border_radius=10)
    t = small.render(label, True, SUBTLE)
    surf.blit(t, (cx + 10, cy + 8))
    if not kind:
        return
    mat = SHAPES[kind]
    col = COLORS[kind]
    # draw 4x4 mini
    ox = cx + 18
    oy = cy + 34
    mini = 18
    for r in range(4):
        for c in range(4):
            if mat[r][c]:
                rect = pygame.Rect(ox + c * mini, oy + r * mini, mini, mini)
                pygame.draw.rect(surf, col, rect)
                pygame.draw.rect(surf, (40, 45, 60), rect, 1)


def main():
    pygame.init()
    pygame.display.set_caption("Tetris Clone")
    screen = pygame.display.set_mode((SCREEN_W, SCREEN_H))
    clock = pygame.time.Clock()

    font = pygame.font.SysFont("DejaVu Sans", 22)
    small = pygame.font.SysFont("DejaVu Sans", 16)

    def reset():
        board = [[None for _ in range(W)] for _ in range(H)]
        bag = Bag()
        current = new_piece(bag.next())
        next_kind = bag.next()
        hold_kind = None
        hold_used = False
        score = 0
        lines = 0
        level = 1
        game_over = False
        paused = False
        fall_timer = 0.0
        fall_interval = 0.8
        lock_delay = 0.5
        lock_timer = 0.0
        return {
            "board": board,
            "bag": bag,
            "current": current,
            "next": next_kind,
            "hold": hold_kind,
            "hold_used": hold_used,
            "score": score,
            "lines": lines,
            "level": level,
            "game_over": game_over,
            "paused": paused,
            "fall_timer": fall_timer,
            "fall_interval": fall_interval,
            "lock_delay": lock_delay,
            "lock_timer": lock_timer,
        }

    st = reset()

    # Basic key repeat for movement
    pygame.key.set_repeat(130, 50)

    def update_level():
        st["level"] = 1 + st["lines"] // 10
        # Faster fall as level increases
        st["fall_interval"] = max(0.08, 0.8 * (0.86 ** (st["level"] - 1)))

    def try_move(dx, dy):
        p = st["current"]
        p.x += dx
        p.y += dy
        if collides(st["board"], p):
            p.x -= dx
            p.y -= dy
            return False
        return True

    def try_rotate(direction: str):
        p = st["current"]
        old = [row[:] for row in p.mat]
        p.mat = rotate_cw(p.mat) if direction == "cw" else rotate_ccw(p.mat)

        # Simple wall kicks
        kicks = [(0, 0), (-1, 0), (1, 0), (-2, 0), (2, 0), (0, -1)]
        for kx, ky in kicks:
            p.x += kx
            p.y += ky
            if not collides(st["board"], p):
                return True
            p.x -= kx
            p.y -= ky

        p.mat = old
        return False

    def hard_drop():
        p = st["current"]
        gy = ghost_drop_y(st["board"], p)
        drop = gy - p.y
        if drop > 0:
            st["score"] += 2 * drop
        p.y = gy
        lock_now()

    def lock_now():
        p = st["current"]
        lock_piece(st["board"], p)
        cleared = clear_lines(st["board"])
        if cleared:
            # Scoring: 1/2/3/4 lines
            pts = {1: 100, 2: 300, 3: 500, 4: 800}[cleared]
            st["score"] += pts * st["level"]
            st["lines"] += cleared
            update_level()
        st["hold_used"] = False
        # spawn next
        st["current"] = new_piece(st["next"])
        st["next"] = st["bag"].next()
        st["lock_timer"] = 0.0
        if collides(st["board"], st["current"]):
            st["game_over"] = True

    def do_hold():
        if st["hold_used"] or st["game_over"]:
            return
        st["hold_used"] = True
        cur = st["current"].kind
        if st["hold"] is None:
            st["hold"] = cur
            st["current"] = new_piece(st["next"])
            st["next"] = st["bag"].next()
        else:
            st["current"] = new_piece(st["hold"])
            st["hold"] = cur
        if collides(st["board"], st["current"]):
            st["game_over"] = True

    last = time.time()

    while True:
        dt = clock.tick(FPS) / 1000.0
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.quit()
                    return
                if event.key == pygame.K_p:
                    st["paused"] = not st["paused"]
                if event.key == pygame.K_r:
                    st = reset()
                    continue

                if st["paused"] or st["game_over"]:
                    continue

                if event.key == pygame.K_LEFT:
                    try_move(-1, 0)
                elif event.key == pygame.K_RIGHT:
                    try_move(1, 0)
                elif event.key == pygame.K_DOWN:
                    if try_move(0, 1):
                        st["score"] += 1
                elif event.key in (pygame.K_UP, pygame.K_x):
                    try_rotate("cw")
                elif event.key == pygame.K_z:
                    try_rotate("ccw")
                elif event.key == pygame.K_SPACE:
                    hard_drop()
                elif event.key == pygame.K_c:
                    do_hold()

        if not st["paused"] and not st["game_over"]:
            st["fall_timer"] += dt

            # Gravity
            if st["fall_timer"] >= st["fall_interval"]:
                st["fall_timer"] = 0.0
                moved = try_move(0, 1)
                if not moved:
                    st["lock_timer"] += st["fall_interval"]

            # Lock delay if resting
            p = st["current"]
            test = Piece(p.kind, [row[:] for row in p.mat], p.x, p.y + 1)
            if collides(st["board"], test):
                st["lock_timer"] += dt
                if st["lock_timer"] >= st["lock_delay"]:
                    lock_now()
            else:
                st["lock_timer"] = 0.0

        # --- Render ---
        screen.fill(BG)

        # Board panel
        pygame.draw.rect(
            screen,
            PANEL,
            pygame.Rect(MARGIN - 6, TOP - 6, W * CELL + 12, VISIBLE_H * CELL + 12),
            border_radius=12,
        )

        # Grid cells
        for y in range(VISIBLE_H):
            for x in range(W):
                kind = st["board"][y][x]
                if kind:
                    draw_cell(screen, x, y, COLORS[kind])
                else:
                    rect = pygame.Rect(MARGIN + x * CELL, TOP + y * CELL, CELL, CELL)
                    pygame.draw.rect(screen, GRID, rect, 1)

        # Ghost
        if not st["game_over"]:
            p = st["current"]
            gy = ghost_drop_y(st["board"], p)
            ghost = Piece(p.kind, [row[:] for row in p.mat], p.x, gy)
            for r, c in mat_cells(ghost.mat):
                x = ghost.x + c
                y = ghost.y + r
                if y >= 0:
                    draw_cell(screen, x, y, ghost.color, alpha=55)

            draw_piece(screen, p)

        # Side panel
        sx = MARGIN + W * CELL + 18
        title = font.render("TETRIS", True, TEXT)
        screen.blit(title, (sx, 18))

        draw_mini(screen, st["next"], sx, 56, "NEXT", font, small)
        draw_mini(screen, st["hold"], sx, 176, "HOLD", font, small)

        # Score
        pygame.draw.rect(screen, PANEL, pygame.Rect(sx, 296, SIDE - 24, 130), border_radius=10)
        for i, (k, v) in enumerate(
            [
                ("Score", st["score"]),
                ("Lines", st["lines"]),
                ("Level", st["level"]),
            ]
        ):
            t = small.render(k.upper(), True, SUBTLE)
            screen.blit(t, (sx + 10, 306 + i * 38))
            val = font.render(str(v), True, TEXT)
            screen.blit(val, (sx + 10, 322 + i * 38))

        # Help
        help_lines = [
            "← → move",
            "↓ soft drop",
            "Space hard drop",
            "↑/X rotate",
            "Z rotate ccw",
            "C hold",
            "P pause, R restart",
            "Esc quit",
        ]
        y0 = 444
        for i, line in enumerate(help_lines):
            t = small.render(line, True, SUBTLE)
            screen.blit(t, (sx, y0 + i * 18))

        # Overlays
        if st["paused"]:
            overlay = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
            overlay.fill((0, 0, 0, 140))
            screen.blit(overlay, (0, 0))
            t = font.render("PAUSED", True, TEXT)
            screen.blit(t, (MARGIN + 50, TOP + 200))

        if st["game_over"]:
            overlay = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
            overlay.fill((0, 0, 0, 170))
            screen.blit(overlay, (0, 0))
            t = font.render("GAME OVER", True, (255, 120, 120))
            screen.blit(t, (MARGIN + 35, TOP + 180))
            t2 = small.render("Press R to restart", True, TEXT)
            screen.blit(t2, (MARGIN + 40, TOP + 215))

        pygame.display.flip()


if __name__ == "__main__":
    main()
