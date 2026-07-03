import { useState, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { pluginsAtom } from '@/core/pluginManager'
import trackPlayer from '@/core/trackPlayer'
import type { Plugin } from '@/core/pluginManager'

export default function Recommend() {
    const plugins = useAtomValue(pluginsAtom)
    const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null)
    const [tags, setTags] = useState<any[]>([])
    const [selectedTag, setSelectedTag] = useState<any>(null)
    const [sheets, setSheets] = useState<any[]>([])
    const [selectedSheet, setSelectedSheet] = useState<any>(null)
    const [musicList, setMusicList] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [loadingDetail, setLoadingDetail] = useState(false)

    const recommendPlugins = plugins.filter(p => p.supportedMethods.has('getRecommendSheetsByTag'))

    useEffect(() => {
        if (recommendPlugins.length > 0 && !selectedPlugin) {
            setSelectedPlugin(recommendPlugins[0])
        }
    }, [recommendPlugins.length])

    useEffect(() => {
        if (!selectedPlugin) return
        loadTags()
    }, [selectedPlugin])

    const loadTags = async () => {
        if (!selectedPlugin) return
        try {
            const result = await selectedPlugin.getRecommendSheetTags()
            const tagList = result?.data || []
            setTags(tagList)
            // 自动选第一个标签
            if (tagList.length > 0) {
                const firstTag = tagList[0]?.data?.[0] || tagList[0]
                setSelectedTag(firstTag)
                loadSheets(firstTag)
            }
        } catch { setTags([]) }
    }

    const loadSheets = async (tag: any) => {
        if (!selectedPlugin) return
        setSelectedTag(tag)
        setLoading(true)
        setSheets([])
        setSelectedSheet(null)
        setMusicList([])
        try {
            const result = await selectedPlugin.getRecommendSheetsByTag(tag, 1)
            setSheets(result?.data || [])
        } catch { setSheets([]) }
        setLoading(false)
    }

    const loadSheetDetail = async (sheet: any) => {
        if (!selectedPlugin) return
        setSelectedSheet(sheet)
        setLoadingDetail(true)
        setMusicList([])
        try {
            const result = await selectedPlugin.getMusicSheetInfo(sheet, 1)
            setMusicList(result?.musicList || [])
        } catch { setMusicList([]) }
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
            <h1 className="text-xl md:text-2xl font-bold text-white">推荐歌单</h1>

            {recommendPlugins.length === 0 ? (
                <p className="text-sm text-surface-300/50 py-12 text-center">
                    暂无支持推荐歌单的插件，请先安装插件
                </p>
            ) : (
                <>
                    {/* 插件选择 */}
                    <div className="flex flex-wrap gap-2">
                        {recommendPlugins.map(plugin => (
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

                    {/* 标签 */}
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {tags.map((tagGroup, gi) => {
                                const items = tagGroup?.data || [tagGroup]
                                return items.map((tag: any, ti: number) => (
                                    <button
                                        key={`${gi}-${ti}`}
                                        onClick={() => loadSheets(tag)}
                                        className={`px-2.5 py-1 rounded text-xs transition-colors ${
                                            selectedTag === tag
                                                ? 'bg-primary-600/30 text-primary-400'
                                                : 'bg-white/5 text-surface-300/60 hover:bg-white/10'
                                        }`}
                                    >
                                        {tag.title || tag.tag || tag.name || '全部'}
                                    </button>
                                ))
                            })}
                        </div>
                    )}

                    {/* 歌单详情视图 */}
                    {selectedSheet ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => { setSelectedSheet(null); setMusicList([]) }}
                                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                                >
                                    <img src="/icons/svg/arrow-left.svg" alt="返回" className="w-4 h-4 opacity-70" />
                                </button>
                                {selectedSheet.coverImg && (
                                    <img src={selectedSheet.coverImg} alt="" className="w-12 h-12 rounded-lg object-cover" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-semibold text-white truncate">
                                        {selectedSheet.title || selectedSheet.name}
                                    </h3>
                                    {selectedSheet.description && (
                                        <p className="text-xs text-surface-300/50 truncate">{selectedSheet.description}</p>
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

                            {loadingDetail ? (
                                <p className="text-xs text-surface-300/40 text-center py-8">加载中...</p>
                            ) : (
                                <div className="space-y-0.5">
                                    {musicList.map((item, index) => (
                                        <button
                                            key={`${item.platform}-${item.id}-${index}`}
                                            onClick={() => handlePlayItem(index)}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg
                                                hover:bg-white/5 transition-colors text-left"
                                        >
                                            <span className="text-xs text-surface-300/30 w-6 text-center shrink-0">{index + 1}</span>
                                            <img src={item.artwork || '/icons/logo.png'} alt="" className="w-9 h-9 rounded object-cover bg-white/5 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white truncate">{item.title}</p>
                                                <p className="text-xs text-surface-300/50 truncate">{item.artist}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* 歌单网格 */
                        loading ? (
                            <p className="text-xs text-surface-300/40 text-center py-8">加载中...</p>
                        ) : sheets.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {sheets.map((sheet, index) => (
                                    <button
                                        key={index}
                                        onClick={() => loadSheetDetail(sheet)}
                                        className="text-left group"
                                    >
                                        <div className="aspect-square rounded-lg overflow-hidden bg-white/5 mb-2">
                                            <img
                                                src={sheet.coverImg || sheet.artwork || '/icons/logo.png'}
                                                alt=""
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                        </div>
                                        <p className="text-xs text-surface-300/80 line-clamp-2">
                                            {sheet.title || sheet.name}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-surface-300/40 text-center py-8">暂无推荐歌单</p>
                        )
                    )}
                </>
            )}
        </div>
    )
}
