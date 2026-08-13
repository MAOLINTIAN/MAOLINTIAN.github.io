import { csdnPosts } from './csdn-posts'

export type Post = {
  id: number
  title: string
  excerpt: string
  category: string
  cover: string
  date: string
  tags: string[]
  readTime: string
  contentPath?: string
  sourceUrl?: string
}

const mockPosts: Post[] = [
  { id: 1, title: 'Astro 主题设计：从内容模型到阅读体验', excerpt: '拆解个人博客的内容架构、视觉节奏与静态构建策略。', category: 'Frontend', cover: '/img/cover-frontend-color.webp', date: '2026-03-02', tags: ['Astro', 'Design System', '博客'], readTime: '5 min' },
  { id: 2, title: '便携式 AI Agent：把复杂环境装进一个工作区', excerpt: '从运行时隔离、模型接入到本地工具链的一次完整实践。', category: 'AI', cover: '/img/cover-ai-color.webp', date: '2026-04-11', tags: ['Agent', 'LLM', 'Tooling'], readTime: '8 min' },
  { id: 3, title: '隐私友好的临时邮箱应该怎样设计', excerpt: '一次围绕身份隔离、反滥用和产品体验的系统思考。', category: 'Security', cover: '/img/cover-security-color.webp', date: '2025-06-24', tags: ['Privacy', 'Security', 'Product'], readTime: '4 min' },
  { id: 4, title: 'Rust 异步运行时：从 Reactor 到 Executor', excerpt: '理解 Tokio 的任务调度、IO 驱动与并发模型。', category: 'Systems', cover: '/img/cover-systems-color.webp', date: '2025-08-15', tags: ['Rust', 'Tokio', 'Async'], readTime: '15 min' },
  { id: 5, title: 'WebGPU 计算着色器与百万粒子系统', excerpt: '在浏览器中构建真正由 GPU 驱动的实时视觉场景。', category: 'Graphics', cover: '/img/cover-frontend-color.webp', date: '2025-09-20', tags: ['WebGPU', 'GPU', 'Shader'], readTime: '12 min' },
  { id: 6, title: 'Kubernetes Operator 的控制循环', excerpt: '用声明式 API 管理有状态服务与复杂基础设施。', category: 'Cloud', cover: '/img/cover-cloud-color.webp', date: '2025-07-10', tags: ['Kubernetes', 'Go', 'DevOps'], readTime: '18 min' },
  { id: 7, title: '真正留下来的效率工具', excerpt: '一套服务于长期写作、编码与知识整理的个人工作流。', category: 'Workflow', cover: '/img/cover-frontend-color.webp', date: '2025-05-18', tags: ['Workflow', 'Tools', 'Notes'], readTime: '6 min' },
  { id: 8, title: '从 Vue 转向 React 之后，我重新理解了 UI', excerpt: '框架选择背后的约束、生态和工程思维。', category: 'Frontend', cover: '/img/cover-frontend-color.webp', date: '2025-10-05', tags: ['React', 'Vue', 'Architecture'], readTime: '10 min' },
  { id: 9, title: 'React Server Components 的边界在哪里', excerpt: '从数据获取、缓存到交互岛，拆解服务端组件真正适合解决的问题。', category: 'Frontend', cover: '/img/cover-frontend-color.webp', date: '2026-01-18', tags: ['React', 'Architecture', 'Performance'], readTime: '9 min' },
  { id: 10, title: '给 RAG 系统建立一套可复现的评估方法', excerpt: '用检索命中率、答案忠实度和真实问题集持续校准知识库。', category: 'AI', cover: '/img/cover-ai-color.webp', date: '2026-02-09', tags: ['RAG', 'LLM', 'Evaluation'], readTime: '14 min' },
  { id: 11, title: '把 Rust 编译到 WebAssembly 之后', excerpt: '记录内存边界、序列化成本与浏览器性能之间的真实取舍。', category: 'Systems', cover: '/img/cover-systems-color.webp', date: '2025-12-12', tags: ['Rust', 'WebAssembly', 'Frontend'], readTime: '11 min' },
  { id: 12, title: 'PostgreSQL 索引不是越多越好', excerpt: '从执行计划出发，理解复合索引、回表和写入放大的代价。', category: 'Database', cover: '/img/cover-data-color.webp', date: '2025-11-28', tags: ['PostgreSQL', 'Database', 'Index'], readTime: '13 min' },
  { id: 13, title: '缓存一致性：先接受现实，再设计策略', excerpt: '用版本号、过期时间和事件通知处理数据库与 Redis 的短暂分歧。', category: 'Systems', cover: '/img/cover-systems-color.webp', date: '2025-11-03', tags: ['Redis', 'Cache', 'Systems'], readTime: '8 min' },
  { id: 14, title: 'Kubernetes 可观测性从哪些信号开始', excerpt: '将指标、日志和链路追踪组合成能够真正定位故障的视图。', category: 'Cloud', cover: '/img/cover-cloud-color.webp', date: '2025-10-21', tags: ['Kubernetes', 'Observability', 'Cloud'], readTime: '16 min' },
  { id: 15, title: 'TypeScript 类型体操应该适可而止', excerpt: '复杂类型何时提升维护性，何时只是在把运行时问题藏起来。', category: 'Frontend', cover: '/img/cover-frontend-color.webp', date: '2025-09-08', tags: ['TypeScript', 'Type System', 'Frontend'], readTime: '7 min' },
  { id: 16, title: '设计令牌如何跨越设计稿与代码', excerpt: '让颜色、间距和排版规则成为可以版本化的产品基础设施。', category: 'Design', cover: '/img/cover-frontend-color.webp', date: '2025-08-26', tags: ['Design System', 'Tokens', 'UX'], readTime: '6 min' },
  { id: 17, title: 'Passkey 登录流程的工程落地', excerpt: '从 WebAuthn 注册到多设备同步，梳理无密码登录的关键边界。', category: 'Security', cover: '/img/cover-security-color.webp', date: '2025-08-02', tags: ['Passkey', 'Security', 'WebAuthn'], readTime: '12 min' },
  { id: 18, title: '一条够用的 GitHub Actions 发布流水线', excerpt: '用最少的步骤完成检查、构建、缓存和可回滚部署。', category: 'Workflow', cover: '/img/cover-cloud-color.webp', date: '2025-07-22', tags: ['CI/CD', 'GitHub Actions', 'DevOps'], readTime: '7 min' },
  { id: 19, title: '网页性能优化先看用户真实感受', excerpt: '围绕 LCP、INP 和 CLS 建立从测量到修复的完整反馈循环。', category: 'Performance', cover: '/img/cover-data-color.webp', date: '2025-06-13', tags: ['Performance', 'Web Vitals', 'Frontend'], readTime: '9 min' },
  { id: 20, title: '把 AI 编程助手接入真实工作流', excerpt: '从上下文准备、任务拆分到代码审查，让模型输出真正可合并。', category: 'AI', cover: '/img/cover-ai-color.webp', date: '2025-05-30', tags: ['Agent', 'LLM', 'Workflow'], readTime: '10 min' },
]

export const posts: Post[] = (csdnPosts.length ? csdnPosts : mockPosts).map((post) => ({
  ...post,
  cover: post.cover.startsWith('/img/') ? `.${post.cover}` : post.cover,
}))

export const categories = Array.from(new Set(posts.map((post) => post.category))).map((name) => ({
  name,
  posts: posts.filter((post) => post.category === name),
}))

export const tags = Array.from(new Set(posts.flatMap((post) => post.tags))).map((name) => ({
  name,
  count: posts.filter((post) => post.tags.includes(name)).length,
}))
