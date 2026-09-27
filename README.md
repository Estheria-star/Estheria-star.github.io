# startian.top · 星恬的小站

小站主页，部署在 GitHub Pages（自定义域名：startian.top）。

## 怎么加新项目

1. 打开 `index.html`，找到注释里的「新项目模板」卡片
2. 复制一整段、改图标 / 名称 / 描述 / 链接
3. 保存后重新上传（或喊曦月来推）

## 子域名用法

新项目建议挂子域名，比如 `project.startian.top`：
- 阿里云 DNS 加一条 CNAME：`project` → `estheria-star.github.io`
- 在项目的 GitHub 仓库里开 Pages 并设置自定义域名
- 回到本主页加一张卡片指向 `https://project.startian.top/`

## 结构

- `index.html` — 主页（纯静态、零依赖、可离线打开）
- `CNAME` — GitHub Pages 域名声明（startian.top）
