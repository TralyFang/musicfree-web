import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import pluginManager from '@/core/pluginManager'
import trackPlayer from '@/core/trackPlayer'

export default function AlbumDetail() {
    const location = useLocation()
    const navigate = useNavigate()
    const albumItem = location.state?.albumItem
    const [musicList, setMusicList] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!albumItem) return
        loadAlbumInfo()
    }, [albumItem])

    const loadAlbumInfo = async () => {
        if (!albumItem) return
        setLoading(true)
        const plugin = pluginManager.getByMedia(albumItem)
        if (plugin) {
            try {
                const result = await plugin.getAlbumInfo(albumItem, 1)
                setMusicList(result?.musicList || [])
            } catch { setMusicList([]) }
        }
        setLoading(false)
    }

    const handlePlayAll = async () => {
        if (musicList.length === 0) return
        await trackPlayer.setQueueAndPlay(musicList, 0)
    }

    const handlePlayItem = async (index: number) => {
        await trackPlayer.setQueueAndPlay(musicList, index)
    }

    if (!albumItem) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-surface-300/50">无专辑信息</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* 头部 */}
            <div className="flex items-start gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full hover:bg-white/5 transition-colors mt-1"
                    aria-label="返回"
                >
                    <img src="/icons/svg/arrow-left.svg" alt="返回" className="w-5 h-5 opacity-70" />
                </button>
                <img
                    src={albumItem.artwork || '/icons/logo.png'}
                    alt=""
                    className="w-24 h-24 md:w-32 md:h-32 rounded-xl object-cover bg-white/5 shrink-0"
                />
                <div className="flex-1 min-w-0 py-1">
                    <h1 className="text-lg md:text-xl font-bold text-white truncate">
                        {albumItem.title || albumItem.album}
                    </h1>
                    <p className="text-sm text-surface-300/60 mt-1 truncate">
                        {albumItem.artist}
                    </p>
                    {albumItem.description && (
                        <p className="text-xs text-surface-300/40 mt-2 line-clamp-2">
                            {albumItem.description}
                        </p>
                    )}
                    {musicList.length > 0 && (
                        <button
                            onClick={handlePlayAll}
                            className="mt-3 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500
                                text-white text-sm font-medium transition-colors inline-flex items-center gap-1.5"
                        >
                            <img src="/icons/svg/play.svg" alt="" className="w-4 h-4" />
                            播放全部
                        </button>
                    )}
                </div>
            </div>

            {/* 歌曲列表 */}
            {loading ? (
                <p className="text-xs text-surface-300/40 text-center py-8">加载中...</p>
            ) : musicList.length > 0 ? (
                <div className="space-y-0.5">
                    {musicList.map((item, index) => (
                        <button
                            key={`${item.platform}-${item.id}-${index}`}
                            onClick={() => handlePlayItem(index)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                                hover:bg-white/5 transition-colors text-left group"
                        >
                            <span className="text-xs text-surface-300/30 w-6 text-center shrink-0">
                                {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{item.title}</p>
                                <p className="text-xs text-surface-300/50 truncate">
                                    {item.artist}{item.duration ? ` · ${item.duration}` : ''}
                                </p>
                            </div>
                            <img
                                src="/icons/svg/play-circle-outline.svg"
                                alt="播放"
                                className="w-5 h-5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
                            />
                        </button>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-surface-300/40 text-center py-8">暂无歌曲</p>
            )}
        </div>
    )
}
