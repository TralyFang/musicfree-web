/**
 * 插件管理器 - Web 版
 * 使用 IndexedDB 存储插件代码，localStorage 存储元数据
 */
import { atom, getDefaultStore } from 'jotai'
import axios from 'axios'
import { Plugin, PluginState } from './plugin'
import pluginMeta from './pluginMeta'
import { db } from '@/utils/db'
import { wrapWithProxy } from '@/core/proxy'

export const pluginsAtom = atom<Plugin[]>([])

class PluginManager {
    private getPlugins() {
        return getDefaultStore().get(pluginsAtom)
    }

    private setPlugins(plugins: Plugin[]) {
        getDefaultStore().set(pluginsAtom, plugins)
    }

    /** 初始化：从 IndexedDB 加载所有已安装的插件 */
    async setup() {
        try {
            const records = await db.plugins.toArray()
            const allPlugins: Plugin[] = []

            for (const record of records) {
                try {
                    const plugin = new Plugin(record.code)
                    if (plugin.state === PluginState.Mounted) {
                        allPlugins.push(plugin)
                    }
                } catch (e) {
                    console.error('Failed to load plugin:', record.name, e)
                }
            }

            this.setPlugins(allPlugins)
        } catch (e) {
            console.error('Plugin manager setup failed:', e)
        }
    }

    /** 从 URL 安装插件（支持单个 .js 和 plugins.json 批量安装） */
    async installPluginFromUrl(url: string): Promise<{ success: boolean; message?: string; pluginName?: string }> {
        try {
            // 从输入中提取 URL（用户可能粘贴带中文前缀的文本如 "插件源：https://..."）
            const urlMatch = url.match(/https?:\/\/\S+/)
            const cleanUrl = urlMatch ? urlMatch[0] : url.trim()
            if (!cleanUrl || !cleanUrl.startsWith('http')) {
                return { success: false, message: '无效的 URL' }
            }
            // 通过代理请求，避免 CORS 问题
            const proxyUrl = wrapWithProxy(cleanUrl)
            const response = await axios.get(proxyUrl, {
                timeout: 15000,
            })
            const data = response.data

            // 检测是否为 JSON 格式的插件列表
            if (typeof data === 'object' && data !== null) {
                return await this.installFromPluginList(data)
            }

            if (typeof data === 'string') {
                // 可能是 JSON 字符串
                try {
                    const parsed = JSON.parse(data)
                    if (typeof parsed === 'object' && parsed !== null && (parsed.plugins || Array.isArray(parsed))) {
                        return await this.installFromPluginList(parsed)
                    }
                } catch {
                    // 不是 JSON，当作插件代码处理
                }

                // 作为插件代码安装
                if (!data) {
                    return { success: false, message: '无法获取插件代码' }
                }
                return await this.installPluginFromCode(data, url)
            }

            return { success: false, message: '无法解析插件内容' }
        } catch (e: any) {
            return { success: false, message: e?.message ?? '网络错误' }
        }
    }

    /** 从插件列表 JSON 批量安装 */
    private async installFromPluginList(data: any): Promise<{ success: boolean; message?: string; pluginName?: string }> {
        const pluginList: Array<{ name?: string; url: string; version?: string }> =
            Array.isArray(data) ? data : (data.plugins || [])

        if (!pluginList.length) {
            return { success: false, message: '插件列表为空' }
        }

        let successCount = 0
        let failCount = 0

        for (const item of pluginList) {
            if (!item.url) continue
            try {
                const proxyUrl = wrapWithProxy(item.url)
                const resp = await axios.get(proxyUrl, {
                    timeout: 10000,
                })
                const code = resp.data
                if (typeof code === 'string' && code) {
                    const result = await this.installPluginFromCode(code, item.url)
                    if (result.success) successCount++
                    else failCount++
                } else {
                    failCount++
                }
            } catch {
                failCount++
            }
        }

        return {
            success: successCount > 0,
            message: `批量安装完成：成功 ${successCount} 个${failCount > 0 ? `，失败 ${failCount} 个` : ''}`,
            pluginName: `${successCount} 个插件`,
        }
    }

    /** 从本地文件安装插件 */
    async installPluginFromFile(file: File): Promise<{ success: boolean; message?: string; pluginName?: string }> {
        try {
            const funcCode = await file.text()
            if (!funcCode) {
                return { success: false, message: '文件为空' }
            }
            return await this.installPluginFromCode(funcCode)
        } catch (e: any) {
            return { success: false, message: e?.message ?? '读取文件失败' }
        }
    }

    /** 从代码安装插件（核心方法） */
    private async installPluginFromCode(funcCode: string, srcUrl?: string): Promise<{ success: boolean; message?: string; pluginName?: string }> {
        const plugin = new Plugin(funcCode)

        if (plugin.state !== PluginState.Mounted || !plugin.name) {
            return { success: false, message: '插件无法解析' }
        }

        const allPlugins = [...this.getPlugins()]

        // 检查是否已安装相同 hash
        const existingIndex = allPlugins.findIndex(p => p.hash === plugin.hash)
        if (existingIndex !== -1) {
            return { success: true, message: '插件已安装', pluginName: plugin.name }
        }

        // 检查是否有旧版本（同名）
        const oldIndex = allPlugins.findIndex(p => p.name === plugin.name)
        if (oldIndex !== -1) {
            // 移除旧版本
            const oldPlugin = allPlugins[oldIndex]
            await db.plugins.where('hash').equals(oldPlugin.hash).delete()
            allPlugins.splice(oldIndex, 1)
        }

        // 存储到 IndexedDB
        await db.plugins.put({
            hash: plugin.hash,
            name: plugin.name,
            platform: plugin.name,
            code: funcCode,
            version: plugin.instance.version ?? '0.0.0',
            srcUrl,
            createdAt: Date.now(),
        })

        allPlugins.push(plugin)
        this.setPlugins(allPlugins)

        return { success: true, pluginName: plugin.name }
    }

    /** 卸载插件 */
    async uninstallPlugin(hash: string) {
        const plugins = this.getPlugins().filter(p => p.hash !== hash)
        await db.plugins.where('hash').equals(hash).delete()
        this.setPlugins(plugins)
    }

    /** 卸载所有插件 */
    async uninstallAllPlugins() {
        await db.plugins.clear()
        this.setPlugins([])
    }

    /** 通过媒体项获取对应插件 */
    getByMedia(mediaItem: { platform?: string }) {
        return this.getByName(mediaItem?.platform ?? '')
    }

    /** 通过名称获取插件 */
    getByName(name: string) {
        return this.getPlugins().find(p => p.name === name)
    }

    /** 通过 hash 获取插件 */
    getByHash(hash: string) {
        return this.getPlugins().find(p => p.hash === hash)
    }

    /** 获取已启用的插件 */
    getEnabledPlugins() {
        return this.getPlugins().filter(p => pluginMeta.isPluginEnabled(p.name))
    }

    /** 获取支持搜索的插件 */
    getSearchablePlugins() {
        return this.getPlugins().filter(
            p => pluginMeta.isPluginEnabled(p.name) && p.supportedMethods.has('search'),
        )
    }

    /** 获取按顺序排序的插件 */
    getSortedPlugins() {
        const order = pluginMeta.getPluginOrder()
        return [...this.getPlugins()].sort(
            (a, b) => (order[a.name] ?? Infinity) - (order[b.name] ?? Infinity),
        )
    }

    /** 设置插件启用状态 */
    setPluginEnabled(plugin: Plugin, enabled: boolean) {
        pluginMeta.setPluginEnabled(plugin.name, enabled)
    }

    /** 设置插件排序 */
    setPluginOrder(sortedPlugins: Plugin[]) {
        const orderMap: Record<string, number> = {}
        sortedPlugins.forEach((p, i) => { orderMap[p.name] = i })
        pluginMeta.setPluginOrder(orderMap)
    }

    // ========== 插件订阅 ==========

    private readonly SUBSCRIPTION_KEY = 'musicfree-plugin-subscriptions'

    /** 获取所有订阅源 */
    getSubscriptions(): Array<{ url: string; name?: string; lastUpdated?: number }> {
        try {
            const raw = localStorage.getItem(this.SUBSCRIPTION_KEY)
            return raw ? JSON.parse(raw) : []
        } catch { return [] }
    }

    /** 添加订阅源 */
    addSubscription(url: string, name?: string) {
        const subs = this.getSubscriptions()
        if (subs.some(s => s.url === url)) return // 已存在
        subs.push({ url, name: name || url, lastUpdated: 0 })
        localStorage.setItem(this.SUBSCRIPTION_KEY, JSON.stringify(subs))
    }

    /** 移除订阅源 */
    removeSubscription(url: string) {
        const subs = this.getSubscriptions().filter(s => s.url !== url)
        localStorage.setItem(this.SUBSCRIPTION_KEY, JSON.stringify(subs))
    }

    /** 更新单个订阅 */
    async updateSubscription(url: string): Promise<{ success: boolean; message: string }> {
        const result = await this.installPluginFromUrl(url)
        if (result.success) {
            const subs = this.getSubscriptions()
            const idx = subs.findIndex(s => s.url === url)
            if (idx !== -1) {
                subs[idx].lastUpdated = Date.now()
                localStorage.setItem(this.SUBSCRIPTION_KEY, JSON.stringify(subs))
            }
        }
        return { success: result.success, message: result.message || '更新成功' }
    }

    /** 更新全部订阅 */
    async updateAllSubscriptions(): Promise<{ success: number; failed: number }> {
        const subs = this.getSubscriptions()
        let success = 0, failed = 0
        for (const sub of subs) {
            const result = await this.updateSubscription(sub.url)
            if (result.success) success++
            else failed++
        }
        return { success, failed }
    }
}

const pluginManager = new PluginManager()
export default pluginManager
export { Plugin, PluginState } from './plugin'
export { default as pluginMeta } from './pluginMeta'
