# Keeping the site up to date

## Preview / publish
```bash
cd ~/Documents/website/my-site
quarto preview            # live preview while editing
quarto publish gh-pages   # push the built site to GitHub Pages
```
(First time: create a public GitHub repo, `git init`, add it as the remote. See WALKTHROUGH.md Part 8.)

## CV
Drop `cv.pdf` in this folder. The navbar and the home page already link to it.

## Refreshing the unigram explorer
`unigram/explorer.html` is an untouched copy of psycho-gym's
`studies/hopton2026unigram/caseviz_preview_selfcontained.html`. After regenerating it:
```bash
cp ~/Documents/projects/psycho-gym/src/psycholing_gym/studies/hopton2026unigram/caseviz_preview_selfcontained.html \
   ~/Documents/website/my-site/unigram/explorer.html
```
The site look (fonts, blue/grey colors, hidden duplicate title) comes from
`unigram/explorer-theme.css`, which the paper page injects at load time, so you never
need to edit the explorer file itself.

## Adding a paper
Copy an `<li>` block in `publications.qmd`. Put PDFs in `papers/`.

## Theme
`styles.scss` holds the palette and type. The previous cream theme is in
`styles-cream.scss`; point `_quarto.yml` at it to switch back.
The homepage spectrogram is drawn by `assets/signal.js` (synthesized, not a recording).
