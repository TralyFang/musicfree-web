import { useAtomValue } from 'jotai'
import { musicHistoryAtom } from '@/core/musicHistory'
import musicHistoryManager from '@/core/musicHistory'
import trackPlayer from '@/core/trackPlayer'

export default function History() {
    const history = useAtomValue(musicHistoryAtom)

    const handlePlay = async (_item: any, index: number) => {
        await trackPlayer.setQueueAndPlay(history, index)
    }

    const handleClear = async () => {
        if (confirm('确定要清空所有播放历史吗？')) {
            await musicHistoryManager.clear()
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl md:text-2xl font-bold text-white">播放历史</h1>
                {history.length > 0 && (
                    <button
                        onClick={handleClear}
                        className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-red-500/10
                            text-surface-300/60 hover:text-red-400 transition-colors"
                    >
                        清空历史
                    </button>
                )}
            </div>

            {history.length === 0 ? (
                <div className="text-sm text-surface-300/50 py-12 text-center">
                    暂无播放历史
                </div>
            ) : (
                <div className="space-y-1">
                    {history.map((item, index) => (
                        <button
                            key={`${item.platform}-${item.id}-${index}`}
                            onClick={() => handlePlay(item, index)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                                hover:bg-white/5 transition-colors text-left group"
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
                            <img
                                src="/icons/svg/play-circle-outline.svg"
                                alt="播放"
                                className="w-5 h-5 opacity-0 group-hover:opacity-70 transition-opacity shrink-0"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
