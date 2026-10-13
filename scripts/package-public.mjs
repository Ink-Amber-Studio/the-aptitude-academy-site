import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = resolve(process.env.TAA_CONTENT_ROOT || resolve(root, 'cms-starter'));
const outputRoot = resolve(root, 'output');
const stamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
const publicRoot = resolve(outputRoot, `public-${stamp}-${process.pid}`);
const domain = 'https://www.theaptitudeacademy.co.za';
const releaseMode = process.argv.includes('--release=launch') ? 'launch' : 'review';
const publicRobots = releaseMode === 'launch'
  ? 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
  : 'noindex, nofollow';

if (dirname(publicRoot) !== outputRoot || !publicRoot.startsWith(root + sep)) {
  throw new Error('The public output directory must remain inside this project.');
}

async function copy(relativeSource, relativeDestination = relativeSource, sourceRoot = root) {
  const destination = resolve(publicRoot, relativeDestination);
  if (!destination.startsWith(publicRoot + sep)) throw new Error(`Unsafe output path: ${relativeDestination}`);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(sourceRoot, relativeSource), destination);
}

async function copyPublicHtml(relativeSource, relativeDestination = relativeSource, sourceRoot = root, robots = publicRobots) {
  const destination = resolve(publicRoot, relativeDestination);
  if (!destination.startsWith(publicRoot + sep)) throw new Error(`Unsafe output path: ${relativeDestination}`);
  await mkdir(dirname(destination), { recursive: true });
  const source = await readFile(resolve(sourceRoot, relativeSource), 'utf8');
  if (!/<meta name="robots" content="[^"]+">/.test(source)) throw new Error(`Missing robots meta tag in ${relativeSource}`);
  const html = source.replace(/<meta name="robots" content="[^"]+">/, `<meta name="robots" content="${robots}">`);
  await writeFile(destination, html);
}

async function writeSeoFiles(slugs) {
  const robots = releaseMode === 'launch'
    ? `User-agent: *\nDisallow: /admin/\n\nSitemap: ${domain}/sitemap.xml\n`
    : `User-agent: *\nDisallow: /\n\n# Review package only — do not index or share as a production launch.\n`;
  const urls = [domain + '/', ...(slugs.length ? [domain + '/blog/'] : []), ...slugs.map(slug => `${domain}/blog/${slug}/`)];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`;
  await writeFile(resolve(publicRoot, 'robots.txt'), robots);
  await writeFile(resolve(publicRoot, 'sitemap.xml'), sitemap);
  await copy('llms.txt');
}

async function copyMedia() {
  const directory = resolve(contentRoot, 'media/uploads');
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return 0; throw error; }
  let count = 0;
  for (const entry of entries) {
    if (entry.name === '.gitkeep' && entry.isFile()) continue;
    if (!entry.isFile() || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(entry.name)) throw new Error(`Unsupported media entry: ${entry.name}`);
    const extension = extname(entry.name).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) throw new Error(`Unsupported media type: ${entry.name}`);
    const path = resolve(directory, entry.name);
    const details = await stat(path);
    if (details.size === 0 || details.size > 8 * 1024 * 1024) throw new Error(`Media must be 1 byte–8 MB: ${entry.name}`);
    const bytes = await readFile(path);
    const valid = extension === '.png' ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
      : ['.jpg', '.jpeg'].includes(extension) ? bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))
      : extension === '.webp' ? bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
      : ['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6));
    if (!valid) throw new Error(`Media file does not match its image extension: ${entry.name}`);
    await copy(`media/uploads/${entry.name}`, `media/uploads/${entry.name}`, contentRoot);
    count += 1;
  }
  return count;
}

async function buildPackage() {
  await mkdir(outputRoot, { recursive: true });
  await mkdir(publicRoot);

  await copyPublicHtml('index.html');
  await copy('output.css');
  for (const file of [
    'taa-logo.png', 'taa-icon.png', 'new-opportunities.webp', 'learning-together.webp',
    'learning-montage.webp', 'learner-group.webp', 'cabin-latin-400-normal.woff2',
    'cabin-latin-600-normal.woff2', 'cabin-latin-700-normal.woff2', 'Cabin-LICENSE.txt', 'og-image.png',
  ]) await copy(`assets/${file}`);
  for (const file of ['site.js', 'hero-grid.js', 'motion.js', 'motion-boot.js', 'vendor/gsap.min.js', 'vendor/ScrollTrigger.min.js', 'vendor/NOTICE.txt']) {
    await copy(`js/${file}`);
  }

  const slugs = JSON.parse(await readFile(resolve(root, 'blog/.generated-posts.json'), 'utf8'));
  if (!Array.isArray(slugs) || slugs.some(slug => typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) {
    throw new Error('The generated blog manifest contains an invalid article path.');
  }
  await copyPublicHtml('blog/index.html', 'blog/index.html', root, slugs.length ? publicRobots : 'noindex, nofollow');
  for (const slug of slugs) await copyPublicHtml(`blog/${slug}/index.html`);

  await writeSeoFiles(slugs);

  for (const file of ['index.html', 'preview.js', 'preview.css', 'workspace.css', 'help/index.html']) {
    await copy(`cms-starter/admin/${file}`, `admin/${file}`);
  }
  const config = parse(await readFile(resolve(root, 'cms-starter/admin/config.yml'), 'utf8'));
  config.backend = {
    name: 'github',
    repo: 'Ink-Amber-Studio/the-aptitude-academy-content',
    branch: 'main',
    base_url: 'https://taa-decap-auth.keethan.workers.dev',
    auth_endpoint: 'auth',
    site_domain: 'www.theaptitudeacademy.co.za',
    auth_scope: 'repo',
  };
  config.site_url = domain;
  config.display_url = domain;
  await writeFile(resolve(publicRoot, 'admin/config.yml'), '# Generated public CMS configuration. No credentials are stored here.\n' + stringify(config));
  const mediaCount = await copyMedia();
  await writeFile(resolve(outputRoot, 'latest-public.txt'), publicRoot + '\n');
  console.log(`Packaged the ${releaseMode} allowlist in ${publicRoot}: ${slugs.length} article(s), ${mediaCount} media file(s). No deployment was made.`);
}

buildPackage().catch(error => { console.error(`Public package failed: ${error.message}`); process.exitCode = 1; });
