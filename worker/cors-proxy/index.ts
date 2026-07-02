/**
 * Cloudflare Worker CORS 代理
 * 用于解决浏览器跨域限制
 */
export interface Env {}

export default {
    async fetch(request: Request, _env: Env): Promise<Response> {
        // 处理预检请求
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
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
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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
            newHeaders.set('Access-Control-Allow-Origin', '*')
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
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            })
        }
    },
}
