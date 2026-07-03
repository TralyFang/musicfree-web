import { useState, useEffect, useRef, useCallback } from 'react'
import { useAtomValue } from 'jotai'
import { currentMusicAtom, isPlayingAtom, currentTimeAtom, durationAtom, repeatModeAtom, playbackRateAtom, sleepTimerRemainingAtom } from '@/store'
import trackPlayer from '@/core/trackPlayer'
import pluginManager from '@/core/pluginManager'
import musicSheetManager from '@/core/musicSheet'
import { parseLrc, mergeLrcTranslation, findCurrentLyricIndex, type ILyricLine } from '@/utils/lrcParser'
import { useNavigate } from 'react-router-dom'
import { RepeatMode } from '@/constants'
import Toast from '@/components/Toast'

function formatTime(seconds: number): string {
    if (!seconds || !isFinite(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
}

type ViewMode = 'cover' | 'lyric'

export default function MusicDetail() {
    const navigate = useNavigate()
    const currentMusic = useAtomValue(currentMusicAtom)
    const isPlaying = useAtomValue(isPlayingAtom)
    const currentTime = useAtomValue(currentTimeAtom)
    const duration = useAtomValue(durationAtom)
    const repeatMode = useAtomValue(repeatModeAtom)

    const playbackRate = useAtomValue(playbackRateAtom)
    const sleepTimerRemaining = useAtomValue(sleepTimerRemainingAtom)

    const [viewMode, setViewMode] = useState<ViewMode>('cover')
    const [lyrics, setLyrics] = useState<ILyricLine[]>([])
    const [currentLyricIndex, setCurrentLyricIndex] = useState(-1)
    const [isFavorite, setIsFavorite] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [dragProgress, setDragProgress] = useState(0)
    const [showSpeedMenu, setShowSpeedMenu] = useState(false)
    const [showTimerMenu, setShowTimerMenu] = useState(false)
    const lyricsContainerRef = useRef<HTMLDivElement>(null)
    const progressBarRef = useRef<HTMLDivElement>(null)

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0
    const displayProgress = isDragging ? dragProgress : progress

    // 获取歌词
    useEffect(() => {
        if (!currentMusic) { setLyrics([]); return }
        let cancelled = false

        const fetchLyrics = async () => {
            const plugin = pluginManager.getByMedia(currentMusic)
            if (!plugin) return
            try {
                const lyricResult = await plugin.getLyric(currentMusic)
                if (cancelled) return
                if (lyricResult?.rawLrc) {
                    const parsed = parseLrc(lyricResult.rawLrc)
                    if (lyricResult.translation) {
                        const transParsed = parseLrc(lyricResult.translation)
                        setLyrics(mergeLrcTranslation(parsed, transParsed))
                    } else {
                        setLyrics(parsed)
                    }
                } else {
                    setLyrics([])
                }
            } catch { setLyrics([]) }
        }
        fetchLyrics()
        return () => { cancelled = true }
    }, [currentMusic])

    // 检查是否已收藏
    useEffect(() => {
        if (!currentMusic) return
        musicSheetManager.isFavorite(currentMusic).then(setIsFavorite)
    }, [currentMusic])

    // 歌词滚动
    useEffect(() => {
        if (lyrics.length === 0) return
        const idx = findCurrentLyricIndex(lyrics, currentTime)
        if (idx !== currentLyricIndex) {
            setCurrentLyricIndex(idx)
            // 自动滚动到当前歌词
            if (lyricsContainerRef.current && idx >= 0) {
                const el = lyricsContainerRef.current.children[idx] as HTMLElement
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            }
        }
    }, [currentTime, lyrics, currentLyricIndex])

    // 进度条拖拽
    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!duration) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        trackPlayer.seekTo((x / rect.width) * duration)
    }

    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (!duration) return
        setIsDragging(true)
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.touches[0].clientX - rect.left
        setDragProgress(Math.max(0, Math.min(100, (x / rect.width) * 100)))
    }, [duration])

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (!isDragging || !progressBarRef.current) return
        const rect = progressBarRef.current.getBoundingClientRect()
        const x = e.touches[0].clientX - rect.left
        setDragProgress(Math.max(0, Math.min(100, (x / rect.width) * 100)))
    }, [isDragging])

    const handleTouchEnd = useCallback(() => {
        if (!isDragging || !duration) return
        setIsDragging(false)
        trackPlayer.seekTo((dragProgress / 100) * duration)
    }, [isDragging, dragProgress, duration])

    // 收藏切换
    const handleToggleFavorite = async () => {
        if (!currentMusic) return
        if (isFavorite) {
            await musicSheetManager.removeFromFavorites(currentMusic)
            setIsFavorite(false)
            Toast.show('已取消收藏')
        } else {
            await musicSheetManager.addToFavorites(currentMusic)
            setIsFavorite(true)
            Toast.success('已收藏到我喜欢')
        }
    }

    // 切换播放模式
    const handleToggleRepeatMode = () => {
        const modes = [RepeatMode.Queue, RepeatMode.RepeatOne, RepeatMode.Shuffle]
        const currentIndex = modes.indexOf(repeatMode)
        const nextMode = modes[(currentIndex + 1) % modes.length]
        trackPlayer.setRepeatMode(nextMode)
    }

    const repeatModeIcon = repeatMode === RepeatMode.Queue
        ? '/icons/svg/repeat-song.svg'
        : repeatMode === RepeatMode.RepeatOne
        ? '/icons/svg/repeat-song-1.svg'
        : '/icons/svg/shuffle.svg'

    if (!currentMusic) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-surface-300/50">
                <img src="/icons/svg/musical-note.svg" alt="" className="w-16 h-16 opacity-30 mb-4" />
                <p>暂无播放内容</p>
            </div>
        )
    }

    return (
        <div className="relative flex flex-col h-full min-h-0 -m-4 md:-m-6 overflow-hidden">
            {/* 背景虚化 */}
            <div className="absolute inset-0 z-0">
                <img
                    src={currentMusic.artwork || '/icons/logo.png'}
                    alt=""
                    className="w-full h-full object-cover scale-110 blur-3xl opacity-30"
                />
                <div className="absolute inset-0 bg-surface-950/70" />
            </div>

            {/* 内容区 */}
            <div className="relative z-10 flex flex-col h-full">
                {/* 顶部导航 */}
                <div className="flex items-center justify-between px-4 py-3 shrink-0">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        aria-label="返回"
                    >
                        <img src="/icons/svg/arrow-left.svg" alt="返回" className="w-5 h-5" />
                    </button>
                    <div className="text-center min-w-0 flex-1 px-4">
                        <p className="text-sm font-medium text-white truncate">{currentMusic.title}</p>
                        <p className="text-xs text-surface-300/60 truncate">{currentMusic.artist}
                            {currentMusic.platform && <span className="ml-2 px-1.5 py-0.5 rounded bg-white/10 text-[10px]">{currentMusic.platform}</span>}
                        </p>
                    </div>
                    <div className="w-9" /> {/* 占位 */}
                </div>

                {/* 中间区域：封面/歌词切换 */}
                <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-4">
                    {viewMode === 'cover' ? (
                        /* 封面视图 */
                        <div
                            className="cursor-pointer"
                            onClick={() => setViewMode('lyric')}
                        >
                            <div className={`w-56 h-56 md:w-72 md:h-72 rounded-full overflow-hidden shadow-2xl border-4 border-white/10 ${isPlaying ? 'animate-spin-slow' : ''}`}>
                                <img
                                    src={currentMusic.artwork || '/icons/logo.png'}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <p className="text-center text-xs text-surface-300/40 mt-4">点击查看歌词</p>
                        </div>
                    ) : (
                        /* 歌词视图 */
                        <div
                            className="w-full h-full overflow-y-auto cursor-pointer"
                            onClick={() => setViewMode('cover')}
                            ref={lyricsContainerRef}
                        >
                            {lyrics.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-surface-300/40">暂无歌词</p>
                                </div>
                            ) : (
                                <div className="py-20 space-y-4">
                                    {lyrics.map((line, idx) => (
                                        <p
                                            key={idx}
                                            className={`text-center transition-all duration-300 px-4 ${
                                                idx === currentLyricIndex
                                                    ? 'text-white text-base font-medium scale-105'
                                                    : 'text-surface-300/40 text-sm'
                                            }`}
                                        >
                                            {line.text}
                                            {line.translation && (
                                                <span className="block text-xs text-surface-300/30 mt-0.5">{line.translation}</span>
                                            )}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 工具栏 */}
                <div className="flex items-center justify-center gap-4 px-4 py-2 shrink-0">
                    <button onClick={handleToggleFavorite} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="收藏">
                        <img src={isFavorite ? '/icons/svg/heart.svg' : '/icons/svg/heart-outline.svg'} alt="" className={`w-5 h-5 ${isFavorite ? 'brightness-125' : 'opacity-60'}`} />
                    </button>
                    <button onClick={() => setViewMode(viewMode === 'cover' ? 'lyric' : 'cover')} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="切换视图">
                        <img src="/icons/svg/lyric.svg" alt="" className="w-5 h-5 opacity-60" />
                    </button>
                    {/* 倍速 */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowTimerMenu(false) }}
                            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${playbackRate !== 1 ? 'bg-primary-600/80 text-white' : 'hover:bg-white/10 text-surface-300/60'}`}
                            aria-label="倍速"
                        >
                            {playbackRate}x
                        </button>
                        {showSpeedMenu && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-surface-800 border border-white/10 rounded-lg shadow-xl py-1 z-50 min-w-[80px]">
                                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                                    <button
                                        key={rate}
                                        onClick={() => { trackPlayer.setPlaybackRate(rate); setShowSpeedMenu(false) }}
                                        className={`block w-full px-3 py-1.5 text-xs text-center transition-colors ${playbackRate === rate ? 'text-primary-400 bg-primary-600/20' : 'text-white/70 hover:bg-white/10'}`}
                                    >
                                        {rate}x
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* 定时关闭 */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowTimerMenu(!showTimerMenu); setShowSpeedMenu(false) }}
                            className={`p-2 rounded-full transition-colors ${sleepTimerRemaining > 0 ? 'bg-primary-600/80' : 'hover:bg-white/10'}`}
                            aria-label="定时关闭"
                        >
                            {sleepTimerRemaining > 0 ? (
                                <span className="text-xs font-medium text-white">{Math.ceil(sleepTimerRemaining / 60)}m</span>
                            ) : (
                                <img src="/icons/svg/alarm-outline.svg" alt="" className="w-5 h-5 opacity-60" />
                            )}
                        </button>
                        {showTimerMenu && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-surface-800 border border-white/10 rounded-lg shadow-xl py-1 z-50 min-w-[100px]">
                                {[
                                    { label: '关闭', value: 0 },
                                    { label: '15分钟', value: 15 },
                                    { label: '30分钟', value: 30 },
                                    { label: '45分钟', value: 45 },
                                    { label: '60分钟', value: 60 },
                                    { label: '90分钟', value: 90 },
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => { trackPlayer.setSleepTimer(opt.value); setShowTimerMenu(false) }}
                                        className={`block w-full px-3 py-1.5 text-xs text-center transition-colors ${sleepTimerRemaining > 0 && opt.value === 0 ? 'text-red-400 hover:bg-red-500/10' : 'text-white/70 hover:bg-white/10'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={() => navigate('/playlist/queue')} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="播放队列">
                        <img src="/icons/svg/playlist.svg" alt="" className="w-5 h-5 opacity-60" />
                    </button>
                </div>

                {/* 进度条 */}
                <div className="px-4 shrink-0">
                    <div
                        ref={progressBarRef}
                        className="w-full h-2 bg-white/10 rounded-full cursor-pointer touch-none group"
                        onClick={handleProgressClick}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <div
                            className="h-full bg-primary-500 rounded-full relative group-hover:bg-primary-400 transition-colors"
                            style={{ width: `${displayProgress}%` }}
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-surface-300/50">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* 播放控制 */}
                <div className="flex items-center justify-center gap-6 px-4 py-4 shrink-0">
                    <button onClick={handleToggleRepeatMode} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="播放模式">
                        <img src={repeatModeIcon} alt="" className="w-5 h-5 opacity-50" />
                    </button>
                    <button onClick={() => trackPlayer.skipToPrevious()} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="上一首">
                        <img src="/icons/svg/skip-left.svg" alt="" className="w-7 h-7" />
                    </button>
                    <button
                        onClick={() => trackPlayer.togglePlay()}
                        className="p-4 rounded-full bg-primary-600 hover:bg-primary-500 transition-colors shadow-lg"
                        aria-label={isPlaying ? '暂停' : '播放'}
                    >
                        <img
                            src={isPlaying ? '/icons/svg/pause.svg' : '/icons/svg/play.svg'}
                            alt=""
                            className="w-7 h-7"
                        />
                    </button>
                    <button onClick={() => trackPlayer.skipToNext()} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="下一首">
                        <img src="/icons/svg/skip-right.svg" alt="" className="w-7 h-7" />
                    </button>
                    <button onClick={() => navigate('/playlist/queue')} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="播放列表">
                        <img src="/icons/svg/playlist.svg" alt="" className="w-5 h-5 opacity-50" />
                    </button>
                </div>
            </div>
        </div>
    )
}
