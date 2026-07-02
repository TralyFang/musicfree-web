/**
 * 插件沙箱执行引擎 - Web 版
 * 从主项目迁移并适配浏览器环境
 */
import axios from 'axios'
import * as cheerio from 'cheerio'
import CryptoJs from 'crypto-js'
import dayjs from 'dayjs'
import bigInt from 'big-integer'
import qs from 'qs'
import he from 'he'
import pluginMeta from './pluginMeta'

const sha256 = CryptoJs.SHA256

// 插件可用的包
const packages: Record<string, any> = {
    cheerio,
    'crypto-js': CryptoJs,
    axios,
    dayjs,
    'big-integer': bigInt,
    qs,
    he,
}

const _require = (packageName: string) => {
    const pkg = packages[packageName]
    if (!pkg) {
        throw new Error(`Package "${packageName}" is not available in web environment`)
    }
    // 返回一个 proxy 或包装对象，避免修改 frozen 模块
    if (Object.isFrozen(pkg) || Object.isSealed(pkg) || !Object.isExtensible(pkg)) {
        const wrapper = { ...pkg, default: pkg }
        return wrapper
    }
    try {
        pkg.default = pkg
    } catch {
        // ignore if cannot set
    }
    return pkg
}

const _console = {
    log: (...args: any[]) => console.log('[Plugin]', ...args),
    warn: (...args: any[]) => console.warn('[Plugin]', ...args),
    info: (...args: any[]) => console.info('[Plugin]', ...args),
    error: (...args: any[]) => console.error('[Plugin]', ...args),
}

export enum PluginState {
    Initializing,
    Loading,
    Mounted,
    Error,
}

export enum PluginErrorReason {
    VersionNotMatch,
    CannotParse,
}

/** 重置媒体项，添加 platform 标记 */
function resetMediaItem(item: any, platform?: string, keepOriginal = false) {
    if (!item) return item
    if (platform) {
        item.platform = platform
    }
    if (!keepOriginal) {
        // 清理内部序列化 key
        delete item?.$
        delete item?.internalSerializeKey
    }
    return item
}

export class Plugin {
    public name: string = ''
    public hash: string = ''
    public state: PluginState = PluginState.Initializing
    public errorReason?: PluginErrorReason
    public instance: any = { platform: '' }
    public supportedMethods: Set<string> = new Set()

    constructor(funcCode: string) {
        this.mountPlugin(funcCode)
    }

    private mountPlugin(funcCode: string) {
        this.state = PluginState.Loading
        let _instance: any

        const _module: any = { exports: {} }
        try {
            const env = {
                getUserVariables: () => pluginMeta.getUserVariables(this.name),
                get userVariables() { return this.getUserVariables() ?? {} },
                appVersion: '0.1.0',
                os: 'web',
                lang: 'zh-CN',
            }
            const _process = {
                platform: 'web',
                version: '0.1.0',
                env,
            }

            // eslint-disable-next-line no-new-func
            _instance = Function(`
                'use strict';
                return function(require, __musicfree_require, module, exports, console, env, URL, process) {
                    ${funcCode}
                }
            `)()(
                _require,
                _require,
                _module,
                _module.exports,
                _console,
                env,
                URL,
                _process,
            )

            if (_module.exports.default) {
                _instance = _module.exports.default
            } else {
                _instance = _module.exports
            }

            // 过滤 userVariables
            if (Array.isArray(_instance.userVariables)) {
                _instance.userVariables = _instance.userVariables.filter(
                    (it: any) => it?.key,
                )
            }

            this.instance = _instance
            this.name = _instance.platform ?? ''
            this.supportedMethods = new Set(
                Object.keys(_instance).filter(key => typeof _instance[key] === 'function'),
            )

            // 计算 hash
            if (this.name) {
                this.hash = sha256(funcCode).toString(CryptoJs.enc.Hex).slice(0, 16)
                this.state = PluginState.Mounted
            } else {
                this.state = PluginState.Error
                this.errorReason = PluginErrorReason.CannotParse
            }
        } catch (e: any) {
            console.error('Plugin mount error:', e)
            this.state = PluginState.Error
            this.errorReason = PluginErrorReason.CannotParse
            this.instance = { platform: '' }
        }
    }

    // ========== 插件方法包装 ==========

    async search<T extends string>(
        query: string,
        page: number,
        type: T,
    ): Promise<{ isEnd: boolean; data: any[] }> {
        if (!this.instance.search) return { isEnd: true, data: [] }
        try {
            const result = (await this.instance.search(query, page, type)) ?? {}
            if (Array.isArray(result.data)) {
                result.data.forEach((item: any) => resetMediaItem(item, this.name))
                return { isEnd: result.isEnd ?? true, data: result.data }
            }
            return { isEnd: true, data: [] }
        } catch (e) {
            console.error('Plugin search error:', e)
            return { isEnd: true, data: [] }
        }
    }

    async getMediaSource(
        musicItem: any,
        quality: string = 'standard',
    ): Promise<{ url: string; headers?: Record<string, string> } | null> {
        if (!this.instance.getMediaSource) {
            return musicItem.url ? { url: musicItem.url } : null
        }
        try {
            const result = await this.instance.getMediaSource(musicItem, quality)
            if (result?.url) return result
            return musicItem.url ? { url: musicItem.url } : null
        } catch (e) {
            console.error('Plugin getMediaSource error:', e)
            return null
        }
    }

    async getLyric(musicItem: any): Promise<{ rawLrc?: string; translation?: string } | null> {
        if (!this.instance.getLyric) return null
        try {
            return (await this.instance.getLyric(musicItem)) ?? null
        } catch (e) {
            console.error('Plugin getLyric error:', e)
            return null
        }
    }

    async getAlbumInfo(albumItem: any, page: number = 1): Promise<any> {
        if (!this.instance.getAlbumInfo) return null
        try {
            const result = await this.instance.getAlbumInfo(albumItem, page)
            result?.musicList?.forEach((item: any) => resetMediaItem(item, this.name))
            return result
        } catch (e) {
            return null
        }
    }

    async getTopLists(): Promise<any[]> {
        if (!this.instance.getTopLists) return []
        try {
            return (await this.instance.getTopLists()) ?? []
        } catch { return [] }
    }

    async getTopListDetail(topListItem: any, page: number): Promise<any> {
        if (!this.instance.getTopListDetail) return null
        try {
            const result = await this.instance.getTopListDetail(topListItem, page)
            result?.musicList?.forEach((item: any) => resetMediaItem(item, this.name))
            return result
        } catch { return null }
    }

    async getRecommendSheetTags(): Promise<any> {
        if (!this.instance.getRecommendSheetTags) return { data: [] }
        try {
            return (await this.instance.getRecommendSheetTags()) ?? { data: [] }
        } catch { return { data: [] } }
    }

    async getRecommendSheetsByTag(tag: any, page: number = 1): Promise<any> {
        if (!this.instance.getRecommendSheetsByTag) return { isEnd: true, data: [] }
        try {
            const result = await this.instance.getRecommendSheetsByTag(tag, page)
            result?.data?.forEach((item: any) => resetMediaItem(item, this.name))
            return result ?? { isEnd: true, data: [] }
        } catch { return { isEnd: true, data: [] } }
    }

    async getMusicSheetInfo(sheetItem: any, page: number = 1): Promise<any> {
        if (!this.instance.getMusicSheetInfo) return null
        try {
            const result = await this.instance.getMusicSheetInfo(sheetItem, page)
            result?.musicList?.forEach((item: any) => resetMediaItem(item, this.name))
            return result
        } catch { return null }
    }

    async importMusicSheet(urlLike: string): Promise<any[]> {
        if (!this.instance.importMusicSheet) return []
        try {
            const result = (await this.instance.importMusicSheet(urlLike)) ?? []
            result.forEach((item: any) => resetMediaItem(item, this.name))
            return result
        } catch { return [] }
    }
}
