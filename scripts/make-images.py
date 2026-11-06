#!/usr/bin/env python3
"""Render og.png and apple-touch-icon.png from the site's own copy, colors and fonts.

Run it after you change the headline, the og:description or the palette:

    python3 scripts/make-images.py

It needs Python and Google Chrome, and no packages. Set CHROME if Chrome is somewhere else.

With --check it renders nothing and needs no Chrome. It fails if the images are out of date.
"""

import base64
import hashlib
import html
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
SITE = SCRIPTS.parent / "site"
CHROME = os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

page = (SITE / "index.html").read_text(encoding="utf-8")
css = (SITE / "styles.css").read_text(encoding="utf-8")
# The images have one theme, so the logo's dark colors stay out of them.
logo = re.sub(r"<style>.*</style>", "", (SITE / "favicon.svg").read_text(encoding="utf-8"))


def find(pattern, text):
    match = re.search(pattern, text, re.S)
    if not match:
        raise SystemExit(f"Could not find {pattern!r}")
    return match.group(1)


def color(name):
    """The light theme's value, which comes first in styles.css."""
    return find(rf"--{name}: (#[0-9a-f]+);", css)


def font(weight):
    data = (SITE / "fonts" / f"JetBrainsMono-{weight}.woff2").read_bytes()
    return "data:font/woff2;base64," + base64.b64encode(data).decode()


# Non-breaking spaces keep the last three words together on the second line.
first, *last = find(r"<h1>(.*?)</h1>", page).rsplit(" ", 3)
headline = first + " " + "&nbsp;".join(last)
tagline = find(r'property="og:description" content="([^.]+)\.', page)
signal = find(r'class="signal".*?<path d="([^"]+)"', page)
trace = find(r'<path d="([^"]+)"', logo)
paper, ink, ink_2, accent = (color(name) for name in ("paper", "ink", "ink-2", "accent"))

OG_PAGE = f"""<!doctype html>
<meta charset="utf-8">
<style>
  @font-face {{ font-family: Mono; src: url("{font('Regular')}"); font-weight: 400; }}
  @font-face {{ font-family: Mono; src: url("{font('Medium')}"); font-weight: 500; }}
  * {{ margin: 0; }}
  body {{ width: 1200px; height: 630px; overflow: hidden; position: relative; background: {paper}; color: {ink}; font-family: Mono; }}
  .brand {{ position: absolute; left: 80px; top: 72px; display: flex; align-items: center; gap: 18px; font-size: 32px; font-weight: 500; }}
  .brand svg {{ display: block; width: 52px; height: 52px; }}
  h1 {{ position: absolute; left: 80px; top: 200px; width: 1040px; font-size: 96px; font-weight: 500; line-height: 1.1; letter-spacing: -0.035em; text-wrap: balance; }}
  p {{ position: absolute; left: 80px; top: 441px; color: {ink_2}; font-size: 31px; }}
  .signal {{ position: absolute; left: 0; top: 502px; width: 1200px; height: 100px; }}
  .signal path {{ fill: none; stroke: {accent}; stroke-width: 2.5; stroke-linejoin: round; vector-effect: non-scaling-stroke; }}
</style>
<div class="brand">{logo}<span>Ventris Tools</span></div>
<h1>{headline}</h1>
<p>{html.escape(tagline)}</p>
<svg class="signal" viewBox="0 0 1200 80" preserveAspectRatio="none"><path d="{signal}"/></svg>
"""

# iOS rounds the corners itself and turns transparency black, so this fills the square.
ICON_PAGE = f"""<!doctype html>
<meta charset="utf-8">
<style>* {{ margin: 0; }} body {{ width: 180px; height: 180px; overflow: hidden; background: {accent}; }} svg {{ display: block; }}</style>
<svg viewBox="2 2 28 28" width="180" height="180"><path d="{trace}" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
"""


def render(markup, width, height, output):
    with tempfile.TemporaryDirectory() as scratch:
        source = Path(scratch) / "page.html"
        source.write_text(markup, encoding="utf-8")
        subprocess.run(
            [
                CHROME,
                "--headless=new",
                "--disable-gpu",
                "--hide-scrollbars",
                "--force-device-scale-factor=1",
                f"--user-data-dir={scratch}/profile",
                f"--window-size={width},{height}",
                f"--screenshot={output}",
                source.as_uri(),
            ],
            check=True,
            capture_output=True,
        )
    print(f"Wrote {output}")


# These two pages hold everything the images are made from, so this changes when an image would.
fingerprint = hashlib.sha256((OG_PAGE + ICON_PAGE).encode()).hexdigest()
stamp = SCRIPTS / "images.sha256"

if "--check" in sys.argv:
    if stamp.read_text(encoding="utf-8").strip() != fingerprint:
        raise SystemExit("og.png or apple-touch-icon.png is out of date. Run: python3 scripts/make-images.py")
    sys.exit()

render(OG_PAGE, 1200, 630, SITE / "og.png")
render(ICON_PAGE, 180, 180, SITE / "apple-touch-icon.png")
stamp.write_text(fingerprint + "\n", encoding="utf-8")
