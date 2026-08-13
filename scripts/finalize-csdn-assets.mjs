import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const postDir = join(root, 'public', 'posts')
const assetDir = join(postDir, 'assets')
await mkdir(assetDir, { recursive: true })
const failures = []
let localized = 0

const extension = (url, contentType = '') => {
  try {
    const suffix = extname(new URL(url).pathname).toLowerCase()
    if (/^\.(png|jpe?g|gif|webp|svg)$/.test(suffix)) return suffix === '.jpeg' ? '.jpg' : suffix
  } catch {}
  if (contentType.includes('png')) return '.png'
  if (contentType.includes('gif')) return '.gif'
  if (contentType.includes('webp')) return '.webp'
  if (contentType.includes('svg')) return '.svg'
  return '.jpg'
}

async function mapLimit(items, limit, worker) {
  let cursor = 0
  await Promise.all(Array.from({ length: limit }, async () => {
    while (cursor < items.length) await worker(items[cursor++])
  }))
}

for (const file of (await readdir(postDir)).filter((name) => name.endsWith('.html'))) {
  let body = await readFile(join(postDir, file), 'utf8')
  body = body
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<(iframe|object|embed)\b[\s\S]*?<\/\1>/gi, '')
  const articleId = file.slice(0, -5)
  const urls = [...new Set([...body.matchAll(/<img\b[^>]*\bsrc=["'](https?:[^"']+)/gi)].map((match) => match[1].replace(/&amp;/g, '&')))]
  const replacements = new Map()
  await mapLimit(urls, 4, async (url) => {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0', referer: 'https://blog.csdn.net/' }, signal: AbortSignal.timeout(20_000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const bytes = Buffer.from(await response.arrayBuffer())
      if (!bytes.length) throw new Error('empty image')
      const name = `${articleId}-ext-${createHash('sha1').update(url).digest('hex').slice(0, 12)}${extension(url, response.headers.get('content-type') || '')}`
      if (!existsSync(join(assetDir, name))) await writeFile(join(assetDir, name), bytes)
      replacements.set(url, `./posts/assets/${name}`)
      localized += 1
    } catch (error) {
      failures.push({ articleId, url, error: String(error) })
    }
  })
  for (const [url, local] of replacements) {
    body = body.split(url).join(local).split(url.replace(/&/g, '&amp;')).join(local)
  }
  body = body
    .replace(/<img\b([^>]*?)\s*\/\s+(?=src=)/gi, '<img$1 ')
    .replace(/<img\b([^>]*)>/gi, (_, attrs) => `<img${attrs.replace(/\s*\/\s*$/, '')}>`)
    .split(/\r?\n/)
    .map((line) => line.replace(/ +\t/g, '\t').trimEnd())
    .join('\n')
    .trim()
    .concat('\n')
  await writeFile(join(postDir, file), body, 'utf8')
}

console.log(JSON.stringify({ localized, failures: failures.length }))
if (failures.length) {
  await writeFile(join(root, 'image-finalize-failures.json'), JSON.stringify(failures, null, 2), 'utf8')
  process.exitCode = 1
}
