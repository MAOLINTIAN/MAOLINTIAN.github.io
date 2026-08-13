import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const postDir = join(root, 'public', 'posts')
const list = JSON.parse(await readFile(join(root, 'content', 'csdn-list.json'), 'utf8'))
const cached = JSON.parse(await readFile(join(root, 'content', 'csdn-index.json'), 'utf8'))
const posts = new Map(cached.map((post) => [post.id, post]))

for (const item of list) {
  if (posts.has(item.id) || !existsSync(join(postDir, `${item.id}.html`))) continue
  const title = item.title.replace(/^(原创|转载|翻译)\s*/, '')
  const category = title.match(/【([^】]+)】/)?.[1]?.replace(/[零一二三四五六七八九十\d]+$/, '').trim() || '技术随笔'
  const text = (await readFile(join(postDir, `${item.id}.html`), 'utf8')).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  posts.set(item.id, {
    ...item,
    title,
    category,
    cover: './img/cover-data-color.webp',
    tags: [category],
    readTime: `${Math.max(1, Math.ceil(text.length / 350))} min`,
    contentPath: `./posts/${item.id}.html`,
    sourceUrl: `https://blog.csdn.net/sinat_33087001/article/details/${item.id}`,
  })
}

const imported = [...posts.values()]
  .filter((post) => existsSync(join(postDir, `${post.id}.html`)))
  .map((post) => ({
    ...post,
    title: post.title.replace(/^(原创|转载|翻译)\s*/, ''),
    cover: post.cover.startsWith('/img/') ? `.${post.cover}` : post.cover,
  }))
  .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)

await writeFile(join(root, 'content', 'csdn-index.json'), JSON.stringify(imported, null, 2), 'utf8')
await writeFile(join(root, 'src', 'csdn-posts.ts'), `import type { Post } from './data'\n\nexport const csdnPosts: Post[] = ${JSON.stringify(imported, null, 2)}\n`, 'utf8')
console.log(`Generated site index for ${imported.length}/${list.length} downloaded articles`)
