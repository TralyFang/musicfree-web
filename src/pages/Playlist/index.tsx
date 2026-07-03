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
    const [searchKeyword, setSearchKeyword] = useState('')
    const [showSearch, setShowSearch] = useState(false)
    const [batchMode, setBatchMode] = useState(false)
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())

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

    // 批量编辑
    const toggleSelectItem = (index: number) => {
        const next = new Set(selectedItems)
        if (next.has(index)) next.delete(index)
        else next.add(index)
        setSelectedItems(next)
    }

    const handleSelectAll = () => {
        if (selectedItems.size === musicList.length) {
            setSelectedItems(new Set())
        } else {
            setSelectedItems(new Set(musicList.map((_, i) => i)))
        }
    }

    const handleBatchDelete = async () => {
        if (!id || selectedItems.size === 0) return
        const itemsToRemove = [...selectedItems].sort((a, b) => b - a).map(i => musicList[i])
        for (const item of itemsToRemove) {
            await musicSheetManager.removeMusic(id, item)
        }
        setSelectedItems(new Set())
        setBatchMode(false)
        await loadSheet()
    }

    // 歌单内搜索过滤
    const filteredList = searchKeyword.trim()
        ? musicList.filter(item => {
            const kw = searchKeyword.toLowerCase()
            return (item.title?.toLowerCase().includes(kw)) ||
                   (item.artist?.toLowerCase().includes(kw)) ||
                   (item.album?.toLowerCase().includes(kw))
        })
        : musicList

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
                    <>
                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            className="p-2 rounded-full hover:bg-white/5 transition-colors"
                            aria-label="搜索歌单"
                        >
                            <img src="/icons/svg/magnifying-glass.svg" alt="" className="w-5 h-5 opacity-70" />
                        </button>
                        <button
                            onClick={() => { setBatchMode(!batchMode); setSelectedItems(new Set()) }}
                            className={`p-2 rounded-full hover:bg-white/5 transition-colors ${batchMode ? 'bg-primary-600/20' : ''}`}
                            aria-label="批量编辑"
                        >
                            <img src="/icons/svg/pencil-outline.svg" alt="" className="w-5 h-5 opacity-70" />
                        </button>
                        {!batchMode && (
                            <button
                                onClick={handlePlayAll}
                                className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500
                                    text-white text-sm font-medium transition-colors flex items-center gap-1.5"
                            >
                                <img src="/icons/svg/play.svg" alt="" className="w-4 h-4" />
                                播放全部
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* 批量编辑工具栏 */}
            {batchMode && (
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                    <button
                        onClick={handleSelectAll}
                        className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                    >
                        {selectedItems.size === musicList.length ? '取消全选' : '全选'}
                    </button>
                    <span className="text-xs text-surface-300/60">
                        已选 {selectedItems.size} 首
                    </span>
                    <div className="flex-1" />
                    <button
                        onClick={handleBatchDelete}
                        disabled={selectedItems.size === 0}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs
                            hover:bg-red-500/30 disabled:opacity-30 transition-colors"
                    >
                        删除选中
                    </button>
                    <button
                        onClick={() => { setBatchMode(false); setSelectedItems(new Set()) }}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-surface-300/70 text-xs
                            hover:bg-white/10 transition-colors"
                    >
                        取消
                    </button>
                </div>
            )}

            {/* 歌单内搜索 */}
            {showSearch && (
                <div className="relative">
                    <img src="/icons/svg/magnifying-glass.svg" alt="" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                    <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        placeholder="搜索歌单内歌曲..."
                        className="w-full pl-9 pr-8 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-surface-300/40 focus:outline-none focus:border-primary-500/50"
                        autoFocus
                    />
                    {searchKeyword && (
                        <button
                            onClick={() => setSearchKeyword('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10"
                        >
                            <img src="/icons/svg/x-mark.svg" alt="" className="w-3 h-3 opacity-50" />
                        </button>
                    )}
                </div>
            )}

            {/* 歌曲列表 */}
            {musicList.length === 0 ? (
                <div className="text-sm text-surface-300/50 py-12 text-center">
                    歌单为空，去搜索页添加歌曲吧
                </div>
            ) : filteredList.length === 0 ? (
                <div className="text-sm text-surface-300/50 py-12 text-center">
                    未找到匹配的歌曲
                </div>
            ) : (
                <div className="space-y-1">
                    {filteredList.map((item, index) => {
                        // 找到原始索引用于播放
                        const originalIndex = musicList.indexOf(item)
                        return (
                            <div
                                key={`${item.platform}-${item.id}-${index}`}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg
                                    hover:bg-white/5 transition-colors group"
                                onClick={batchMode ? () => toggleSelectItem(originalIndex) : undefined}
                            >
                                {/* 批量选择框 / 序号 */}
                                {batchMode ? (
                                    <span className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                                        selectedItems.has(originalIndex) ? 'bg-primary-600 border-primary-600' : 'border-white/20'
                                    }`}>
                                        {selectedItems.has(originalIndex) && (
                                            <img src="/icons/svg/check.svg" alt="" className="w-3 h-3" />
                                        )}
                                    </span>
                                ) : (
                                    <span className="text-xs text-surface-300/30 w-6 text-center shrink-0">
                                        {originalIndex + 1}
                                    </span>
                                )}
                                {/* 封面 */}
                                <img
                                    src={item.artwork || '/icons/logo.png'}
                                    alt=""
                                    className="w-10 h-10 rounded-lg object-cover bg-white/5 shrink-0"
                                />
                                {/* 歌曲信息 */}
                                <button
                                    onClick={(e) => { if (batchMode) { e.stopPropagation(); toggleSelectItem(originalIndex) } else { handlePlayItem(originalIndex) } }}
                                    className="flex-1 min-w-0 text-left"
                                >
                                    <p className="text-sm text-white truncate">{item.title}</p>
                                    <p className="text-xs text-surface-300/60 truncate">
                                        {item.artist}{item.album ? ` · ${item.album}` : ''}
                                    </p>
                                </button>
                                {/* 操作 */}
                                {!batchMode && (
                                    <button
                                        onClick={() => handleRemoveItem(item)}
                                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-60
                                            hover:!opacity-100 hover:bg-red-500/10 transition-all"
                                        aria-label="移除"
                                    >
                                        <img src="/icons/svg/x-mark.svg" alt="" className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
