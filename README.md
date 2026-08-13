# MAOLIN Blog

个人技术博客，使用 React、TypeScript、Vite 与 GSAP 构建。

## 本地开发

```bash
npm install
npm run dev
```

## 内容迁移与校验

```bash
npm run import:csdn
npm run import:csdn:retry
npm run generate:csdn
npm run verify:csdn
```

当前内容索引包含 667 篇从作者本人 CSDN 博客迁入的文章。推送到 `main` 后，GitHub Actions 会构建并发布到 `gh-pages`。
