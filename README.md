# Tetris New Tab Extension

A premium and immersive Chrome New Tab dashboard featuring an ambient background Tetris game that becomes playable on command.

## Features

- **Ambient Mode**: Tetris pieces fall and stack automatically in the background with low opacity behind a custom glassmorphism dashboard.
- **Natural AI Autoplay**: The background simulation uses a heuristic-based AI solver to keep the game active, clearing rows and resetting automatically if it tops out.
- **Playable Mode**: Toggle active gameplay with the **`T`** key to dim the dashboard, highlight the board, and control the pieces.
- **HUD Interface**: Tracks Score, High Score, Level, Lines, and displays a Next Piece preview container.
- **Search Exclusions**: Keyboard controls are ignored when the search input is focused.
- **State Transitions**: Smooth blur and scale animation states between ambient and playable modes.

## Architecture

- `manifest.json`: Manifest configuration override.
- `index.html`: Dashboard structures and HUD containers.
- `css/main.css` & `css/tetris.css`: Styling sheets.
- `js/tetris.js`: Pure JavaScript Tetris engine.
- `js/renderer.js`: HTML5 Canvas rendering engine.
- `js/background-player.js`: Ambient AI autoplay engine.
- `js/input.js` & `js/main.js`: Setup controllers and state loop.

## Installation

1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top right.
4. Click **Load unpacked** in the top left.
5. Select this directory (`tetris-extension`).
6. Open a new tab (`Ctrl + T`) to play!
