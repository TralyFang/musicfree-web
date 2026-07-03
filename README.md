# MusicFree Web

基于插件体系的免费音乐播放器 Web 版，支持 PWA 离线使用。

![logo](public/icons/logo.png)

## 功能特性

- **插件系统**：通过 URL 或本地文件安装音乐源插件，支持多平台聚合搜索
- **音乐搜索**：多插件并行搜索，结果按来源分组展示
- **在线播放**：支持普通音频流和 HLS 流媒体，自动走 CORS 代理
- **歌词显示**：实时滚动歌词，支持 LRC 格式解析
- **歌单管理**：创建/编辑/删除歌单，支持批量操作
- **播放历史**：自动记录播放历史
- **推荐/排行榜**：插件提供的推荐歌单和排行榜数据
- **专辑/歌手详情**：支持跳转查看专辑和歌手详情页
- **播放模式**：顺序播放、单曲循环、随机播放
- **Media Session**：系统级媒体控制（锁屏控制、通知栏）
- **PWA 支持**：可安装到桌面，支持离线缓存
- **数据备份**：支持导出/导入歌单和插件配置
- **响应式设计**：适配桌面端和移动端浏览器

## 技术栈

| 技术 | 用途 |
|------|------|
| React 18 + TypeScript | 前端框架 |
| Vite | 构建工具 |
| Jotai | 状态管理 |
| Tailwind CSS | 样式方案 |
| React Router v6 | 路由 |
| Dexie.js (IndexedDB) | 本地持久化存储 |
| hls.js | HLS 流媒体支持 |
| vite-plugin-pwa | PWA / Service Worker |
| Cloudflare Pages Functions | CORS 代理 |

## 项目结构

```
musicfree-web/
├── public/                  # 静态资源
│   ├── icons/               # 图标
│   └── manifest.json        # PWA 清单
├── functions/               # Cloudflare Pages Functions
│   └── _proxy.ts            # CORS 代理（同域 /_proxy）
├── src/
│   ├── core/                # 核心模块
│   │   ├── pluginManager/   # 插件管理器
│   │   ├── trackPlayer/     # 播放器核心
│   │   ├── musicSheet/      # 歌单管理
│   │   ├── musicHistory/    # 播放历史
│   │   └── proxy/           # 代理封装
│   ├── components/          # 通用组件
│   │   ├── Layout/          # 布局
│   │   ├── Sidebar/         # 侧边栏
│   │   └── MusicBar/        # 底部播放栏
│   ├── pages/               # 页面
│   │   ├── Home/            # 首页
│   │   ├── Search/          # 搜索
│   │   ├── MusicDetail/     # 播放详情（歌词）
│   │   ├── Playlist/        # 播放队列
│   │   ├── SheetList/       # 歌单列表
│   │   ├── Recommend/       # 推荐
│   │   ├── TopList/         # 排行榜
│   │   ├── AlbumDetail/     # 专辑详情
│   │   ├── ArtistDetail/    # 歌手详情
│   │   ├── History/         # 播放历史
│   │   └── Setting/         # 设置
│   ├── store/               # Jotai atoms
│   ├── types/               # TypeScript 类型定义
│   ├── utils/               # 工具函数
│   └── constants/           # 常量
├── worker/                  # 独立 Worker（备用代理）
│   └── cors-proxy/
└── docs/                    # 文档
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/TralyFang/musicfree-web.git
cd musicfree-web

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

开发服务器启动后访问 http://localhost:5173

### 构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

## 部署

### 部署到 Cloudflare Pages（推荐）

项目使用 Cloudflare Pages 部署，`functions/_proxy.ts` 会自动作为 Pages Function 处理 CORS 代理请求。

#### 方式一：命令行部署

```bash
# 构建
npm run build

# 部署（需要先 wrangler login）
npx wrangler pages deploy dist --project-name=musicfree-web
```

#### 方式二：连接 GitHub 自动部署

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 Pages → 创建项目 → 连接 GitHub 仓库
3. 配置构建设置：
   - 构建命令：`npm run build`
   - 构建输出目录：`dist`
   - Node.js 版本：`18`
4. 每次推送代码将自动触发部署

#### 绑定自定义域名

1. Pages 项目 → Custom Domains → Add domain
2. 输入你的域名（如 `music.dailywhy.top`）
3. Cloudflare 会自动配置 DNS 记录

### 代理说明

前端默认使用相对路径 `/_proxy` 作为 CORS 代理，由 Pages Function 处理，无需额外配置。

用户也可在设置页面自定义代理地址（如自建的独立 Worker 代理）。

## 使用说明

### 安装插件

1. 进入「设置」页面
2. 在「插件管理」中输入插件 URL 或选择本地 JS 文件
3. 安装成功后即可在搜索中使用该插件源

### 搜索播放

1. 进入「搜索」页面
2. 输入关键词，选择搜索源
3. 点击搜索结果即可播放

### 调试模式

- 开发环境自动启用 vConsole
- 生产环境访问时 URL 加 `?debug` 参数启用（如 `https://music.dailywhy.top/?debug`）

## License

MIT
