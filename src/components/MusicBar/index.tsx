import { useAtomValue } from 'jotai'
import { useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentMusicAtom, isPlayingAtom, currentTimeAtom, durationAtom, repeatModeAtom } from '@/store'
import trackPlayer from '@/core/trackPlayer'
import { RepeatMode } from '@/constants'

function formatTime(seconds: number): string {
    if (!seconds || !isFinite(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
}

const repeatModeIcons: Record<string, string> = {
    [RepeatMode.Queue]: '/icons/svg/repeat-song.svg',
    [RepeatMode.RepeatOne]: '/icons/svg/repeat-song-1.svg',
    [RepeatMode.Shuffle]: '/icons/svg/shuffle.svg',
}

export default function MusicBar() {
    const navigate = useNavigate()
    const currentMusic = useAtomValue(currentMusicAtom)
    const isPlaying = useAtomValue(isPlayingAtom)
    const currentTime = useAtomValue(currentTimeAtom)
    const duration = useAtomValue(durationAtom)
    const repeatMode = useAtomValue(repeatModeAtom)

    const [isDragging, setIsDragging] = useState(false)
    const [dragProgress, setDragProgress] = useState(0)
    const progressBarRef = useRef<HTMLDivElement>(null)

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0
    const displayProgress = isDragging ? dragProgress : progress

    // 点击定位
    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!duration) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const percent = x / rect.width
        trackPlayer.seekTo(percent * duration)
    }

    // Touch 拖拽支持
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

    // 切换播放模式
    const handleToggleRepeatMode = () => {
        const modes = [RepeatMode.Queue, RepeatMode.RepeatOne, RepeatMode.Shuffle]
        const currentIndex = modes.indexOf(repeatMode)
        const nextMode = modes[(currentIndex + 1) % modes.length]
        trackPlayer.setRepeatMode(nextMode)
    }

    if (!currentMusic) {
        return (
            <div className="fixed bottom-0 left-0 right-0 h-16 md:h-[72px] bg-surface-900/95
                backdrop-blur-xl border-t border-white/5 flex items-center justify-center
                text-sm text-surface-300/40 z-40">
                未在播放
            </div>
        )
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 md:h-[72px] bg-surface-900/95
            backdrop-blur-xl border-t border-white/5 z-40 flex flex-col">
            {/* 进度条 - 支持 touch 拖拽 */}
            <div
                ref={progressBarRef}
                className="w-full h-1.5 md:h-1 bg-white/5 cursor-pointer group touch-none"
                onClick={handleSeek}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div
                    className="h-full bg-primary-500 transition-[width] duration-100 group-hover:bg-primary-400 relative"
                    style={{ width: `${displayProgress}%` }}
                >
                    {/* 拖拽时显示圆点 */}
                    {isDragging && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary-400 shadow-lg" />
                    )}
                </div>
            </div>

            {/* 播放器内容 */}
            <div className="flex-1 flex items-center px-3 md:px-6 gap-3 md:gap-4">
                {/* 歌曲信息 - 点击跳转播放详情 */}
                <div
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => navigate('/playing')}
                >
                    <img
                        src={currentMusic.artwork || '/icons/logo.png'}
                        alt=""
                        className="w-10 h-10 md:w-11 md:h-11 rounded-lg object-cover bg-white/5 shrink-0"
                    />
                    <div className="min-w-0">
                        <p className="text-sm text-white truncate">{currentMusic.title}</p>
                        <p className="text-xs text-surface-300/60 truncate">{currentMusic.artist}</p>
                    </div>
                </div>

                {/* 控制按钮 */}
                <div className="flex items-center gap-1 md:gap-3">
                    {/* 播放模式（仅桌面端） */}
                    <button
                        onClick={handleToggleRepeatMode}
                        className="hidden md:block p-1.5 rounded-full hover:bg-white/5 transition-colors"
                        aria-label="切换播放模式"
                        title={repeatMode === RepeatMode.Queue ? '顺序播放' : repeatMode === RepeatMode.RepeatOne ? '单曲循环' : '随机播放'}
                    >
                        <img src={repeatModeIcons[repeatMode]} alt="" className="w-4 h-4 opacity-60" />
                    </button>

                    <button
                        onClick={() => trackPlayer.skipToPrevious()}
                        className="p-1.5 rounded-full hover:bg-white/5 transition-colors"
                        aria-label="上一首"
                    >
                        <img src="/icons/svg/skip-left.svg" alt="上一首" className="w-5 h-5 opacity-70" />
                    </button>

                    <button
                        onClick={() => trackPlayer.togglePlay()}
                        className="p-2 rounded-full bg-primary-600 hover:bg-primary-500 transition-colors"
                        aria-label={isPlaying ? '暂停' : '播放'}
                    >
                        <img
                            src={isPlaying ? '/icons/svg/pause.svg' : '/icons/svg/play.svg'}
                            alt={isPlaying ? '暂停' : '播放'}
                            className="w-5 h-5"
                        />
                    </button>

                    <button
                        onClick={() => trackPlayer.skipToNext()}
                        className="p-1.5 rounded-full hover:bg-white/5 transition-colors"
                        aria-label="下一首"
                    >
                        <img src="/icons/svg/skip-right.svg" alt="下一首" className="w-5 h-5 opacity-70" />
                    </button>

                    {/* 播放列表按钮 */}
                    <button
                        onClick={() => navigate('/playlist/queue')}
                        className="p-1.5 rounded-full hover:bg-white/5 transition-colors"
                        aria-label="播放列表"
                    >
                        <img src="/icons/svg/playlist.svg" alt="播放列表" className="w-5 h-5 opacity-60" />
                    </button>
                </div>

                {/* 时间显示（桌面端） */}
                <div className="hidden md:flex items-center gap-1 text-xs text-surface-300/50 w-24 justify-end">
                    <span>{formatTime(currentTime)}</span>
                    <span>/</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    )
}
