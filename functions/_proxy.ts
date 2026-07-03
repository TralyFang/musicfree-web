/**
 * Cloudflare Pages Function - CORS 代理
 * 路径: /_proxy?url=xxx&headers=xxx
 * 与前端同域，无 CORS 问题；但也做 Origin 白名单兼容多域名场景
 */

/** 允许的来源域名白名单（支持多域名） */
const ALLOWED_ORIGINS = [
    'https://music.dailywhy.top',
    'http://localhost:5173',
    'http://localhost:4173',
]

/** 根据请求 Origin 返回允许的 ACAO 值 */
function getAllowedOrigin(origin: string | null): string {
    if (!origin) return '*'
    if (ALLOWED_ORIGINS.includes(origin)) return origin
    // 匹配 *.pages.dev 预览域名
    if (/^https:\/\/[\w-]+\.pages\.dev$/.test(origin)) return origin
    return '*'
}

export const onRequest = async (context: any) => {
    const { request } = context
    const url = new URL(request.url)
    const origin = request.headers.get('Origin')
    const allowedOrigin = getAllowedOrigin(origin)

    // 处理 OPTIONS 预检
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

    const targetUrl = url.searchParams.get('url')
    if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
        })
    }

    // 解析自定义 headers
    let customHeaders: Record<string, string> = {}
    const headersParam = url.searchParams.get('headers')
    if (headersParam) {
        try {
            customHeaders = JSON.parse(headersParam)
        } catch { /* ignore */ }
    }

    try {
        const fetchHeaders: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ...customHeaders,
        }

        // 非 GET/HEAD 请求需要转发 body
        let body: ArrayBuffer | null = null
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            body = await request.arrayBuffer()
            // 转发 content-type
            const contentType = request.headers.get('Content-Type')
            if (contentType) {
                fetchHeaders['Content-Type'] = contentType
            }
        }

        const response = await fetch(targetUrl, {
            method: request.method,
            headers: fetchHeaders,
            body,
            redirect: 'follow',
        })

        // 创建新的响应并添加 CORS headers
        const newHeaders = new Headers(response.headers)
        newHeaders.set('Access-Control-Allow-Origin', allowedOrigin)
        newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        newHeaders.set('Access-Control-Allow-Headers', '*')
        newHeaders.delete('Content-Security-Policy')
        newHeaders.delete('X-Frame-Options')

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
        })
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 502,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': allowedOrigin,
            },
        })
    }
}
