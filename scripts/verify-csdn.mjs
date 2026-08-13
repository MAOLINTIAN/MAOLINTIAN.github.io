import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const list = JSON.parse(await readFile(join(root, 'content', 'csdn-list.json'), 'utf8'))
const index = JSON.parse(await readFile(join(root, 'content', 'csdn-index.json'), 'utf8'))
const postDir = join(root, 'public', 'posts')
const bodyFiles = (await readdir(postDir)).filter((file) => file.endsWith('.html'))
const assetFiles = await readdir(join(postDir, 'assets'))
const bodyIds = new Set(bodyFiles.map((file) => Number(file.slice(0, -5))))
const indexIds = new Set(index.map((post) => post.id))
let scripts = 0
let eventHandlers = 0
let brokenLocalImages = 0
let externalImages = 0
let malformedImages = 0
let links = 0
let embeds = 0
let replacementCharacters = 0

for (const file of bodyFiles) {
  const body = await readFile(join(postDir, file), 'utf8')
  if (/<script\b/i.test(body)) scripts += 1
  if (/\son\w+\s*=/i.test(body)) eventHandlers += 1
  if (/<img\b[^>]*\s\/\s+src=/i.test(body)) malformedImages += 1
  if (/<link\b/i.test(body)) links += 1
  if (/<(?:iframe|object|embed)\b/i.test(body)) embeds += 1
  replacementCharacters += (body.match(/\uFFFD/g) || []).length
  for (const match of body.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)/gi)) {
    const source = match[1]
    if (/^https?:/.test(source)) externalImages += 1
    if (source.startsWith('./posts/assets/') && !existsSync(join(root, 'public', source.slice(2)))) brokenLocalImages += 1
  }
}

const result = {
  listed: list.length,
  indexed: index.length,
  bodies: bodyFiles.length,
  assets: assetFiles.length,
  missingIndex: list.filter((post) => !indexIds.has(post.id)).length,
  missingBody: list.filter((post) => !bodyIds.has(post.id)).length,
  scripts,
  eventHandlers,
  brokenLocalImages,
  externalImages,
  malformedImages,
  links,
  embeds,
  replacementCharacters,
}
console.log(JSON.stringify(result, null, 2))
if (result.listed !== result.indexed || result.indexed !== result.bodies || result.missingIndex || result.missingBody || scripts || eventHandlers || brokenLocalImages || externalImages || malformedImages || links || embeds || replacementCharacters) process.exitCode = 1
