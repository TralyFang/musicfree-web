/**
 * CORS 代理策略
 * 先尝试直连，失败后走代理
 */
import axios from 'axios'

/** 代理 Worker 地址 - 用户可在设置中修改 */
const PROXY_STORAGE_KEY = 'musicfree-proxy-url'
const DEFAULT_PROXY_URL = '/_proxy'

/** 获取代理地址 */
export function getProxyUrl(): string {
    return localStorage.getItem(PROXY_STORAGE_KEY) || DEFAULT_PROXY_URL
}

/** 设置代理地址 */
export function setProxyUrl(url: string) {
    localStorage.setItem(PROXY_STORAGE_KEY, url)
}

/** 通过代理包装 URL */
export function wrapWithProxy(url: string, headers?: Record<string, string>): string {
    const proxyBase = getProxyUrl()
    if (!proxyBase) return url

    const params = new URLSearchParams({ url })
    if (headers && Object.keys(headers).length > 0) {
        params.set('headers', JSON.stringify(headers))
    }
    return `${proxyBase}?${params.toString()}`
}

/** 智能请求：先直连，失败后走代理 */
export async function fetchWithProxy(
    url: string,
    options?: { headers?: Record<string, string>; timeout?: number }
) {
    const { headers, timeout = 8000 } = options || {}

    // 先尝试直连
    try {
        const response = await axios.get(url, { headers, timeout })
        return response
    } catch {
        // 直连失败，尝试走代理
        const proxyBase = getProxyUrl()
        if (!proxyBase) throw new Error('Direct request failed and no proxy configured')

        const proxyUrl = wrapWithProxy(url, headers)
        return axios.get(proxyUrl, { timeout: timeout * 2 })
    }
}

/**
 * 创建代理版 axios 实例（注入到插件沙箱中）
 * 自动为所有请求添加代理
 */
export function createProxyAxios() {
    const proxyBase = getProxyUrl()

    if (!proxyBase) {
        // 无代理配置时，使用原始 axios
        return axios
    }

    const instance = axios.create()

    // 请求拦截器：将请求通过代理转发
    instance.interceptors.request.use((config) => {
        let originalUrl = config.url || ''

        // 跳过已经是代理地址的请求
        if (originalUrl.startsWith(proxyBase)) return config

        // 跳过相对路径和数据 URL
        if (!originalUrl.startsWith('http')) return config

        // 将 axios params 合并到目标 URL 的 query string 中
        if (config.params && Object.keys(config.params).length > 0) {
            const urlObj = new URL(originalUrl)
            for (const [key, value] of Object.entries(config.params)) {
                if (value !== undefined && value !== null) {
                    urlObj.searchParams.set(key, String(value))
                }
            }
            originalUrl = urlObj.toString()
            // 清除 params，防止 axios 再次追加到代理 URL 上
            config.params = undefined
        }

        // 收集自定义 headers（跳过浏览器不允许设置的 unsafe headers）
        const unsafeHeaders = new Set(['host', 'user-agent', 'content-length', 'connection'])
        const headerObj: Record<string, string> = {}
        if (config.headers) {
            for (const [key, value] of Object.entries(config.headers)) {
                if (typeof value === 'string' && !unsafeHeaders.has(key.toLowerCase())) {
                    headerObj[key] = value
                }
            }
        }

        const proxyParams = new URLSearchParams({ url: originalUrl })
        if (Object.keys(headerObj).length > 0) {
            proxyParams.set('headers', JSON.stringify(headerObj))
        }

        config.url = `${proxyBase}?${proxyParams.toString()}`
        // 清除已被转移到 query 的 headers（保留 content-type 用于 POST 请求）
        const contentType = config.headers?.['Content-Type'] || config.headers?.['content-type']
        config.headers = {} as any
        if (contentType && config.method && config.method.toLowerCase() !== 'get') {
            config.headers['Content-Type'] = contentType
        }
        return config
    })

    return instance
}
