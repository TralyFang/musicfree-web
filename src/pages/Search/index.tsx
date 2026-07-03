import { useState, useCallback, useRef, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { pluginsAtom } from '@/core/pluginManager'
import type { Plugin } from '@/core/pluginManager'
import trackPlayer from '@/core/trackPlayer'
import MusicItemActions from '@/components/MusicItemActions'

type SearchType = 'music' | 'album' | 'artist' | 'sheet'

const SEARCH_TABS: { key: SearchType; label: string }[] = [
    { key: 'music', label: '单曲' },
    { key: 'album', label: '专辑' },
    { key: 'artist', label: '歌手' },
    { key: 'sheet', label: '歌单' },
]

const HISTORY_KEY = 'musicfree_search_history'
const MAX_HISTORY = 20

function getHistory(): string[] {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    } catch { return [] }
}

function addHistory(query: string) {
    const list = getHistory().filter(q => q !== query)
    list.unshift(query)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)))
}

function clearHistory() {
    localStorage.removeItem(HISTORY_KEY)
}

interface SearchResult {
    plugin: Plugin
    data: any[]
    page: number
    isEnd: boolean
    isLoading: boolean
}

export default function Search() {
    const [query, setQuery] = useState('')
    const [activeType, setActiveType] = useState<SearchType>('music')
    const [results, setResults] = useState<SearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [history, setHistory] = useState<string[]>(getHistory)
    const [hasSearched, setHasSearched] = useState(false)
    const [actionTarget, setActionTarget] = useState<any>(null)
    const plugins = useAtomValue(pluginsAtom)
    const loadMoreRef = useRef<HTMLDivElement>(null)

    const searchablePlugins = plugins.filter(p => p.supportedMethods.has('search'))

    // 搜索核心逻辑
    const doSearch = useCallback(async (searchQuery: string, type: SearchType, page = 1) => {
        if (!searchQuery.trim() || searchablePlugins.length === 0) return

        if (page === 1) {
            setIsSearching(true)
            setHasSearched(true)
            addHistory(searchQuery)
            setHistory(getHistory())
            setResults(searchablePlugins.map(plugin => ({
                plugin,
                data: [],
                page: 1,
                isEnd: false,
                isLoading: true,
            })))
        }

        const searchPromises = searchablePlugins.map(async (plugin, index) => {
            try {
                const result = await plugin.search(searchQuery, page, type)
                setResults(prev => {
                    const next = [...prev]
                    const existing = page > 1 ? (next[index]?.data || []) : []
                    next[index] = {
                        plugin,
                        data: [...existing, ...(result.data || [])],
                        page,
                        isEnd: result.isEnd ?? true,
                        isLoading: false,
                    }
                    return next
                })
            } catch {
                setResults(prev => {
                    const next = [...prev]
                    next[index] = { plugin, data: next[index]?.data || [], page, isEnd: true, isLoading: false }
                    return next
                })
            }
        })

        await Promise.allSettled(searchPromises)
        setIsSearching(false)
    }, [searchablePlugins])

    const handleSearch = useCallback(() => {
        doSearch(query, activeType, 1)
    }, [query, activeType, doSearch])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch()
    }

    // 切换搜索类型
    const handleTypeChange = (type: SearchType) => {
        setActiveType(type)
        if (query.trim() && hasSearched) {
            doSearch(query, type, 1)
        }
    }

    // 加载更多
    const handleLoadMore = (index: number) => {
        const r = results[index]
        if (!r || r.isEnd || r.isLoading) return
        const nextPage = r.page + 1
        setResults(prev => {
            const next = [...prev]
            next[index] = { ...next[index], isLoading: true }
            return next
        })
        // 单独加载这个插件的下一页
        r.plugin.search(query, nextPage, activeType).then(result => {
            setResults(prev => {
                const next = [...prev]
                next[index] = {
                    ...next[index],
                    data: [...next[index].data, ...(result.data || [])],
                    page: nextPage,
                    isEnd: result.isEnd ?? true,
                    isLoading: false,
                }
                return next
            })
        }).catch(() => {
            setResults(prev => {
                const next = [...prev]
                next[index] = { ...next[index], isEnd: true, isLoading: false }
                return next
            })
        })
    }

    // 从历史搜索
    const handleHistoryClick = (q: string) => {
        setQuery(q)
        doSearch(q, activeType, 1)
    }

    const handlePlayMusic = async (musicItem: any, allItems: any[]) => {
        const index = allItems.indexOf(musicItem)
        await trackPlayer.setQueueAndPlay(allItems, index >= 0 ? index : 0)
    }

    return (
        <div className="space-y-4">
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

            {/* 搜索分类标签 */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {SEARCH_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => handleTypeChange(tab.key)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                            ${activeType === tab.key
                                ? 'bg-primary-600 text-white'
                                : 'bg-white/5 text-surface-300/70 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* 无插件提示 */}
            {searchablePlugins.length === 0 && (
                <div className="text-sm text-surface-300/50 py-12 text-center">
                    请先安装插件后再搜索（前往设置页面安装）
                </div>
            )}

            {/* 搜索历史 */}
            {!hasSearched && history.length > 0 && searchablePlugins.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-surface-300">搜索历史</h3>
                        <button
                            onClick={() => { clearHistory(); setHistory([]) }}
                            className="text-xs text-surface-300/40 hover:text-surface-300/70 transition-colors"
                        >
                            清空
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {history.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleHistoryClick(item)}
                                className="px-3 py-1.5 rounded-lg bg-white/5 text-sm text-surface-300/70
                                    hover:bg-white/10 hover:text-white transition-colors"
                            >
                                {item}
                            </button>
                        ))}
                    </div>
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
                                {!result.isLoading && result.data.length > 0 && (
                                    <span className="text-xs text-surface-300/30">{result.data.length}条结果</span>
                                )}
                            </div>

                            {result.data.length > 0 ? (
                                <div className="space-y-1">
                                    {result.data.map((item: any, i: number) => (
                                        <div
                                            key={`${item.id}-${i}`}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg
                                                hover:bg-white/5 transition-colors group"
                                        >
                                            {/* 点击播放 */}
                                            <button
                                                onClick={() => handlePlayMusic(item, result.data)}
                                                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                            >
                                                <img
                                                    src={item.artwork || '/icons/logo.png'}
                                                    alt=""
                                                    className="w-10 h-10 rounded-lg object-cover bg-white/5 shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-white truncate">{item.title}</p>
                                                    <p className="text-xs text-surface-300/60 truncate">
                                                        {item.artist}{item.album ? ` · ${item.album}` : ''}
                                                    </p>
                                                </div>
                                            </button>
                                            {/* 更多操作按钮 */}
                                            <button
                                                onClick={() => setActionTarget(item)}
                                                className="p-1.5 rounded-full hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                                                aria-label="更多操作"
                                            >
                                                <img src="/icons/svg/ellipsis-vertical.svg" alt="" className="w-4 h-4 opacity-60" />
                                            </button>
                                        </div>
                                    ))}

                                    {/* 加载更多按钮 */}
                                    {!result.isEnd && (
                                        <div ref={loadMoreRef} className="flex justify-center py-2">
                                            <button
                                                onClick={() => handleLoadMore(idx)}
                                                disabled={result.isLoading}
                                                className="px-4 py-2 text-xs text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50"
                                            >
                                                {result.isLoading ? '加载中...' : '加载更多'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : !result.isLoading ? (
                                <p className="text-xs text-surface-300/40 px-3">无结果</p>
                            ) : null}
                        </section>
                    ))}
                </div>
            )}

            {/* 初始状态 */}
            {!hasSearched && history.length === 0 && searchablePlugins.length > 0 && (
                <div className="text-sm text-surface-300/50 py-12 text-center">
                    输入关键词开始搜索
                </div>
            )}

            {/* 歌曲操作面板 */}
            <MusicItemActions
                visible={!!actionTarget}
                onClose={() => setActionTarget(null)}
                musicItem={actionTarget}
            />
        </div>
    )
}
