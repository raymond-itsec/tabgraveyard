# Tab Graveyard

A tiny single-page app for burying URLs you swear you will read later. It stores everything in `localStorage`, so it needs no backend.

## Run Locally

Open `docs/index.html` in a browser, or serve it with any static server:

```sh
python3 -m http.server 8080 -d docs
```

## Publish On GitHub Pages

1. Create a new empty GitHub repository.
2. Push this local repository to it.
3. In GitHub, go to `Settings` -> `Pages`.
4. Choose `Deploy from a branch`.
5. Set the source to `main` and `/docs`.
6. Save, then open the Pages URL GitHub gives you.

The app files live in `docs/` because GitHub Pages supports publishing that folder directly.

## Features

- Add URLs as gravestones.
- Auto-generate a readable title from the URL.
- Save graves in `localStorage`.
- Search and filter all, fresh, ancient, and archived tabs.
- Mark a tab for haunting later.
- Resurrect links in a new tab.
- Archive old graves with the Mass Funeral button.
