import { useAtom } from 'jotai'
import { currentMusicAtom, isPlayingAtom, currentTimeAtom, durationAtom } from '@/store'
import { DefaultArtwork } from '@/constants'

/** 格式化时间 mm:ss */
function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00'
    const min = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 60)
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

export default function MusicBar() {
    const [currentMusic] = useAtom(currentMusicAtom)
    const [isPlaying, setIsPlaying] = useAtom(isPlayingAtom)
    const [currentTime] = useAtom(currentTimeAtom)
    const [duration] = useAtom(durationAtom)

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 md:h-[72px] bg-surface-900/95 backdrop-blur-lg border-t border-white/5 flex items-center z-30">
            {/* 进度条 */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10">
                <div
                    className="h-full bg-primary-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* 移动端布局 */}
            <div className="flex items-center w-full px-3 md:px-4 gap-3">
                {/* 歌曲信息 */}
                <div className="flex items-center gap-3 flex-1 min-w-0 md:w-[280px] md:flex-none">
                    <img
                        src={currentMusic?.artwork || DefaultArtwork}
                        alt="cover"
                        className="w-10 h-10 md:w-11 md:h-11 rounded-lg object-cover shadow-lg shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                            {currentMusic?.title || '未在播放'}
                        </p>
                        <p className="text-xs text-surface-300/60 truncate">
                            {currentMusic?.artist || '---'}
                        </p>
                    </div>
                </div>

                {/* 中间：播放控制 */}
                <div className="flex flex-col items-center justify-center gap-0.5 md:flex-1">
                    <div className="flex items-center gap-2 md:gap-4">
                        {/* 上一首 - 移动端隐藏 */}
                        <button
                            className="hidden md:block p-1.5 rounded-full hover:bg-white/10 transition-colors"
                            aria-label="上一首"
                        >
                            <img src="/icons/svg/skip-left.svg" alt="上一首" className="w-5 h-5" />
                        </button>

                        {/* 播放/暂停 */}
                        <button
                            className="p-2 rounded-full bg-white hover:bg-white/90 transition-colors"
                            onClick={() => setIsPlaying(!isPlaying)}
                            aria-label={isPlaying ? '暂停' : '播放'}
                        >
                            <img
                                src={isPlaying ? '/icons/svg/pause.svg' : '/icons/svg/play.svg'}
                                alt={isPlaying ? '暂停' : '播放'}
                                className="w-4 h-4 md:w-5 md:h-5 invert"
                            />
                        </button>

                        {/* 下一首 */}
                        <button
                            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                            aria-label="下一首"
                        >
                            <img src="/icons/svg/skip-right.svg" alt="下一首" className="w-5 h-5" />
                        </button>
                    </div>

                    {/* 时间显示 - 移动端隐藏 */}
                    <div className="hidden md:flex items-center gap-2 text-xs text-surface-300/60">
                        <span>{formatTime(currentTime)}</span>
                        <span>/</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* 右侧：音量等控制 - 移动端隐藏 */}
                <div className="hidden md:flex w-[280px] items-center justify-end gap-3">
                    <button
                        className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                        aria-label="播放列表"
                    >
                        <img src="/icons/svg/playlist.svg" alt="播放列表" className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
