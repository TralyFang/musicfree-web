# MusicFree Web PWA 构建方案

## 一、项目概述

基于 MusicFree 现有的插件体系和数据模型，独立开发一个 Web 端 PWA 音乐播放器。复用现有项目的核心业务逻辑（插件协议、类型定义、数据结构），全新构建 UI 层和播放器层。原生APP项目源码地址: ~/Desktop/project/MusicFree-master

### 目标

- 支持完整的插件导入/管理功能（从 URL 安装、本地文件导入）
- 支持音乐搜索、播放、歌词显示、歌单管理
- 支持 PWA 离线缓存、桌面安装
- 支持 Media Session API（系统级媒体控制）
- 响应式设计，适配桌面端和移动端浏览器

---

## 二、技术选型

| 层级 | 技术方案 | 选择理由 |
|------|---------|---------|
| 框架 | React 18 + TypeScript | 与现有项目一致，可最大化复用类型定义 |
| 构建工具 | Vite | 快速构建，原生 ESM，PWA 插件生态成熟 |
| 状态管理 | Jotai | 与现有项目一致，轻量，atom 模式适合音乐播放器场景 |
| UI 组件 | Tailwind CSS + Headless UI | 灵活定制，无运行时开销 |
| 路由 | React Router v6 | 轻量，支持懒加载 |
| 音频播放 | Howler.js 或 原生 Web Audio API | 成熟的 Web 音频方案，支持多格式 |
| PWA | vite-plugin-pwa (Workbox) | 自动生成 Service Worker、离线缓存策略 |
| 本地存储 | IndexedDB (via Dexie.js) + localStorage | 插件代码存储、播放列表持久化 |
| 网络请求 | Axios | 与插件环境一致 |
| CORS 代理 | Cloudflare Worker | 免费额度大，全球 CDN 节点，延迟低 |

---

## 三、项目结构

```
musicfree-web/
├── public/
│   ├── manifest.json          # PWA 清单
│   ├── icons/                 # 各尺寸图标
│   └── sw.js                  # Service Worker (由 vite-plugin-pwa 生成)
├── src/
│   ├── main.tsx               # 入口
│   ├── App.tsx                # 根组件
│   ├── types/                 # 类型定义（从现有项目直接复制）
│   │   ├── music.d.ts
│   │   ├── plugin.d.ts
│   │   ├── album.d.ts
│   │   ├── artist.d.ts
│   │   ├── lyric.d.ts
│   │   └── common.d.ts
│   ├── core/
│   │   ├── pluginManager/     # 插件管理（核心复用）
│   │   │   ├── index.ts       # 插件管理器
│   │   │   ├── plugin.ts      # 插件类（沙箱执行）
│   │   │   ├── meta.ts        # 插件元数据
│   │   │   └── storage.ts     # 插件持久化（IndexedDB）
│   │   ├── trackPlayer/       # 播放器核心
│   │   │   ├── index.ts       # 播放控制逻辑
│   │   │   ├── audioContext.ts # Web Audio 封装
│   │   │   └── mediaSession.ts # Media Session API
│   │   ├── musicSheet/        # 歌单管理
│   │   ├── lyricManager/      # 歌词管理
│   │   ├── mediaCache/        # 媒体缓存
│   │   ├── musicHistory/      # 播放历史
│   │   ├── theme/             # 主题系统
│   │   └── proxy/             # CORS 代理配置
│   ├── pages/
│   │   ├── Home/              # 首页（推荐/榜单）
│   │   ├── Search/            # 搜索页
│   │   ├── MusicDetail/       # 播放详情页（含歌词）
│   │   ├── Playlist/          # 歌单详情
│   │   ├── Setting/           # 设置页
│   │   │   ├── PluginManager/ # 插件管理界面
│   │   │   └── General/       # 通用设置
│   │   ├── AlbumDetail/       # 专辑详情
│   │   └── ArtistDetail/      # 歌手详情
│   ├── components/
│   │   ├── MusicBar/          # 底部播放栏
│   │   ├── MusicList/         # 音乐列表
│   │   ├── Sidebar/           # 侧边栏导航
│   │   ├── Dialog/            # 弹窗组件
│   │   ├── Toast/             # 轻提示
│   │   └── Player/            # 播放器控件
│   ├── hooks/                 # 自定义 hooks
│   ├── utils/                 # 工具函数（大部分可复用）
│   │   ├── mediaUtils.ts
│   │   ├── lrcParser.ts
│   │   ├── timeformat.ts
│   │   └── storage.ts         # IndexedDB 封装
│   └── constants/             # 常量
├── worker/
│   └── cors-proxy/            # Cloudflare Worker CORS 代理
│       ├── index.ts
│       └── wrangler.toml
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 四、核心模块详细设计

### 4.1 插件系统（核心复用模块）

插件系统是整个方案的关键，需要从现有项目迁移并适配 Web 环境。

#### 4.1.1 插件执行沙箱（可直接复用）

现有的 `new Function()` 沙箱机制在浏览器中原生支持：

```typescript
// 插件执行核心逻辑 — 与现有实现基本一致
const _instance = Function(`
    'use strict';
    return function(require, __musicfree_require, module, exports, console, env, URL, process) {
        ${funcCode}
    }
`)()(
    _require,    // 模拟 require
    _require,
    _module,
    _module.exports,
    _console,
    env,
    URL,         // 浏览器原生 URL，无需 polyfill
    _process
);
```

#### 4.1.2 插件可用依赖（全部兼容浏览器）

```typescript
const packages: Record<string, any> = {
    cheerio,          // ✅ 纯 JS HTML 解析
    "crypto-js": CryptoJs,  // ✅ 纯 JS 加密
    axios,            // ✅ 浏览器兼容
    dayjs,            // ✅ 纯 JS 时间处理
    "big-integer": bigInt,  // ✅ 纯 JS 大数运算
    qs,               // ✅ 纯 JS URL 参数解析
    he,               // ✅ 纯 JS HTML 实体编解码
    webdav,           // ✅ 支持浏览器
};
```

#### 4.1.3 插件存储适配

| 原方案 | Web 方案 |
|--------|---------|
| `react-native-fs` 读写 `.js` 文件 | IndexedDB 存储插件代码字符串 |
| `react-native-mmkv` 缓存元数据 | localStorage 存储轻量元数据 |
| 文件系统目录遍历 | IndexedDB 表查询 |

```typescript
// 插件存储方案 — Dexie.js 封装
import Dexie from 'dexie';

const db = new Dexie('MusicFreePlugins');
db.version(1).stores({
    plugins: 'hash, name, path, code, createdAt',
    pluginMeta: 'name, order, enabled, userVariables',
    mediaCache: '[platform+id], updatedAt',
});
```

#### 4.1.4 插件安装流程

```
从 URL 安装：
  axios.get(url) → 获取 JS 代码 → new Function() 解析验证
  → 计算 SHA256 hash → 存入 IndexedDB → 更新插件列表状态

从本地文件安装：
  <input type="file"> → FileReader.readAsText() → 获取 JS 代码
  → 同上流程
```

### 4.2 音频播放器

#### 4.2.1 播放核心

```typescript
class WebTrackPlayer {
    private audio: HTMLAudioElement;
    private mediaSession: MediaSession;
    
    constructor() {
        this.audio = new Audio();
        this.audio.crossOrigin = 'anonymous';
        this.setupMediaSession();
        this.setupEventListeners();
    }
    
    async play(musicItem: IMusic.IMusicItem) {
        // 1. 通过插件获取音源 URL
        const source = await pluginManager
            .getByMedia(musicItem)
            ?.methods.getMediaSource(musicItem, quality);
        
        // 2. 通过 CORS 代理转换 URL
        const proxyUrl = this.wrapWithProxy(source.url, source.headers);
        
        // 3. 设置音频源并播放
        this.audio.src = proxyUrl;
        await this.audio.play();
        
        // 4. 更新 Media Session 元数据
        this.updateMediaSession(musicItem);
    }
    
    private setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => this.resume());
            navigator.mediaSession.setActionHandler('pause', () => this.pause());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.skipToPrevious());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.skipToNext());
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                this.seekTo(details.seekTime!);
            });
        }
    }
}
```

#### 4.2.2 支持的音频格式

浏览器原生支持：MP3、AAC、OGG、WAV、FLAC（部分浏览器）、M4A

对于 HLS (.m3u8)：使用 `hls.js` 库进行支持。

### 4.3 CORS 代理方案

#### 4.3.1 Cloudflare Worker 代理

```typescript
// worker/cors-proxy/index.ts
export default {
    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const targetUrl = url.searchParams.get('url');
        const headers = JSON.parse(url.searchParams.get('headers') || '{}');
        
        if (!targetUrl) {
            return new Response('Missing url parameter', { status: 400 });
        }
        
        const response = await fetch(targetUrl, {
            headers: {
                ...headers,
                'User-Agent': headers['user-agent'] || 'Mozilla/5.0',
            },
        });
        
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        newResponse.headers.set('Access-Control-Allow-Headers', '*');
        
        return newResponse;
    },
};
```

#### 4.3.2 代理使用策略

```typescript
// 智能代理：先尝试直连，失败后走代理
async function fetchWithProxy(url: string, headers?: Record<string, string>) {
    try {
        // 尝试直连（同源或已配置 CORS 的资源）
        const response = await axios.get(url, { headers, timeout: 5000 });
        return response;
    } catch (e) {
        // 失败后走 CORS 代理
        const proxyUrl = `${PROXY_BASE_URL}?url=${encodeURIComponent(url)}&headers=${encodeURIComponent(JSON.stringify(headers || {}))}`;
        return axios.get(proxyUrl);
    }
}
```

### 4.4 PWA 配置

#### 4.4.1 manifest.json

```json
{
    "name": "MusicFree",
    "short_name": "MusicFree",
    "description": "免费的音乐播放器",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#1a1a2e",
    "theme_color": "#16213e",
    "orientation": "any",
    "icons": [
        { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
        { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
        { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
    ]
}
```

#### 4.4.2 Service Worker 缓存策略

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            workbox: {
                // 预缓存：应用 shell
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                // 运行时缓存策略
                runtimeCaching: [
                    {
                        // 音频资源：Network First + 缓存
                        urlPattern: /\.(mp3|m4a|aac|ogg|flac)$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'audio-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 天
                            },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        // 封面图片缓存
                        urlPattern: /\.(jpg|jpeg|png|webp)$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'image-cache',
                            expiration: {
                                maxEntries: 200,
                                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 天
                            },
                        },
                    },
                ],
            },
        }),
    ],
});
```

### 4.5 数据持久化方案

```typescript
// IndexedDB 数据库结构
interface DBSchema {
    // 插件管理
    plugins: {
        hash: string;         // 主键
        name: string;
        code: string;         // 插件源码
        version: string;
        srcUrl?: string;
        createdAt: number;
    };
    
    // 插件元数据
    pluginMeta: {
        name: string;         // 主键
        order: number;
        enabled: boolean;
        userVariables: Record<string, string>;
    };
    
    // 播放列表
    playlist: {
        id: string;           // 主键
        musicItems: IMusic.IMusicItem[];
        updatedAt: number;
    };
    
    // 歌单
    musicSheets: {
        id: string;
        title: string;
        musicList: IMusic.IMusicItem[];
        createdAt: number;
    };
    
    // 播放历史
    history: {
        id: string;           // platform + id
        musicItem: IMusic.IMusicItem;
        timestamp: number;
    };
    
    // 媒体缓存（音源 URL 等）
    mediaCache: {
        key: string;          // platform + id
        data: any;
        updatedAt: number;
    };
    
    // 歌词缓存
    lyricCache: {
        key: string;
        rawLrc: string;
        translation?: string;
        updatedAt: number;
    };
}
```

---

## 五、从现有项目可直接复用的代码

| 文件/模块 | 复用程度 | 说明 |
|-----------|---------|------|
| `src/types/` 全部类型定义 | 100% 直接复制 | 纯 TypeScript 类型 |
| `src/core/pluginManager/plugin.ts` 核心逻辑 | 80% | 去掉 `react-native-fs`/`RNFS` 相关调用，改用 IndexedDB |
| `src/utils/lrcParser.ts` | 100% | 纯 JS 歌词解析 |
| `src/utils/mediaUtils.ts` | 90% | 去掉 `internalSerializeKey` 中 localPath 相关 |
| `src/utils/timeformat.ts` | 100% | 纯工具函数 |
| `src/utils/minDistance.ts` | 100% | 纯算法 |
| `src/utils/qualities.ts` | 100% | 纯逻辑 |
| `src/utils/base64.ts` | 100% | 纯 JS |
| `src/utils/colorUtil.ts` | 100% | 纯 JS |
| `src/utils/eventBus.ts` | 100% | eventemitter3 |
| `src/utils/mediaIndexMap.ts` | 100% | 纯数据结构 |
| `src/constants/commonConst.ts` | 90% | 去掉平台相关 |
| `src/constants/repeatModeConst.ts` | 100% | 纯常量 |
| `src/core/mediaCache.ts` | 70% | 存储层改 IndexedDB |
| `src/core/musicHistory.ts` | 70% | 存储层改 IndexedDB |

---

## 六、开发阶段规划

### 第一阶段：基础框架搭建（1-2 周）✅ 已完成

- [x] 初始化 Vite + React + TypeScript 项目
- [x] 配置 Tailwind CSS、路由、状态管理
- [x] 搭建基础页面布局（Sidebar + 主内容区 + 底部播放栏）
- [x] 实现 IndexedDB 存储层封装
- [x] 复制并适配类型定义文件
- [x] 响应式布局适配移动端（抽屉式侧边栏、自适应播放栏）

### 第二阶段：插件系统（1-2 周）✅ 已完成

- [x] 迁移插件沙箱执行引擎（`plugin.ts` 核心逻辑）
- [x] 实现插件管理器（安装/卸载/更新/排序/启用禁用）
- [x] 实现从 URL 安装插件
- [x] 实现从本地文件安装插件（File API）
- [x] 插件管理界面（列表、安装、配置用户变量）

### 第三阶段：播放器核心（1-2 周）✅ 已完成

- [x] 实现 Web Audio 播放器封装
- [x] 实现播放队列管理（播放/暂停/上一首/下一首/随机/单曲循环）
- [x] 集成 Media Session API
- [x] 部署 CORS 代理 Worker（Cloudflare Worker + 同域 functions/_proxy.ts）
- [x] 实现智能代理请求策略（先直连，失败后走代理）
- [x] 支持 HLS 流媒体（hls.js）

### 第四阶段：功能页面（2-3 周）✅ 已完成

- [x] 搜索页（支持多插件聚合搜索）
- [x] 播放详情页（封面 + 歌词滚动显示）
- [x] 歌单管理（创建/编辑/删除/导入）
- [x] 播放历史
- [x] 专辑详情 & 歌手详情
- [x] 榜单 & 推荐歌单

### 第五阶段：PWA 与优化（1 周）✅ 已完成

- [x] 配置 PWA manifest 和 Service Worker
- [x] 实现音频离线缓存（Workbox runtime caching）
- [x] 响应式布局适配移动端
- [x] 性能优化（代码分割 manualChunks）
- [x] 部署上线（Cloudflare Pages + Workers）

---

## 七、关键技术难点与解决策略

### 7.1 CORS 跨域问题

**问题**：插件中的 `axios` 请求第三方网站会被浏览器跨域策略拦截。

**解决方案**：
1. 在插件沙箱中劫持 `axios`，自动为请求添加代理前缀
2. 部署 Cloudflare Worker 作为 CORS 代理
3. 对于已支持 CORS 的资源（如部分 CDN 音频地址），直连

```typescript
// 劫持插件环境中的 axios
const proxyAxios = {
    ...axios,
    get: (url: string, config?: any) => {
        return axios.get(wrapProxy(url), config);
    },
    post: (url: string, data?: any, config?: any) => {
        return axios.post(wrapProxy(url), data, config);
    },
};
```

### 7.2 音频播放限制

**问题**：浏览器要求用户交互后才能播放音频（Autoplay Policy）。

**解决方案**：
1. 首次播放必须由用户点击触发
2. 后续自动播放（下一首）不受限制，因为已有用户交互上下文
3. 使用 `audio.play().catch()` 优雅处理被拒绝的情况

### 7.3 后台播放

**问题**：浏览器 Tab 在后台时可能被节流。

**解决方案**：
1. `<audio>` 元素播放不受 Tab 可见性影响（浏览器原生行为）
2. Media Session API 保证系统通知栏控制正常
3. Service Worker 可在后台独立运行

### 7.4 大量数据存储

**问题**：离线缓存的音频文件可能很大。

**解决方案**：
1. 使用 Cache API（Service Worker）存储音频
2. 设置容量上限和 LRU 淘汰策略
3. 提供用户可控的缓存管理界面

---

## 八、部署方案

| 方案 | 适合场景 | 优势 |
|------|---------|------|
| Cloudflare Pages | 推荐首选 | 免费、全球 CDN、与 Worker 代理配合 |
| Vercel | 备选 | 免费额度、自动部署、良好 DX |
| Netlify | 备选 | 免费、静态托管 |
| 自建 Nginx | 需要完全控制 | 自主可控 |

推荐 **Cloudflare Pages + Workers** 组合：
- Pages 托管前端静态资源
- Workers 作为 CORS 代理
- 统一管理，免费额度完全够用（每天 10 万次请求）

---

## 九、与原生 App 的功能对比

| 功能 | 原生 App | Web PWA | 备注 |
|------|---------|---------|------|
| 插件安装（URL） | ✅ | ✅ | 完全一致 |
| 插件安装（本地文件） | ✅ | ✅ | File API 替代 |
| 插件执行 | ✅ | ✅ | 相同沙箱机制 |
| 音乐搜索 | ✅ | ✅ | 需要 CORS 代理 |
| 在线播放 | ✅ | ✅ | 需要 CORS 代理 |
| 歌词显示 | ✅ | ✅ | 完全一致 |
| 歌单管理 | ✅ | ✅ | IndexedDB 存储 |
| 播放历史 | ✅ | ✅ | IndexedDB 存储 |
| 系统媒体控制 | ✅ | ✅ | Media Session API |
| 离线播放 | ✅ | ⚠️ | Cache API，容量受限 |
| 后台播放 | ✅ | ✅ | 浏览器原生支持 |
| 下载到本地 | ✅ | ⚠️ | 只能下载到浏览器缓存或触发下载 |
| 本地音乐扫描 | ✅ | ❌ | Web 无法扫描本地文件系统 |
| 锁屏歌词 | ✅ | ❌ | Web 无此能力 |
| 通知栏歌词 | ✅ | ❌ | Web 无此能力 |
| 定时关闭 | ✅ | ⚠️ | 可实现，但 Tab 关闭后失效 |
| 桌面安装 | ✅ | ✅ | PWA install |

---

## 十、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|---------|
| CORS 代理被滥用 | 代理服务被封/超限 | 添加鉴权 token、限流、仅允许白名单域名 |
| 第三方音源地址频繁变化 | 缓存失效 | 设置合理的缓存过期时间 |
| 浏览器存储空间限制 | 离线数据被清除 | 申请 persistent storage、提示用户 |
| 插件生态兼容性 | 部分插件可能不兼容 Web | 提供 `env.os = 'web'` 标识，插件可据此适配 |
| Cloudflare Worker 免费额度 | 高并发时受限 | 客户端缓存策略 + 多代理节点轮询 |

---

## 十一、总结

本方案的核心优势在于：

1. **插件系统天然兼容** — 现有插件的 JS 沙箱 + 纯 JS 依赖设计，几乎零改动即可在浏览器运行
2. **类型定义完全复用** — TypeScript 接口无需任何修改
3. **业务逻辑大量复用** — 播放队列管理、歌词解析、搜索逻辑等核心代码可直接迁移
4. **PWA 体验接近原生** — 可安装、离线可用、系统级媒体控制
5. **部署成本极低** — Cloudflare Pages + Workers 免费方案即可满足

唯一需要额外维护的是 **CORS 代理服务**，这是 Web 端音乐播放器的通用挑战，并非 MusicFree 特有问题。
