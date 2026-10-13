import { mkdir, readdir, readFile, rm, rmdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';
import { parseDocument } from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = resolve(process.env.TAA_CONTENT_ROOT || resolve(root, 'cms-starter'));
const postsDirectory = resolve(contentRoot, 'content/posts');
const blogDirectory = resolve(root, 'blog');
const siteName = 'The Aptitude Academy';
const markdownRenderer = new MarkdownIt({ html: false, linkify: false, typographer: false });
const renderImage = markdownRenderer.renderer.rules.image;
markdownRenderer.renderer.rules.image = (tokens, index, options, environment, renderer) => {
  tokens[index].attrSet('loading', 'lazy');
  return renderImage(tokens, index, options, environment, renderer);
};
for (const type of ['heading_open', 'heading_close']) {
  const renderHeading = markdownRenderer.renderer.rules[type];
  markdownRenderer.renderer.rules[type] = (tokens, index, options, environment, renderer) => {
    if (tokens[index].tag === 'h1') tokens[index].tag = 'h2';
    return renderHeading ? renderHeading(tokens, index, options, environment, renderer) : renderer.renderToken(tokens, index, options);
  };
}

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function parsePost(fileName, source) {
  const frontMatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!frontMatter) throw new Error(`${fileName} must start with YAML front matter bounded by --- lines.`);
  const document = parseDocument(frontMatter[1], { uniqueKeys: true });
  if (document.errors.length) throw new Error(`${fileName} has invalid YAML front matter: ${document.errors[0].message}`);
  const data = document.toJS({ maxAliasCount: 0 });
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`${fileName} must have front-matter fields.`);
  const slug = fileName.replace(/\.md$/i, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${fileName} must use a date-prefixed lowercase slug.`);
  for (const field of ['title', 'summary', 'date']) if (!data[field]) throw new Error(`${fileName} is missing required ${field}.`);
  if (data.cover && !data.cover_alt) throw new Error(`${fileName} needs an image description when it has a cover image.`);
  const mediaPaths = [];
  if (data.cover) mediaPaths.push(data.cover);
  const storedDate = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(storedDate)) throw new Error(`${fileName} needs a YYYY-MM-DD publish date.`);
  const date = new Date(`${storedDate}T12:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== storedDate) throw new Error(`${fileName} has an invalid publish date.`);
  const body = frontMatter[2].trim();
  const tokens = markdownRenderer.parse(body, {});
  for (const token of tokens) {
    for (const child of token.children || []) {
      if (child.type === 'image') {
        if (!child.content.trim()) throw new Error(`${fileName} has an article image without a description.`);
        mediaPaths.push(child.attrGet('src'));
      }
    }
  }
  for (const path of mediaPaths) {
    if (typeof path !== 'string' || !/^\/media\/uploads\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:jpe?g|png|webp|gif)$/i.test(path)) {
      throw new Error(`${fileName} has an image outside the approved media library: ${path}`);
    }
  }
  return { ...data, slug, date, body, mediaPaths };
}

function markdownToHtml(source) {
  return markdownRenderer.render(source);
}

function formatDate(date) { return new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date); }
function header(prefix = '') {
  return `<header class="sticky top-0 z-40 border-b border-line bg-white"><div class="wrap flex h-20 items-center justify-between gap-6"><a href="${prefix}/" aria-label="The Aptitude Academy home"><img src="${prefix}/assets/taa-logo.png" alt="The Aptitude Academy — Training Today. Leading Tomorrow." width="1686" height="591" class="w-48 sm:w-56"></a><nav aria-label="Main navigation" class="flex items-center gap-4 sm:gap-7"><a class="nav-link" href="${prefix}/#companies">For companies</a><a class="nav-link" href="${prefix}/#learners">For learners</a><a class="nav-link" href="${prefix}/blog/" aria-current="page">Field notes</a></nav></div></header>`;
}
function footer(prefix = '') { return `<footer class="border-t border-line bg-paper"><div class="wrap flex flex-col justify-between gap-4 py-8 text-sm text-muted sm:flex-row"><p>© 2026 ${siteName}. All rights reserved.</p><a class="text-link" href="${prefix}/">Back to the academy</a></div></footer>`; }
function pageShell({ title, description, prefix, body }) {
  return `<!doctype html><html lang="en-ZA"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="icon" href="${prefix}/assets/taa-icon.png" type="image/png"><link rel="stylesheet" href="${prefix}/output.css"></head><body>${header(prefix)}<main>${body}</main>${footer(prefix)}</body></html>`;
}

function renderIndex(posts) {
  const cards = posts.length ? posts.map(post => `<article class="blog-card"><div class="blog-card-copy"><p class="blog-card-meta"><span>${formatDate(post.date)}</span><span>${escapeHtml(post.author || siteName)}</span></p><h2><a href="/blog/${post.slug}/" class="hover:text-brand-dark">${escapeHtml(post.title)}</a></h2><p>${escapeHtml(post.summary)}</p><a class="text-link mt-5" href="/blog/${post.slug}/">Read the article <span aria-hidden="true">→</span></a></div>${post.cover ? `<a class="blog-card-media" href="/blog/${post.slug}/"><img src="${escapeHtml(post.cover)}" alt="${escapeHtml(post.cover_alt)}" loading="lazy"></a>` : ''}</article>`).join('') : `<section class="blog-empty"><p class="blog-kicker">Coming soon</p><h2 class="mt-5">The first field note is on its way.</h2><p class="mt-4 max-w-xl text-muted">This space will share useful guidance for businesses, learners and partners. Check back soon.</p><a class="text-link mt-6" href="/">Visit the academy <span aria-hidden="true">→</span></a></section>`;
  return pageShell({ title: `Field notes | ${siteName}`, description: 'Updates and practical learning insights from The Aptitude Academy.', prefix: '..', body: `<section class="blog-masthead"><div class="wrap relative z-10 py-20 md:py-28"><p class="blog-kicker">Field notes</p><h1 class="blog-title">Ideas that help people move forward.</h1><p class="blog-intro">Useful perspective for businesses, learners and the people building meaningful opportunities.</p></div></section><section class="section"><div class="wrap"><div class="blog-list">${cards}</div></div></section>` });
}

function renderPost(post) {
  const title = post.seo_title || post.title;
  const description = post.seo_description || post.summary;
  return pageShell({ title: `${title} | ${siteName}`, description, prefix: '../..', body: `<article class="wrap article-shell"><header class="article-header"><p class="blog-kicker">Field notes</p><p class="article-meta mt-6"><span>${formatDate(post.date)}</span><span>${escapeHtml(post.author || siteName)}</span></p><h1 class="article-title">${escapeHtml(post.title)}</h1><p class="article-summary">${escapeHtml(post.summary)}</p>${post.cover ? `<figure class="article-cover"><img src="${escapeHtml(post.cover)}" alt="${escapeHtml(post.cover_alt)}"></figure>` : ''}</header><div class="blog-prose">${markdownToHtml(post.body)}</div><p class="article-back"><a class="text-link" href="/blog/">← All field notes</a></p></article>` });
}

function isGeneratedSlug(value) {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

async function readPreviousSlugs() {
  try {
    const stored = JSON.parse(await readFile(resolve(blogDirectory, '.generated-posts.json'), 'utf8'));
    return Array.isArray(stored) ? stored.filter(isGeneratedSlug) : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw new Error(`Could not read the prior blog manifest: ${error.message}`);
  }
}

async function removeStaleArticle(slug) {
  // Slugs are validated before reaching this function, so the resolved path stays inside blog/.
  const articleDirectory = resolve(blogDirectory, slug);
  await rm(resolve(articleDirectory, 'index.html'), { force: true });
  try {
    const remaining = await readdir(articleDirectory);
    if (remaining.length === 0) await rmdir(articleDirectory);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function build() {
  const names = (await readdir(postsDirectory)).filter(name => extname(name).toLowerCase() === '.md');
  const posts = await Promise.all(names.map(async name => parsePost(name, await readFile(resolve(postsDirectory, name), 'utf8'))));
  for (const post of posts) {
    for (const mediaPath of post.mediaPaths) {
      const path = resolve(contentRoot, mediaPath.slice(1));
      let details;
      try { details = await stat(path); }
      catch (error) { if (error.code === 'ENOENT') throw new Error(`Missing CMS image ${mediaPath} for ${post.slug}.`); throw error; }
      if (!details.isFile()) throw new Error(`CMS image is not a file: ${mediaPath}`);
    }
  }
  const slugs = posts.map(post => post.slug);
  if (new Set(slugs).size !== slugs.length) throw new Error('Two posts have the same URL slug. Give each article a distinct title.');
  posts.sort((a, b) => b.date - a.date);
  await mkdir(blogDirectory, { recursive: true });
  const previousSlugs = await readPreviousSlugs();
  const currentSlugs = posts.map(post => post.slug);
  await Promise.all(previousSlugs.filter(slug => !currentSlugs.includes(slug)).map(removeStaleArticle));
  await writeFile(resolve(blogDirectory, 'index.html'), renderIndex(posts));
  for (const post of posts) {
    const destination = resolve(blogDirectory, post.slug, 'index.html');
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, renderPost(post));
  }
  // The manifest makes deletion/unpublishing deterministic without wiping the whole output directory.
  await writeFile(resolve(blogDirectory, '.generated-posts.json'), JSON.stringify(currentSlugs, null, 2) + '\n');
  console.log(`Built ${posts.length} blog post${posts.length === 1 ? '' : 's'}.`);
}

build().catch(error => { console.error(`Blog build failed: ${error.message}`); process.exitCode = 1; });
