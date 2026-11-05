// Check every link on the live site, including the ones that leave it. This is separate from
// `npm run check`, so another site being down can never block a deploy.

const site = "https://ventris-tools.github.io";
const pages = ["/", "/404.html"];
const attempts = 3;
const waitBetweenAttempts = 20_000;
const headers = { "User-Agent": "ventris-tools-link-check (+https://github.com/ventris-tools/ventris-tools.github.io)" };

function get(url) {
  return fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
}

function linksIn(html, page) {
  const matches = html.matchAll(/(?:href|src)="([^"]+)"|content="(https:[^"]+)"/g);
  return [...matches].map(([, link, content]) => new URL(link ?? content, page).href);
}

// Other sites have bad moments, so a link only counts as broken if it keeps failing.
async function problemWith(url) {
  let problem;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await get(url);
      await response.body?.cancel();
      if (response.ok) return null;
      problem = `returned ${response.status}`;
    } catch (error) {
      problem = error.cause?.code ?? error.message;
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, waitBetweenAttempts));
  }
  return problem;
}

const links = new Set();
for (const path of pages) {
  const page = new URL(path, site).href;
  const response = await get(page);
  if (!response.ok) throw new Error(`${page} returned ${response.status}`);
  for (const link of linksIn(await response.text(), page)) links.add(link);
}

let broken = 0;
for (const link of links) {
  const problem = await problemWith(link);
  if (problem) broken++;
  console.log(problem ? `BROKEN ${link} ${problem}` : `ok ${link}`);
}

console.log(`${links.size} links checked, ${broken} broken`);
if (broken) process.exitCode = 1;
