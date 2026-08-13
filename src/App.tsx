import { type CSSProperties, type PointerEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import {
  ArrowUpRight, BookOpen, CalendarDays, Cloud, Code2,
  Cpu, Home, Layers3, Mail, Network,
  Search, ShieldCheck, Sparkles, Tags, UserRound, Workflow,
} from 'lucide-react'
import { categories, posts, tags, type Post } from './data'

gsap.registerPlugin(useGSAP)

type View = 'home' | 'articles' | 'categories' | 'archive' | 'tags' | 'about'

const nav: { id: View; label: string; icon: typeof Home }[] = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'articles', label: '文章', icon: BookOpen },
  { id: 'categories', label: '专栏', icon: Layers3 },
  { id: 'archive', label: '时间轴', icon: CalendarDays },
  { id: 'tags', label: '关键词', icon: Tags },
  { id: 'about', label: '关于', icon: UserRound },
]

const archiveGroups = Object.entries(posts.reduce<Record<string, Post[]>>((groups, post) => {
  const month = post.date.slice(0, 7)
  ;(groups[month] ??= []).push(post)
  return groups
}, {})).sort(([left], [right]) => right.localeCompare(left))

const archiveYears = Array.from(new Set(posts.map((post) => post.date.slice(0, 4)))).sort().reverse()

const monthFormatter = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' })

function LiquidCard({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const handlePointer = (event: PointerEvent<HTMLElement>) => {
    const card = event.currentTarget
    const rect = card.getBoundingClientRect()
    card.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`)
    card.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`)
    card.style.setProperty('--rx', `${((event.clientY - rect.top) / rect.height - 0.5) * -1.2}deg`)
    card.style.setProperty('--ry', `${((event.clientX - rect.left) / rect.width - 0.5) * 1.2}deg`)
  }
  const resetPointer = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty('--rx', '0deg')
    event.currentTarget.style.setProperty('--ry', '0deg')
  }
  const Tag = onClick ? 'button' : 'article'
  return (
    <Tag data-card className={`liquid-card ${className}`} onClick={onClick} onPointerMove={handlePointer} onPointerLeave={resetPointer}>
      {children}
    </Tag>
  )
}

function PostCard({ post, featured = false, openPost }: { post: Post; featured?: boolean; openPost: (post: Post) => void }) {
  return (
    <LiquidCard className={`post-card ${featured ? 'featured' : ''}`} onClick={() => openPost(post)}>
      <img src={post.cover} alt={`${post.title} 文章封面`} width="960" height="540" loading={featured ? 'eager' : 'lazy'} />
      <div className="post-shade" />
      <div className="post-content">
        <div className="post-meta"><span>{post.category}</span><time>{post.date}</time><span>{post.readTime}</span></div>
        <h2>{post.title}</h2>
        <p>{post.excerpt}</p>
        <div className="post-tags">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      </div>
      <ArrowUpRight className="card-arrow" aria-hidden="true" />
    </LiquidCard>
  )
}

const newestPosts = [...posts].sort((left, right) => right.date.localeCompare(left.date))

function HomeView({ openPost, openTag }: { openPost: (post: Post) => void; openTag: (tag: string) => void }) {
  const featured = newestPosts[0]
  const supporting = newestPosts.slice(1, 3)
  return (
    <section className="journal-home" aria-label="博客首页">
      <header className="journal-masthead" data-card>
        <div className="journal-name"><span>MAOLIN</span><strong>技术笔记与工程实践</strong></div>
        <p>记录前端、AI、系统工程与云原生实践中的问题、判断和取舍。</p>
        <div className="journal-edition"><span>更新于 2026.08</span><span>{posts.length} 篇文章</span></div>
      </header>

      <section className="journal-front" aria-label="本期推荐">
        <article className="journal-lead" data-card>
          <button className="journal-lead-cover" onClick={() => openPost(featured)} aria-label={`阅读推荐文章：${featured.title}`}>
            <img src={featured.cover} alt={`${featured.title} 文章封面`} width="1440" height="900" />
          </button>
          <div className="journal-lead-copy">
            <div className="journal-meta"><span>本期推荐</span><time>{featured.date}</time><span>{featured.readTime}</span></div>
            <button className="journal-story-link" onClick={() => openPost(featured)}><h1>{featured.title}</h1><ArrowUpRight /></button>
            <p>{featured.excerpt}</p>
            <div className="journal-tags">{featured.tags.map((tag) => <button key={tag} onClick={() => openTag(tag)}>#{tag}</button>)}</div>
          </div>
        </article>

        <div className="journal-supporting">
          {supporting.map((post, index) => (
            <article data-card key={post.id}>
              <button className="journal-support-cover" onClick={() => openPost(post)} aria-label={`阅读文章：${post.title}`}>
                <img src={post.cover} alt={`${post.title} 文章封面`} width="720" height="460" loading="lazy" />
              </button>
              <div className="journal-support-copy">
                <div className="journal-meta"><span>{post.category}</span><time>{post.date}</time></div>
                <button className="journal-story-link" onClick={() => openPost(post)}><h2>{post.title}</h2><span>{String(index + 1).padStart(2, '0')}</span></button>
              </div>
            </article>
          ))}
        </div>
      </section>

    </section>
  )
}

function PostView({ post, setView }: { post: Post; setView: (view: View) => void }) {
  const [content, setContent] = useState<string | null>(null)
  const [contentError, setContentError] = useState(false)

  useEffect(() => {
    let active = true
    setContent(null)
    setContentError(false)
    if (!post.contentPath) return () => { active = false }
    fetch(post.contentPath)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.text()
      })
      .then((html) => { if (active) setContent(html) })
      .catch(() => { if (active) setContentError(true) })
    return () => { active = false }
  }, [post])

  return (
    <article className="post-detail">
      <button className="post-back" onClick={() => setView('articles')}>← 返回文章列表</button>
      <header className="post-detail-head">
        <div className="post-detail-meta"><span>{post.category}</span><time>{post.date}</time><span>{post.readTime}</span></div>
        <h1>{post.title}</h1>
        <p>{post.excerpt}</p>
      </header>
      <img className="post-detail-cover" src={post.cover} alt={`${post.title} 文章封面`} width="1440" height="810" />
      <section className="post-detail-body">
        {post.contentPath && content === null && !contentError && <p className="post-loading">正文加载中…</p>}
        {content && <div className="csdn-content" dangerouslySetInnerHTML={{ __html: content }} />}
        {contentError && <p className="post-load-error">正文加载失败，请刷新页面重试。</p>}
        {!post.contentPath && <><p>{post.excerpt}</p><h2>从问题本身开始</h2><p>这篇文章仍是站点的设计示例，正式内容会围绕问题背景、实现过程与最终取舍展开。</p></>}
        <div className="post-detail-tags">{post.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
        {post.sourceUrl && <p className="post-source">原始发布于 <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer">CSDN <ArrowUpRight /></a></p>}
      </section>
    </article>
  )
}

function ArticlesView({ query, selectedTag, clearTag, openPost }: { query: string; selectedTag: string | null; clearTag: () => void; openPost: (post: Post) => void }) {
  const filtered = posts.filter((post) =>
    (!selectedTag || post.tags.includes(selectedTag))
    && `${post.title}${post.excerpt}${post.tags.join('')}`.toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <>
      <PageHead label={selectedTag ? '关键词文章' : '文章'} title={selectedTag ? `#${selectedTag} 相关文章` : '沿着问题阅读，而不是沿着时间。'} copy={`${filtered.length} 篇文章，覆盖设计、工程与系统实践。`} />
      {selectedTag && <div className="article-filter"><span>当前关键词 <b>#{selectedTag}</b></span><button onClick={clearTag}>查看全部文章</button></div>}
      <section className="article-grid">{filtered.map((post, index) => <PostCard key={post.id} post={post} featured={index === 0} openPost={openPost} />)}</section>
    </>
  )
}

function CategoriesView() {
  const icons = [Code2, Cpu, ShieldCheck, Cloud, Workflow, Network, Sparkles, Layers3]
  const [active, setActive] = useState('')
  return (
    <>
      <PageHead label="专栏" title="持续研究，而不是临时分类。" copy="每个专栏围绕一个长期问题生长，点击卡片展开其中的文章线索。" />
      <section className="category-grid">
        {categories.map((category, index) => {
          const Icon = icons[index % icons.length]
          const isActive = active === category.name
          return <LiquidCard key={category.name} className={`category-card ${isActive ? 'active' : ''}`} onClick={() => setActive(category.name)}>
            <img src={category.posts[0].cover} alt="" width="640" height="360" loading="lazy" />
            <span className="category-index">COL {String(index + 1).padStart(2, '0')}</span>
            <Icon />
            <span>{category.posts.length} 篇文章</span>
            <h2>{category.name}</h2>
            <div className="category-preview">
              {category.posts.slice(0, 3).map((post) => <p key={post.id}>{post.title}<ArrowUpRight /></p>)}
            </div>
          </LiquidCard>
        })}
      </section>
    </>
  )
}

function TagsView({ openTag }: { openTag: (tag: string) => void }) {
  return (
    <>
      <PageHead label="关键词" title="关键词不是终点，它们是入口。" copy="移动指针穿过关键词索引，寻找下一条知识路径。" />
      <LiquidCard className="tag-cloud-card">
        <div className="star-field" aria-hidden="true" />
        <div className="orbital-ring ring-one" aria-hidden="true"><i /><i /></div>
        <div className="orbital-ring ring-two" aria-hidden="true"><i /><i /><i /></div>
        <div className="orbital-ring ring-three" aria-hidden="true"><i /></div>
        <div className="orbital-core" aria-hidden="true"><i /></div>
        {tags.map((tag, index) => {
          const angle = (index / tags.length) * Math.PI * 2
          const radius = 24 + (index % 3) * 10
          const style = {
            '--x': `${50 + Math.cos(angle) * radius}%`,
            '--y': `${50 + Math.sin(angle) * radius * .72}%`,
            '--dx': `${(index % 2 ? 1 : -1) * (8 + index % 5 * 3)}px`,
            '--dy': `${(index % 3 ? -1 : 1) * (10 + index % 4 * 3)}px`,
            '--spin': `${(index % 2 ? 1 : -1) * (1.5 + index % 3)}deg`,
            '--delay': `${index * -.31}s`,
            '--duration': `${4.4 + index % 5 * .65}s`,
            '--size': `${.72 + tag.count * .13}rem`,
          } as CSSProperties
          return <button key={tag.name} className="cloud-tag" style={style} onClick={() => openTag(tag.name)} aria-label={`查看 ${tag.name} 的 ${tag.count} 篇文章`}>{tag.name}<sup>{tag.count}</sup></button>
        })}
      </LiquidCard>
    </>
  )
}

function ArchiveView() {
  return (
    <>
      <PageHead label="时间轴" title="时间会过去，脉络留下来。" copy={`${posts.length} 篇文章，按月份回看技术判断、工程实践与持续变化的兴趣。`} />
      <div className="archive-layout">
        <aside className="year-index" aria-label="按年份浏览">
          <span>YEAR INDEX</span>
          {archiveYears.map((year) => <button key={year} onClick={() => document.getElementById(`year-${year}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            <strong>{year}</strong><small>{posts.filter((post) => post.date.startsWith(year)).length} 篇</small>
          </button>)}
        </aside>
        <section className="archive-timeline" aria-label="文章时间轴">
          {archiveYears.map((year) => <section className="timeline-year" id={`year-${year}`} key={year}>
            <header className="timeline-year-label"><span>{year}</span><small>YEAR</small></header>
            {archiveGroups.filter(([month]) => month.startsWith(year)).map(([month, entries]) => (
              <section className="timeline-group" key={month}>
                <header className="timeline-date">
                  <span>{month.slice(0, 4)}</span>
                  <h2>{monthFormatter.format(new Date(`${month}-01T00:00:00`))}</h2>
                  <small>{entries.length} 篇记录</small>
                </header>
                <div className="timeline-items">
                  {entries.sort((left, right) => right.date.localeCompare(left.date)).map((post) => (
                    <article className="timeline-item" data-card key={post.id}>
                      <img src={post.cover} alt={`${post.title} 文章封面`} width="320" height="200" loading="lazy" />
                      <div className="timeline-copy">
                        <div className="timeline-meta"><span>{post.category}</span><span>{post.readTime}</span></div>
                        <h3>{post.title}</h3>
                        <p>{post.excerpt}</p>
                        <div className="timeline-tags">{post.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
                      </div>
                      <time className="timeline-day" dateTime={post.date}><strong>{post.date.slice(-2)}</strong><span>DAY</span></time>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </section>)}
        </section>
      </div>
    </>
  )
}

function AboutView() {
  return (
    <>
      <PageHead label="关于" title="写作是我理解技术的方式。" copy="从界面到基础设施，我关心系统如何运作，也关心人如何感受它。" />
      <section className="about-grid">
        <LiquidCard className="portrait-card"><img src="./img/avatar.jpg" alt="MAOLIN 的头像" width="600" height="600" /><div><span>FULL-STACK CREATOR</span><h2>MAOLIN</h2></div></LiquidCard>
        <LiquidCard className="about-copy"><Sparkles /><h2>构建清楚、快速、有生命力的数字产品。</h2><p>持续研究 AI Agent、实时图形、React、Rust 与云原生架构。这个站点记录真实的学习路径，不包装捷径。</p></LiquidCard>
        <LiquidCard className="contact-card"><Mail /><span>LET'S CONNECT</span><a href="mailto:hello@maolin.dev">hello@maolin.dev <ArrowUpRight /></a><a href="https://github.com/MAOLINTIAN">github.com/MAOLINTIAN <ArrowUpRight /></a></LiquidCard>
      </section>
    </>
  )
}

function PageHead({ label, title, copy }: { label: string; title: string; copy: string }) {
  return <header className="page-head"><p className="eyebrow">{label}</p><h1>{title}</h1><p>{copy}</p></header>
}

function CardStage({ view, query, selectedTag, selectedPost, setView, openPost, openTag, clearTag }: { view: View; query: string; selectedTag: string | null; selectedPost: Post | null; setView: (view: View) => void; openPost: (post: Post) => void; openTag: (tag: string) => void; clearTag: () => void }) {
  const stageRef = useRef<HTMLElement>(null)
  useGSAP(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cards = gsap.utils.toArray<HTMLElement>('[data-card]')
    const headings = gsap.utils.toArray<HTMLElement>('.page-head > *')
    const map = gsap.utils.toArray<HTMLElement>('.knowledge-plane')
    if (reduce) return
    const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })
    if (headings.length) timeline.fromTo(headings, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: .7, stagger: .06 })
    if (map.length) timeline.fromTo(map, { autoAlpha: 0 }, { autoAlpha: 1, duration: .85 }, headings.length ? '-=.6' : 0)
    if (cards.length) timeline.fromTo(cards, { autoAlpha: 0, y: 34, scale: .975 }, { autoAlpha: 1, y: 0, scale: 1, duration: .8, stagger: { amount: .38, from: 'start' }, clearProps: 'transform,opacity,visibility' }, timeline.duration() ? '-=.42' : 0)
  }, { scope: stageRef, dependencies: [view], revertOnUpdate: true })

  return <main className={`stage ${view === 'home' ? 'blog-home-stage' : ''}`} ref={stageRef} id="main-content">
    {view === 'home' && <HomeView openPost={openPost} openTag={openTag} />}
    {view === 'articles' && selectedPost && <PostView post={selectedPost} setView={setView} />}
    {view === 'articles' && !selectedPost && <ArticlesView query={query} selectedTag={selectedTag} clearTag={clearTag} openPost={openPost} />}
    {view === 'categories' && <CategoriesView />}
    {view === 'archive' && <ArchiveView />}
    {view === 'tags' && <TagsView openTag={openTag} />}
    {view === 'about' && <AboutView />}
  </main>
}

export default function App() {
  const initialHash = window.location.hash.replace('#', '') || 'home'
  const initialPost = initialHash.startsWith('post-') ? posts.find((post) => post.id === Number(initialHash.slice(5))) ?? null : null
  const initialView = initialPost ? 'articles' : initialHash as View
  const [view, setViewState] = useState<View>(nav.some((item) => item.id === initialView) ? initialView : 'home')
  const [query, setQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(initialPost)

  const setView = (next: View) => {
    if (next !== 'articles') setSelectedTag(null)
    setSelectedPost(null)
    setSearchOpen(false)
    setViewState(next)
    window.history.replaceState(null, '', `#${next}`)
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  const openPost = (post: Post) => {
    setSelectedPost(post)
    setViewState('articles')
    setSearchOpen(false)
    window.history.replaceState(null, '', `#post-${post.id}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openTag = (tag: string) => {
    setQuery('')
    setSelectedTag(tag)
    setView('articles')
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <header className="topbar">
        <button className="brand" onClick={() => setView('home')} aria-label="返回首页"><span>M</span><b>MAOLIN</b></button>
        <nav aria-label="主要导航">{nav.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}><Icon /><span>{item.label}</span></button> })}</nav>
      </header>
      <div className={`search-dock ${searchOpen ? 'open' : ''}`} role="search">
        {searchOpen ? <>
          <Search aria-hidden="true" />
          <input autoFocus type="search" name="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => {
            if (event.key === 'Escape') setSearchOpen(false)
            if (event.key === 'Enter') { setSelectedTag(null); setView('articles'); setSearchOpen(false) }
          }} placeholder="搜索文章、技术或关键词…" aria-label="搜索文章、技术或关键词" />
          <button className="search-close" onClick={() => setSearchOpen(false)} aria-label="关闭搜索">关闭</button>
        </> : <button className="search-dock-trigger" onClick={() => setSearchOpen(true)} aria-label="打开文章搜索" aria-expanded="false"><Search /><span>搜索文章</span></button>}
      </div>
      <CardStage view={view} query={query} selectedTag={selectedTag} selectedPost={selectedPost} setView={setView} openPost={openPost} openTag={openTag} clearTag={() => setSelectedTag(null)} />
      {view !== 'home' && <footer><span>© 2026 MAOLIN</span><span>React / TypeScript / GSAP / Tailwind</span></footer>}
    </div>
  )
}
