/**
 * CORS 代理策略
 * 先尝试直连，失败后走代理
 */
import axios from 'axios'

/** 代理 Worker 地址 - 用户可在设置中修改 */
const PROXY_STORAGE_KEY = 'musicfree-proxy-url'
const DEFAULT_PROXY_URL = 'https://musicfree-cors-proxy.traly.workers.dev'

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
        const originalUrl = config.url || ''

        // 跳过已经是代理地址的请求
        if (originalUrl.startsWith(proxyBase)) return config

        // 跳过相对路径和数据 URL
        if (!originalUrl.startsWith('http')) return config

        const params = new URLSearchParams({ url: originalUrl })
        if (config.headers) {
            const headerObj: Record<string, string> = {}
            for (const [key, value] of Object.entries(config.headers)) {
                if (typeof value === 'string' && key.toLowerCase() !== 'content-type') {
                    headerObj[key] = value
                }
            }
            if (Object.keys(headerObj).length > 0) {
                params.set('headers', JSON.stringify(headerObj))
            }
        }

        config.url = `${proxyBase}?${params.toString()}`
        // 清除已被转移到 query 的 headers
        config.headers = {} as any
        return config
    })

    return instance
}
