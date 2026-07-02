import { useState, useCallback } from 'react'
import { useAtomValue } from 'jotai'
import { pluginsAtom } from '@/core/pluginManager'
import type { Plugin } from '@/core/pluginManager'
import trackPlayer from '@/core/trackPlayer'

interface SearchResult {
    plugin: Plugin
    data: any[]
    isEnd: boolean
    isLoading: boolean
}

export default function Search() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const plugins = useAtomValue(pluginsAtom)

    const searchablePlugins = plugins.filter(p => p.supportedMethods.has('search'))

    const handleSearch = useCallback(async () => {
        if (!query.trim() || searchablePlugins.length === 0) return

        setIsSearching(true)
        setResults(searchablePlugins.map(plugin => ({
            plugin,
            data: [],
            isEnd: false,
            isLoading: true,
        })))

        // 并行搜索所有插件
        const searchPromises = searchablePlugins.map(async (plugin, index) => {
            try {
                const result = await plugin.search(query, 1, 'music')
                setResults(prev => {
                    const next = [...prev]
                    next[index] = { plugin, data: result.data, isEnd: result.isEnd, isLoading: false }
                    return next
                })
            } catch {
                setResults(prev => {
                    const next = [...prev]
                    next[index] = { plugin, data: [], isEnd: true, isLoading: false }
                    return next
                })
            }
        })

        await Promise.allSettled(searchPromises)
        setIsSearching(false)
    }, [query, searchablePlugins])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch()
    }

    const handlePlayMusic = async (musicItem: any, allItems: any[]) => {
        const index = allItems.indexOf(musicItem)
        await trackPlayer.setQueueAndPlay(allItems, index >= 0 ? index : 0)
    }

    return (
        <div className="space-y-6">
            <h1 className="text-xl md:text-2xl font-bold text-white">搜索</h1>

            {/* 搜索输入框 */}
            <div className="relative max-w-xl flex gap-2">
                <div className="relative flex-1">
                    <img
                        src="/icons/svg/magnifying-glass.svg"
                        alt="搜索"
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50"
                    />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="搜索歌曲、专辑、歌手..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10
                            text-white placeholder:text-surface-300/40
                            focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.07]
                            transition-all"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={!query.trim() || isSearching}
                    className="px-5 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50
                        text-white text-sm font-medium transition-colors shrink-0"
                >
                    搜索
                </button>
            </div>

            {/* 无插件提示 */}
            {searchablePlugins.length === 0 && (
                <div className="text-sm text-surface-300/50 py-12 text-center">
                    请先安装插件后再搜索（前往设置页面安装）
                </div>
            )}

            {/* 搜索结果 */}
            {results.length > 0 && (
                <div className="space-y-6">
                    {results.map((result, idx) => (
                        <section key={idx} className="space-y-3">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium text-surface-300">
                                    {result.plugin.name}
                                </h3>
                                {result.isLoading && (
                                    <span className="text-xs text-primary-400 animate-pulse">搜索中...</span>
                                )}
                            </div>

                            {result.data.length > 0 ? (
                                <div className="space-y-1">
                                    {result.data.map((item: any, i: number) => (
                                        <button
                                            key={`${item.id}-${i}`}
                                            onClick={() => handlePlayMusic(item, result.data)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                                                hover:bg-white/5 transition-colors text-left group"
                                        >
                                            {/* 封面 */}
                                            <img
                                                src={item.artwork || '/icons/logo.png'}
                                                alt=""
                                                className="w-10 h-10 rounded-lg object-cover bg-white/5 shrink-0"
                                            />
                                            {/* 歌曲信息 */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white truncate">{item.title}</p>
                                                <p className="text-xs text-surface-300/60 truncate">
                                                    {item.artist}{item.album ? ` · ${item.album}` : ''}
                                                </p>
                                            </div>
                                            {/* 播放图标 */}
                                            <img
                                                src="/icons/svg/play-circle-outline.svg"
                                                alt="播放"
                                                className="w-5 h-5 opacity-0 group-hover:opacity-70 transition-opacity shrink-0"
                                            />
                                        </button>
                                    ))}
                                </div>
                            ) : !result.isLoading ? (
                                <p className="text-xs text-surface-300/40 px-3">无结果</p>
                            ) : null}
                        </section>
                    ))}
                </div>
            )}

            {/* 初始状态 */}
            {results.length === 0 && searchablePlugins.length > 0 && (
                <div className="text-sm text-surface-300/50 py-12 text-center">
                    输入关键词开始搜索
                </div>
            )}
        </div>
    )
}
