import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import musicSheetManager from '@/core/musicSheet'
import trackPlayer from '@/core/trackPlayer'
import type { IDBMusicSheet } from '@/utils/db'

export default function Playlist() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [sheet, setSheet] = useState<IDBMusicSheet | null>(null)
    const [musicList, setMusicList] = useState<any[]>([])

    useEffect(() => {
        if (!id) return
        loadSheet()
    }, [id])

    const loadSheet = async () => {
        if (!id) return
        const s = await musicSheetManager.getById(id)
        if (s) {
            setSheet(s)
            setMusicList(JSON.parse(s.musicList || '[]'))
        }
    }

    const handlePlayAll = async () => {
        if (musicList.length === 0) return
        await trackPlayer.setQueueAndPlay(musicList, 0)
    }

    const handlePlayItem = async (index: number) => {
        await trackPlayer.setQueueAndPlay(musicList, index)
    }

    const handleRemoveItem = async (item: any) => {
        if (!id) return
        await musicSheetManager.removeMusic(id, item)
        await loadSheet()
    }

    if (!sheet) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-surface-300/50">歌单不存在</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* 头部 */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full hover:bg-white/5 transition-colors"
                    aria-label="返回"
                >
                    <img src="/icons/svg/arrow-left.svg" alt="返回" className="w-5 h-5 opacity-70" />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-white truncate">{sheet.title}</h1>
                    <p className="text-xs text-surface-300/50 mt-0.5">{musicList.length} 首歌曲</p>
                </div>
                {musicList.length > 0 && (
                    <button
                        onClick={handlePlayAll}
                        className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500
                            text-white text-sm font-medium transition-colors flex items-center gap-1.5"
                    >
                        <img src="/icons/svg/play.svg" alt="" className="w-4 h-4" />
                        播放全部
                    </button>
                )}
            </div>

            {/* 歌曲列表 */}
            {musicList.length === 0 ? (
                <div className="text-sm text-surface-300/50 py-12 text-center">
                    歌单为空，去搜索页添加歌曲吧
                </div>
            ) : (
                <div className="space-y-1">
                    {musicList.map((item, index) => (
                        <div
                            key={`${item.platform}-${item.id}-${index}`}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg
                                hover:bg-white/5 transition-colors group"
                        >
                            {/* 序号 */}
                            <span className="text-xs text-surface-300/30 w-6 text-center shrink-0">
                                {index + 1}
                            </span>
                            {/* 封面 */}
                            <img
                                src={item.artwork || '/icons/logo.png'}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover bg-white/5 shrink-0"
                            />
                            {/* 歌曲信息 */}
                            <button
                                onClick={() => handlePlayItem(index)}
                                className="flex-1 min-w-0 text-left"
                            >
                                <p className="text-sm text-white truncate">{item.title}</p>
                                <p className="text-xs text-surface-300/60 truncate">
                                    {item.artist}{item.album ? ` · ${item.album}` : ''}
                                </p>
                            </button>
                            {/* 操作 */}
                            <button
                                onClick={() => handleRemoveItem(item)}
                                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-60
                                    hover:!opacity-100 hover:bg-red-500/10 transition-all"
                                aria-label="移除"
                            >
                                <img src="/icons/svg/x-mark.svg" alt="" className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
