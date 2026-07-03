import { useState, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { pluginsAtom } from '@/core/pluginManager'
import trackPlayer from '@/core/trackPlayer'
import type { Plugin } from '@/core/pluginManager'

interface TopListGroup {
    title?: string
    data: any[]
}

export default function TopList() {
    const plugins = useAtomValue(pluginsAtom)
    const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null)
    const [topLists, setTopLists] = useState<TopListGroup[]>([])
    const [selectedList, setSelectedList] = useState<any>(null)
    const [musicList, setMusicList] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [loadingDetail, setLoadingDetail] = useState(false)

    const topListPlugins = plugins.filter(p => p.supportedMethods.has('getTopLists'))

    useEffect(() => {
        if (topListPlugins.length > 0 && !selectedPlugin) {
            setSelectedPlugin(topListPlugins[0])
        }
    }, [topListPlugins.length])

    useEffect(() => {
        if (!selectedPlugin) return
        loadTopLists()
    }, [selectedPlugin])

    const loadTopLists = async () => {
        if (!selectedPlugin) return
        setLoading(true)
        setTopLists([])
        setSelectedList(null)
        setMusicList([])
        try {
            const result = await selectedPlugin.getTopLists()
            // result 可能是 [{title, data: [...]}] 或 [...items]
            if (Array.isArray(result)) {
                if (result.length > 0 && result[0]?.data) {
                    setTopLists(result as TopListGroup[])
                } else {
                    setTopLists([{ data: result }])
                }
            }
        } catch (e) {
            console.error('Load top lists error:', e)
        }
        setLoading(false)
    }

    const loadTopListDetail = async (item: any) => {
        if (!selectedPlugin) return
        setSelectedList(item)
        setLoadingDetail(true)
        setMusicList([])
        try {
            const result = await selectedPlugin.getTopListDetail(item, 1)
            if (result?.musicList) {
                setMusicList(result.musicList)
            }
        } catch (e) {
            console.error('Load top list detail error:', e)
        }
        setLoadingDetail(false)
    }

    const handlePlayAll = async () => {
        if (musicList.length === 0) return
        await trackPlayer.setQueueAndPlay(musicList, 0)
    }

    const handlePlayItem = async (index: number) => {
        await trackPlayer.setQueueAndPlay(musicList, index)
    }

    return (
        <div className="space-y-6">
            <h1 className="text-xl md:text-2xl font-bold text-white">榜单</h1>

            {topListPlugins.length === 0 ? (
                <p className="text-sm text-surface-300/50 py-12 text-center">
                    暂无支持榜单的插件，请先安装插件
                </p>
            ) : (
                <>
                    {/* 插件选择 */}
                    <div className="flex flex-wrap gap-2">
                        {topListPlugins.map(plugin => (
                            <button
                                key={plugin.hash}
                                onClick={() => setSelectedPlugin(plugin)}
                                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                    selectedPlugin?.hash === plugin.hash
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-white/5 text-surface-300/70 hover:bg-white/10'
                                }`}
                            >
                                {plugin.name}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-6 min-h-0">
                        {/* 左侧：榜单列表 */}
                        <div className="w-48 md:w-56 shrink-0 space-y-4 overflow-y-auto max-h-[calc(100vh-250px)]">
                            {loading ? (
                                <p className="text-xs text-surface-300/40 text-center py-4">加载中...</p>
                            ) : (
                                topLists.map((group, gi) => (
                                    <div key={gi}>
                                        {group.title && (
                                            <p className="text-xs text-surface-300/50 font-medium mb-2">{group.title}</p>
                                        )}
                                        <div className="space-y-0.5">
                                            {group.data.map((item: any, i: number) => (
                                                <button
                                                    key={`${gi}-${i}`}
                                                    onClick={() => loadTopListDetail(item)}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                                                        selectedList === item
                                                            ? 'bg-primary-600/20 text-primary-400'
                                                            : 'text-surface-300/70 hover:bg-white/5'
                                                    }`}
                                                >
                                                    {item.title || item.name || '未知榜单'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* 右侧：歌曲列表 */}
                        <div className="flex-1 min-w-0">
                            {selectedList && (
                                <div className="flex items-center gap-3 mb-4">
                                    {selectedList.coverImg && (
                                        <img
                                            src={selectedList.coverImg}
                                            alt=""
                                            className="w-12 h-12 rounded-lg object-cover"
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-semibold text-white truncate">
                                            {selectedList.title || selectedList.name}
                                        </h3>
                                        {selectedList.description && (
                                            <p className="text-xs text-surface-300/50 truncate mt-0.5">
                                                {selectedList.description}
                                            </p>
                                        )}
                                    </div>
                                    {musicList.length > 0 && (
                                        <button
                                            onClick={handlePlayAll}
                                            className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500
                                                text-white text-xs transition-colors flex items-center gap-1 shrink-0"
                                        >
                                            <img src="/icons/svg/play.svg" alt="" className="w-3.5 h-3.5" />
                                            播放全部
                                        </button>
                                    )}
                                </div>
                            )}

                            {loadingDetail ? (
                                <p className="text-xs text-surface-300/40 text-center py-8">加载中...</p>
                            ) : musicList.length > 0 ? (
                                <div className="space-y-0.5 overflow-y-auto max-h-[calc(100vh-300px)]">
                                    {musicList.map((item, index) => (
                                        <button
                                            key={`${item.platform}-${item.id}-${index}`}
                                            onClick={() => handlePlayItem(index)}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg
                                                hover:bg-white/5 transition-colors text-left group"
                                        >
                                            <span className="text-xs text-surface-300/30 w-6 text-center shrink-0">
                                                {index + 1}
                                            </span>
                                            <img
                                                src={item.artwork || '/icons/logo.png'}
                                                alt=""
                                                className="w-9 h-9 rounded object-cover bg-white/5 shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white truncate">{item.title}</p>
                                                <p className="text-xs text-surface-300/50 truncate">
                                                    {item.artist}{item.album ? ` · ${item.album}` : ''}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : selectedList ? (
                                <p className="text-xs text-surface-300/40 text-center py-8">暂无数据</p>
                            ) : (
                                <p className="text-xs text-surface-300/40 text-center py-8">
                                    ← 选择一个榜单查看详情
                                </p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
