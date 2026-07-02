/** 插件元数据管理 - Web 版（使用 localStorage） */

const STORAGE_KEY = 'musicfree-plugin-meta'

interface IPluginMetaData {
    order: Record<string, number>
    disabledPlugins: string[]
    userVariables: Record<string, Record<string, string>>
    alternativePlugins: Record<string, string>
}

function getMetaData(): IPluginMetaData {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) return JSON.parse(raw)
    } catch {}
    return { order: {}, disabledPlugins: [], userVariables: {}, alternativePlugins: {} }
}

function setMetaData(data: IPluginMetaData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

class PluginMeta {
    getPluginOrder(): Record<string, number> {
        return getMetaData().order
    }

    setPluginOrder(orderMap: Record<string, number>) {
        const meta = getMetaData()
        meta.order = orderMap
        setMetaData(meta)
    }

    isPluginEnabled(name: string): boolean {
        return !getMetaData().disabledPlugins.includes(name)
    }

    setPluginEnabled(name: string, enabled: boolean) {
        const meta = getMetaData()
        if (enabled) {
            meta.disabledPlugins = meta.disabledPlugins.filter(n => n !== name)
        } else if (!meta.disabledPlugins.includes(name)) {
            meta.disabledPlugins.push(name)
        }
        setMetaData(meta)
    }

    getUserVariables(name: string): Record<string, string> {
        return getMetaData().userVariables[name] ?? {}
    }

    setUserVariables(name: string, vars: Record<string, string>) {
        const meta = getMetaData()
        meta.userVariables[name] = vars
        setMetaData(meta)
    }

    getAlternativePlugin(name: string): string | null {
        return getMetaData().alternativePlugins[name] ?? null
    }

    setAlternativePlugin(name: string, alternative: string) {
        const meta = getMetaData()
        meta.alternativePlugins[name] = alternative
        setMetaData(meta)
    }
}

const pluginMeta = new PluginMeta()
export default pluginMeta
