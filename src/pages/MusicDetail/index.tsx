import { useState, useEffect, useRef, useCallback } from 'react'
import { useAtomValue } from 'jotai'
import { currentMusicAtom, isPlayingAtom, currentTimeAtom, durationAtom } from '@/store'
import trackPlayer from '@/core/trackPlayer'
import pluginManager from '@/core/pluginManager'
import { parseLrc, mergeLrcTranslation, findCurrentLyricIndex, type ILyricLine } from '@/utils/lrcParser'
import { useNavigate } from 'react-router-dom'

function formatTime(seconds: number): string {
    if (!seconds || !isFinite(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
}

export default function MusicDetail() {
    const navigate = useNavigate()
    const currentMusic = useAtomValue(currentMusicAtom)
    const isPlaying = useAtomValue(isPlayingAtom)
    const currentTime = useAtomValue(currentTimeAtom)
    const duration = useAtomValue(durationAtom)

    const [lyrics, setLyrics] = useState<ILyricLine[]>([])
    const [currentLyricIndex, setCurrentLyricIndex] = useState(-1)
    const lyricsContainerRef = useRef<HTMLDivElement>(null)

    // 获取歌词
    useEffect(() => {
        if (!currentMusic) {
            setLyrics([])
            return
        }

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
            } catch {
                if (!cancelled) setLyrics([])
            }
        }

        fetchLyrics()
        return () => { cancelled = true }
    }, [currentMusic])

    // 更新当前歌词高亮
    useEffect(() => {
        const index = findCurrentLyricIndex(lyrics, currentTime)
        setCurrentLyricIndex(index)
    }, [currentTime, lyrics])

    // 歌词滚动跟随
    useEffect(() => {
        if (currentLyricIndex < 0 || !lyricsContainerRef.current) return

        const container = lyricsContainerRef.current
        const activeEl = container.children[currentLyricIndex] as HTMLElement
        if (activeEl) {
            activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [currentLyricIndex])

    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!duration) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const percent = x / rect.width
        trackPlayer.seekTo(percent * duration)
    }, [duration])

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    if (!currentMusic) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-surface-300/50">当前没有播放歌曲</p>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 overflow-hidden">
            {/* 返回按钮 */}
            <button
                onClick={() => navigate(-1)}
                className="absolute top-4 left-4 p-2 rounded-full hover:bg-white/5 transition-colors z-10 md:hidden"
                aria-label="返回"
            >
                <img src="/icons/svg/arrow-left.svg" alt="返回" className="w-5 h-5 opacity-70" />
            </button>

            {/* 左侧：封面 + 控制 */}
            <div className="flex flex-col items-center justify-center md:w-2/5 shrink-0 py-6 md:py-0">
                {/* 封面 */}
                <div className={`w-56 h-56 md:w-72 md:h-72 rounded-2xl overflow-hidden shadow-2xl shadow-black/30 ${
                    isPlaying ? 'animate-spin-slow' : ''
                }`}>
                    <img
                        src={currentMusic.artwork || '/icons/logo.png'}
                        alt={currentMusic.title}
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* 歌曲信息 */}
                <div className="mt-6 text-center max-w-xs">
                    <h2 className="text-lg font-bold text-white truncate">{currentMusic.title}</h2>
                    <p className="text-sm text-surface-300/60 mt-1 truncate">
                        {currentMusic.artist}{currentMusic.album ? ` · ${currentMusic.album}` : ''}
                    </p>
                </div>

                {/* 进度条 */}
                <div className="w-full max-w-xs mt-6 space-y-2">
                    <div
                        className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer group"
                        onClick={handleSeek}
                    >
                        <div
                            className="h-full bg-primary-500 rounded-full transition-[width] duration-200 relative group-hover:bg-primary-400"
                            style={{ width: `${progress}%` }}
                        >
                            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>
                    <div className="flex justify-between text-xs text-surface-300/50">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* 播放控制 */}
                <div className="flex items-center gap-6 mt-4">
                    <button
                        onClick={() => trackPlayer.skipToPrevious()}
                        className="p-2 rounded-full hover:bg-white/5 transition-colors"
                        aria-label="上一首"
                    >
                        <img src="/icons/svg/skip-left.svg" alt="" className="w-6 h-6 opacity-70" />
                    </button>

                    <button
                        onClick={() => trackPlayer.togglePlay()}
                        className="p-4 rounded-full bg-primary-600 hover:bg-primary-500 transition-colors"
                        aria-label={isPlaying ? '暂停' : '播放'}
                    >
                        <img
                            src={isPlaying ? '/icons/svg/pause.svg' : '/icons/svg/play.svg'}
                            alt=""
                            className="w-7 h-7"
                        />
                    </button>

                    <button
                        onClick={() => trackPlayer.skipToNext()}
                        className="p-2 rounded-full hover:bg-white/5 transition-colors"
                        aria-label="下一首"
                    >
                        <img src="/icons/svg/skip-right.svg" alt="" className="w-6 h-6 opacity-70" />
                    </button>
                </div>
            </div>

            {/* 右侧：歌词 */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <h3 className="text-sm font-medium text-surface-300/60 mb-3 shrink-0">歌词</h3>

                {lyrics.length > 0 ? (
                    <div
                        ref={lyricsContainerRef}
                        className="flex-1 overflow-y-auto space-y-3 px-2 scrollbar-thin"
                    >
                        {lyrics.map((line, index) => (
                            <div
                                key={index}
                                className={`py-1.5 transition-all duration-300 cursor-pointer hover:text-white/80 ${
                                    index === currentLyricIndex
                                        ? 'text-primary-400 text-base font-medium scale-105 origin-left'
                                        : 'text-surface-300/40 text-sm'
                                }`}
                                onClick={() => trackPlayer.seekTo(line.time)}
                            >
                                <p>{line.text || '♪'}</p>
                                {line.translation && (
                                    <p className={`text-xs mt-0.5 ${
                                        index === currentLyricIndex ? 'text-primary-300/70' : 'text-surface-300/25'
                                    }`}>
                                        {line.translation}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-sm text-surface-300/30">暂无歌词</p>
                    </div>
                )}
            </div>
        </div>
    )
}
