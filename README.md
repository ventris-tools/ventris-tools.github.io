# Ventris Tools website

The landing page for Ventris Tools, live at <https://ventris-tools.github.io>.

Ventris Tools is an open-source project for understanding EEG. Its first tool is Ventris, a web-based EEG decoding app.

## Run it locally

This is plain HTML and CSS, with no build step and no dependencies.

```bash
python3 -m http.server 4174
```

Then open <http://localhost:4174>. The Ventris card's link gives a 404 here, because `/ventris/` is a separate site.

## Checks

The site has no dependencies, but its checks do. They need Node 22 and Google Chrome.

```bash
npm ci
npm run check
```

This validates the HTML, then opens the pages in Chrome. It looks for console errors, including anything the Content Security Policy blocks, and for broken links and missing files. It also checks that every character is in the font subset, that both themes pass an accessibility scan, that phones get no sideways scrolling, and that the home page stays within its page weight budget and fits one desktop screen.

## Deployment

Every push to `main` runs the checks on GitHub Actions. If they pass, GitHub Pages publishes the `_site` folder they tested. If they fail, the last good version stays live.

`_site` holds only the files listed in `scripts/collect-site.sh`, so add any new file the site needs there. The checks fail if a page refers to a file that isn't listed.

The app at `/ventris/` is the Pages site of the [ventris](https://github.com/ventris-tools/ventris) repository, so the card's link depends on that repository's name.

## Images

`og.png` and `apple-touch-icon.png` are rendered from the site's own copy, colors and fonts. Run this after you change the headline, the `og:description` or the palette. It needs Google Chrome.

```bash
python3 scripts/make-images.py
```

## Fonts

The files in `fonts/` are JetBrains Mono v2.304, cut down to Latin text without the code ligatures. A character outside this set falls back to a system font, so add it and run this on the release's `fonts/webfonts` files. It needs the `fonttools` and `brotli` Python packages.

```bash
pyftsubset JetBrainsMono-Regular.woff2 --unicodes='U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2026,U+2190-2193' --layout-features='kern,mark,mkmk,ccmp,locl' --name-IDs='*' --flavor=woff2 --output-file=fonts/JetBrainsMono-Regular.woff2
```

Do the same for `JetBrainsMono-Medium.woff2`.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before you reuse code from another project.

## License

BSD 3-Clause. See [LICENSE](LICENSE).

The site uses [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono), hosted here so that visitors make no third-party requests. The font is under the SIL Open Font License. See [fonts/OFL.txt](fonts/OFL.txt).

The GitHub mark in the header is from [Octicons](https://github.com/primer/octicons), under the MIT license. See [licenses/octicons.txt](licenses/octicons.txt).
