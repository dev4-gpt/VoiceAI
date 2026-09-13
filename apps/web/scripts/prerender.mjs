/**
 * Writes prerendered HTML into dist/product and dist/pricing so crawlers that do
 * not run JavaScript see the content. Runs after `vite build` and the SSR build.
 * Any failure exits non-zero, which fails the deploy instead of shipping an empty page.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const webRoot = fileURLToPath(new URL('..', import.meta.url));
const { render, renderHead } = await import(pathToFileURL(`${webRoot}dist-ssr/entry-server.js`).href);

for (const page of ['product', 'pricing']) {
  const file = `${webRoot}dist/${page}/index.html`;
  const template = await readFile(file, 'utf8');
  if (!template.includes('<!--app-html-->') || !template.includes('<!--app-head-->')) {
    console.error(`prerender: placeholder missing in ${file}`);
    process.exit(1);
  }
  // Function replacers: rendered prices contain "$", which string replacements treat as patterns.
  const html = template
    .replace('<!--app-head-->', () => renderHead(page))
    .replace('<!--app-html-->', () => render(page));
  await writeFile(file, html);
  console.log(`prerender: ${page} -> ${html.length} bytes`);
}
