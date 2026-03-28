# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website (adam-imeson.github.io) built with Gatsby 3 and React 17. Features interactive game pages (Tetris, Asteroids, Juggling simulator) and educational content.

## Commands

- **Dev server**: `npm run develop` (or `npm start`)
- **Build**: `npm run build`
- **Serve build locally**: `npm run serve`
- **Clean cache**: `npm run clean`
- **Format code**: `npm run format` (Prettier)
- **Deploy**: `npm run deploy` (builds then pushes `public/` to `main` branch via gh-pages)

No test framework is configured.

## Architecture

Gatsby static site with file-based routing. All pages in `src/pages/` are auto-routed by Gatsby.

- `src/pages/` — Each page is a self-contained React component (game logic, rendering, and styles are co-located within single files)
- `src/components/layout.js` + `layout.css` — Shared layout wrapper and global styles
- `src/assets/` — Static assets like images
- `gatsby-config.js` — Minimal config with no plugins

## Deployment

Development happens on the `develop` branch. The `main` branch is the GitHub Pages deployment target — `npm run deploy` builds and pushes there directly. Do not manually commit to `main`.
