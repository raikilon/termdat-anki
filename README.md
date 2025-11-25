# Termdat → Anki deck builder

Build TSV decks for Anki from the TERMDAT terminology API. Choose source/target languages, pick one or more TERMDAT collections, and export the matching entries as a tab-separated file you can import into Anki.

## Stack
- Angular 21 (standalone components, signals, httpResource)
- Angular Material (form controls, chips/autocomplete)
- TypeScript with strict typing
- Client-side filtering/pagination of TERMDAT search results

## Features
- Language selection with enforced source/target separation
- Multi-collection picker with chip+autocomplete UX
- Client-side pagination that stops when collections change
- TSV export with clean, tab-safe fields and per-language lines joined with `<br>`

## Getting started

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm

### Install
```bash
npm install
```

### Run locally
```bash
npm run start
```
- App: http://localhost:4200
- Uses `proxy.conf.json` to reach the TERMDAT API (ensure the proxy target is reachable in your environment).

### Build
```bash
npm run build
```
Outputs production assets to `dist/`.

## Usage tips
- Select a source language; target chips auto-exclude the source and require at least one target.
- Use the collections field to search/add collections; remove chips to narrow results.
- Export when entries are loaded; the TSV is ready to import into Anki.
