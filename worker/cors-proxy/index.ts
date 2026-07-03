/**
 * Cloudflare Worker CORS 代理
 * 用于解决浏览器跨域限制
 * 支持多域名白名单
 */
export interface Env {}

/** 允许的来源域名白名单（支持多域名） */
const ALLOWED_ORIGINS = [
    'https://music.dailywhy.top',
    'http://localhost:5173',
    'http://localhost:4173',
]

/** 匹配 Cloudflare Pages 预览域名 */
function isAllowedOrigin(origin: string | null): string {
    if (!origin) return '*'
    // 精确匹配白名单
    if (ALLOWED_ORIGINS.includes(origin)) return origin
    // 匹配 *.pages.dev 预览域名
    if (/^https:\/\/[\w-]+\.pages\.dev$/.test(origin)) return origin
    // 兜底：允许所有（如需严格安全可改为返回空字符串并拒绝请求）
    return '*'
}

export default {
    async fetch(request: Request, _env: Env): Promise<Response> {
        const origin = request.headers.get('Origin')
        const allowedOrigin = isAllowedOrigin(origin)

        // 处理预检请求
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': allowedOrigin,
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': '*',
                    'Access-Control-Max-Age': '86400',
                },
            })
        }

        const url = new URL(request.url)
        const targetUrl = url.searchParams.get('url')
        const headersParam = url.searchParams.get('headers')

        if (!targetUrl) {
            return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
            })
        }

        try {
            const customHeaders: Record<string, string> = headersParam
                ? JSON.parse(headersParam)
                : {}

            const response = await fetch(targetUrl, {
                method: request.method,
                headers: {
                    'User-Agent': customHeaders['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    ...customHeaders,
                },
                body: request.method !== 'GET' ? request.body : undefined,
            })

            const newHeaders = new Headers(response.headers)
            newHeaders.set('Access-Control-Allow-Origin', allowedOrigin)
            newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            newHeaders.set('Access-Control-Allow-Headers', '*')
            newHeaders.delete('content-security-policy')
            newHeaders.delete('x-frame-options')

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders,
            })
        } catch (e: any) {
            return new Response(JSON.stringify({ error: e.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
            })
        }
    },
}
