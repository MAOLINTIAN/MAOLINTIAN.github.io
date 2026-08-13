import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const username = 'sinat_33087001'
const root = fileURLToPath(new URL('..', import.meta.url))
const run = promisify(execFile)
const postDir = join(root, 'public', 'posts')
const imageDir = join(postDir, 'assets')
const indexFile = join(root, 'src', 'csdn-posts.ts')
const cacheFile = join(root, 'content', 'csdn-index.json')
const listCacheFile = join(root, 'content', 'csdn-list.json')
const reportFile = join(root, 'import-report.json')
const headers = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36', referer: `https://blog.csdn.net/${username}` }
const retryOnly = process.argv.includes('--retry')

await Promise.all([mkdir(postDir, { recursive: true }), mkdir(imageDir, { recursive: true }), mkdir(join(root, 'content'), { recursive: true })])

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const cleanText = (value = '') => decode(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
const decode = (value = '') => value
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))

async function fetchBuffer(url, attempts = 3) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const script = `$ProgressPreference='SilentlyContinue'; $response=Invoke-WebRequest -UseBasicParsing -Uri '${url.replace(/'/g, "''")}' -Headers @{'User-Agent'='${headers['user-agent'].replace(/'/g, "''")}';'Referer'='${headers.referer.replace(/'/g, "''")}'} -TimeoutSec 25; $response.RawContentStream.CopyTo([Console]::OpenStandardOutput())`
      const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'buffer', maxBuffer: 80 * 1024 * 1024, timeout: 30_000 })
      return stdout
    } catch (error) {
      lastError = error
      await sleep(750 * attempt)
    }
  }
  throw lastError
}

async function fetchText(url) {
  const text = (await fetchBuffer(url)).toString('utf8')
  if (/请进行安全验证|Security Verification/.test(text)) throw new Error('CSDN security verification')
  return text
}

async function fetchFallbackArticle(url) {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`https://www.helloworld.net/getUrlHtml?url=${encodeURIComponent(url)}`, {
        headers: { 'user-agent': headers['user-agent'] },
        signal: AbortSignal.timeout(12_000),
      })
      if (!response.ok) throw new Error(`fallback HTTP ${response.status}`)
      const data = await response.json()
      if (data.code !== 1 || !data.html) throw new Error('fallback article missing')
      return { html: data.html, title: data.title || '' }
    } catch (error) {
      lastError = error
      await sleep(1_000 * attempt)
    }
  }
  throw lastError
}

async function fetchDirect(url, attempts = 2) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': headers['user-agent'], referer: headers.referer },
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return Buffer.from(await response.arrayBuffer())
    } catch (error) {
      lastError = error
      await sleep(500 * attempt)
    }
  }
  throw lastError
}

function extractBalancedDiv(html, id) {
  const start = html.search(new RegExp(`<div[^>]+id=["']${id}["'][^>]*>`, 'i'))
  if (start < 0) return ''
  const openEnd = html.indexOf('>', start) + 1
  const tags = /<\/?div\b[^>]*>/gi
  tags.lastIndex = openEnd
  let depth = 1
  let match
  while ((match = tags.exec(html))) {
    depth += /^<\//.test(match[0]) ? -1 : 1
    if (depth === 0) return html.slice(openEnd, match.index)
  }
  return ''
}

function parseList(html) {
  const total = Number(html.match(/id="container-header-blog"[^>]*data-num="(\d+)"/)?.[1] || 0)
  const items = []
  const blocks = html.split(/<div class="article-item-box[^>]*data-articleid="/).slice(1)
  for (const block of blocks) {
    const id = Number(block.match(/^(\d+)"/)?.[1])
    const title = cleanText(block.match(/<h4[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1]).replace(/^(原创|转载|翻译)\s*/, '')
    const excerpt = cleanText(block.match(/<p class="content">([\s\S]*?)<\/p>/)?.[1]).replace(/^摘要：\s*/, '')
    const date = block.match(/<span class="date">\s*([\d-]{10})/)?.[1]
    if (id && title && date) items.push({ id, title, excerpt, date })
  }
  return { total, items }
}

function sanitizeBody(body) {
  return body
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<(iframe|object|embed)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|form|input|button)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|input)\b[^>]*\/?\s*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/\scontenteditable\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/href=("|')javascript:[\s\S]*?\1/gi, 'href="#"')
    .replace(/<a\b(?![^>]*\brel=)/gi, '<a rel="noopener noreferrer"')
}

function meta(html, name) {
  return decode(html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)`, 'i'))?.[1] || '')
}

function inferCategory(title, fallback) {
  if (fallback) return fallback
  const bracket = title.match(/【([^】]+)】/)?.[1]
  return bracket?.split(/[ 一二三四五六七八九十]/)[0] || '技术随笔'
}

function extension(url, contentType = '') {
  const suffix = extname(new URL(url).pathname).toLowerCase()
  if (/^\.(png|jpe?g|gif|webp|svg)$/.test(suffix)) return suffix === '.jpeg' ? '.jpg' : suffix
  if (contentType.includes('png')) return '.png'
  if (contentType.includes('gif')) return '.gif'
  if (contentType.includes('webp')) return '.webp'
  if (contentType.includes('svg')) return '.svg'
  return '.jpg'
}

async function localizeImages(body, articleId, imageFailures) {
  const urls = [...body.matchAll(/<img\b[^>]*(?:src|data-src|data-original)=("|')([^"']+)\1[^>]*>/gi)]
    .map((match) => decode(match[2])).filter((url) => /^https?:\/\//.test(url))
  const replacements = new Map()
  await mapLimit([...new Set(urls)].map((url, index) => ({ url, index })), 3, async ({ url, index }) => {
    try {
      const bytes = retryOnly ? await fetchDirect(url) : await fetchBuffer(url, 2)
      if (!bytes.length) throw new Error('empty image')
      const hash = createHash('sha1').update(url).digest('hex').slice(0, 10)
      const name = `${articleId}-${String(index + 1).padStart(2, '0')}-${hash}${extension(url)}`
      await writeFile(join(imageDir, name), bytes)
      replacements.set(url, `./posts/assets/${name}`)
    } catch (error) {
      imageFailures.push({ articleId, url, error: String(error) })
    }
  })
  for (const [url, local] of replacements) body = body.split(url).join(local)
  body = body.replace(/<img\b([^>]*)>/gi, (tag, attrs) => {
    const source = attrs.match(/(?:src|data-src|data-original)=("|')([^"']+)\1/i)?.[2]
    const cleanAttrs = attrs.replace(/\s(?:data-src|data-original)=("|')[^"']+\1/gi, '').replace(/\ssrc=("|')[^"']+\1/i, '').replace(/\s*\/\s*$/, '')
    return source ? `<img${cleanAttrs} src="${source}" loading="lazy">` : tag
  })
  return { body, cover: replacements.values().next().value || '' }
}

async function loadExisting() {
  if (!existsSync(cacheFile)) return new Map()
  return new Map(JSON.parse(await readFile(cacheFile, 'utf8')).map((post) => [post.id, { ...post, title: post.title.replace(/^(原创|转载|翻译)\s*/, '') }]))
}

function recoverLocalPosts(existing, listed) {
  for (const listedPost of listed) {
    if (existing.has(listedPost.id) || !existsSync(join(postDir, `${listedPost.id}.html`))) continue
    existing.set(listedPost.id, {
      ...listedPost,
      title: listedPost.title.replace(/^(原创|转载|翻译)\s*/, ''),
      category: inferCategory(listedPost.title, ''),
      cover: './img/cover-data-color.webp',
      tags: [inferCategory(listedPost.title, '')],
      readTime: '1 min',
      contentPath: `./posts/${listedPost.id}.html`,
      sourceUrl: `https://blog.csdn.net/${username}/article/details/${listedPost.id}`,
    })
  }
}

async function mapLimit(items, limit, worker) {
  let cursor = 0
  const runners = Array.from({ length: limit }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++]
      await worker(item)
    }
  })
  await Promise.all(runners)
}

const cachedList = existsSync(listCacheFile) ? JSON.parse(await readFile(listCacheFile, 'utf8')) : []
const first = cachedList.length ? { total: cachedList.length, items: [] } : parseList(await fetchText(`https://blog.csdn.net/${username}/article/list/1?type=blog`))
const expected = first.total
const pages = Math.ceil(expected / 40) + 2
const articleMap = new Map([...cachedList, ...first.items].map((post) => [post.id, { ...post, title: post.title.replace(/^(原创|转载|翻译)\s*/, '') }]))
console.log(`CSDN declares ${expected} articles across about ${pages - 2} pages; cached ${articleMap.size}`)

for (let page = 2; page <= pages && articleMap.size < expected; page += 1) {
  const parsed = parseList(await fetchText(`https://blog.csdn.net/${username}/article/list/${page}?type=blog`))
  for (const post of parsed.items) articleMap.set(post.id, post)
  await writeFile(listCacheFile, JSON.stringify([...articleMap.values()], null, 2), 'utf8')
  console.log(`list ${page}/${pages}: ${articleMap.size}/${expected}`)
  await sleep(650)
}

const listed = [...articleMap.values()]
if (listed.length !== expected) throw new Error(`Article list mismatch: expected ${expected}, found ${listed.length}`)

const existing = await loadExisting()
recoverLocalPosts(existing, listed)
await writeFile(cacheFile, JSON.stringify([...existing.values()], null, 2), 'utf8')
const articleFailures = []
const imageFailures = []
let cacheWrite = Promise.resolve()
let completed = 0
const pending = retryOnly ? listed.filter((post) => !existing.has(post.id) || !existsSync(join(postDir, `${post.id}.html`))) : listed
console.log(`processing ${pending.length} pending articles with concurrency ${retryOnly ? 3 : 8}`)
await mapLimit(pending, retryOnly ? 3 : 8, async (listedPost) => {
  const target = join(postDir, `${listedPost.id}.html`)
  if (existing.has(listedPost.id) && existsSync(target)) {
    completed += 1
    if (completed % 25 === 0) console.log(`articles ${completed}/${expected} (cached)`)
    return
  }
  try {
    const url = `https://blog.csdn.net/${username}/article/details/${listedPost.id}`
    let html = ''
    let body = ''
    if (retryOnly) {
      try {
        const fallback = await fetchFallbackArticle(url)
        html = fallback.html
        body = extractBalancedDiv(html, 'article_content') || html
      } catch {
        html = await fetchText(url)
        body = extractBalancedDiv(html, 'content_views')
      }
    } else {
      try {
        html = await fetchText(url)
        body = extractBalancedDiv(html, 'content_views')
      } catch {
        const fallback = await fetchFallbackArticle(url)
        html = fallback.html
        body = extractBalancedDiv(html, 'article_content') || html
      }
    }
    if (!body || body.length < 80) throw new Error('article body missing or preview-only')
    body = sanitizeBody(body)
    const localized = retryOnly ? { body, cover: '' } : await localizeImages(body, listedPost.id, imageFailures)
    body = localized.body
    const tags = meta(html, 'keywords').split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 12)
    const column = cleanText(html.match(/<span class="badge-name">([\s\S]*?)<\/span>/)?.[1])
    const textLength = cleanText(body).length
    const post = {
      ...listedPost,
      excerpt: listedPost.excerpt || meta(html, 'description').replace(/^文章浏览阅读\d+次[^。]*。/, '').slice(0, 180),
      category: inferCategory(listedPost.title, column),
      cover: localized.cover || './img/cover-data-color.webp',
      tags: tags.length ? tags : [inferCategory(listedPost.title, column)],
      readTime: `${Math.max(1, Math.ceil(textLength / 350))} min`,
      contentPath: `./posts/${listedPost.id}.html`,
      sourceUrl: url,
    }
    existing.set(post.id, post)
    await writeFile(target, body, 'utf8')
    cacheWrite = cacheWrite.then(() => writeFile(cacheFile, JSON.stringify([...existing.values()], null, 2), 'utf8'))
    await cacheWrite
  } catch (error) {
    articleFailures.push({ articleId: listedPost.id, url: `https://blog.csdn.net/${username}/article/details/${listedPost.id}`, error: String(error) })
  }
  completed += 1
  if (completed % 10 === 0) console.log(`articles ${completed}/${expected}, article failures ${articleFailures.length}, image failures ${imageFailures.length}`)
  await sleep(retryOnly ? 180 : 120)
})

const posts = [...existing.values()].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
const ts = `import type { Post } from './data'\n\nexport const csdnPosts: Post[] = ${JSON.stringify(posts, null, 2)}\n`
await writeFile(indexFile, ts, 'utf8')
const bodyFiles = posts.filter((post) => existsSync(join(postDir, `${post.id}.html`))).length
const report = { expected, listed: listed.length, imported: posts.length, bodyFiles, articleFailures, imageFailures, finishedAt: new Date().toISOString() }
await writeFile(reportFile, JSON.stringify(report, null, 2), 'utf8')
console.log(JSON.stringify({ expected, listed: listed.length, imported: posts.length, bodyFiles, articleFailures: articleFailures.length, imageFailures: imageFailures.length }))
if (posts.length !== expected || bodyFiles !== expected || articleFailures.length) process.exitCode = 1
