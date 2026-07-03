import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { musicSheetsAtom } from '@/core/musicSheet'
import musicSheetManager from '@/core/musicSheet'
import { musicHistoryAtom } from '@/core/musicHistory'
import trackPlayer from '@/core/trackPlayer'
import Toast from '@/components/Toast'

const QUICK_ENTRIES = [
    { icon: '/icons/svg/fire-outline.svg', title: '推荐歌单', path: '/recommend', color: 'from-orange-500/20 to-orange-600/5' },
    { icon: '/icons/svg/trophy.svg', title: '排行榜', path: '/toplist', color: 'from-yellow-500/20 to-yellow-600/5' },
    { icon: '/icons/svg/clock-outline.svg', title: '播放历史', path: '/history', color: 'from-blue-500/20 to-blue-600/5' },
    { icon: '/icons/svg/heart-outline.svg', title: '我喜欢', path: '/playlist/__favorites__', color: 'from-pink-500/20 to-pink-600/5' },
]

export default function Home() {
    const navigate = useNavigate()
    const sheets = useAtomValue(musicSheetsAtom)
    const history = useAtomValue(musicHistoryAtom)
    const [showCreateInput, setShowCreateInput] = useState(false)
    const [newSheetTitle, setNewSheetTitle] = useState('')

    // 创建歌单
    const handleCreateSheet = async () => {
        const title = newSheetTitle.trim()
        if (!title) return
        await musicSheetManager.create(title)
        setNewSheetTitle('')
        setShowCreateInput(false)
        Toast.success('歌单已创建')
    }

    // 播放历史中的歌曲
    const handlePlayHistory = async (_item: any, index: number) => {
        const historyItems = history.slice(0, 20)
        await trackPlayer.setQueueAndPlay(historyItems, index)
    }

    return (
        <div className="space-y-6">
            {/* 顶部搜索栏 */}
            <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10
                    cursor-pointer hover:bg-white/[0.07] hover:border-white/15 transition-all"
                onClick={() => navigate('/search')}
            >
                <img src="/icons/svg/magnifying-glass.svg" alt="" className="w-5 h-5 opacity-40" />
                <span className="text-sm text-surface-300/40">搜索歌曲、专辑、歌手...</span>
            </div>

            {/* 快捷入口网格 */}
            <section>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {QUICK_ENTRIES.map(entry => (
                        <button
                            key={entry.path}
                            onClick={() => navigate(entry.path)}
                            className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br ${entry.color}
                                border border-white/5 hover:border-white/10 transition-all active:scale-[0.97]`}
                        >
                            <img src={entry.icon} alt="" className="w-6 h-6 opacity-80" />
                            <span className="text-sm font-medium text-white">{entry.title}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* 我的歌单 */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-white">我的歌单</h2>
                    <button
                        onClick={() => setShowCreateInput(true)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-primary-400 hover:bg-white/5 transition-colors"
                    >
                        <img src="/icons/svg/plus.svg" alt="" className="w-4 h-4 opacity-70" />
                        新建
                    </button>
                </div>

                {/* 新建歌单输入 */}
                {showCreateInput && (
                    <div className="flex gap-2 mb-3">
                        <input
                            type="text"
                            value={newSheetTitle}
                            onChange={(e) => setNewSheetTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateSheet()}
                            placeholder="输入歌单名称"
                            autoFocus
                            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                                text-sm text-white placeholder:text-surface-300/40
                                focus:outline-none focus:border-primary-500/50"
                        />
                        <button
                            onClick={handleCreateSheet}
                            disabled={!newSheetTitle.trim()}
                            className="px-3 py-2 rounded-lg bg-primary-600 text-white text-xs disabled:opacity-50"
                        >
                            创建
                        </button>
                        <button
                            onClick={() => { setShowCreateInput(false); setNewSheetTitle('') }}
                            className="px-3 py-2 rounded-lg bg-white/5 text-surface-300/60 text-xs hover:bg-white/10"
                        >
                            取消
                        </button>
                    </div>
                )}

                {/* 歌单列表 */}
                {sheets.length > 0 ? (
                    <div className="space-y-1">
                        {sheets.map(sheet => {
                            const musicList = JSON.parse(sheet.musicList || '[]')
                            return (
                                <button
                                    key={sheet.id}
                                    onClick={() => navigate(`/playlist/${sheet.id}`)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                                        hover:bg-white/5 transition-colors text-left group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                                        {sheet.coverImg ? (
                                            <img src={sheet.coverImg} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <img src="/icons/svg/musical-note.svg" alt="" className="w-5 h-5 opacity-30" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white truncate">{sheet.title}</p>
                                        <p className="text-xs text-surface-300/50">{musicList.length} 首</p>
                                    </div>
                                    <img src="/icons/svg/arrow-left.svg" alt="" className="w-4 h-4 opacity-0 group-hover:opacity-30 rotate-180" />
                                </button>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-sm text-surface-300/40 py-8 text-center border border-dashed border-white/10 rounded-xl">
                        还没有歌单，点击上方"新建"创建
                    </div>
                )}
            </section>

            {/* 最近播放 */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-white">最近播放</h2>
                    {history.length > 0 && (
                        <button
                            onClick={() => navigate('/history')}
                            className="text-xs text-surface-300/50 hover:text-surface-300/80 transition-colors"
                        >
                            查看全部
                        </button>
                    )}
                </div>

                {history.length > 0 ? (
                    <div className="space-y-1">
                        {history.slice(0, 5).map((item, idx) => (
                            <button
                                key={`${item.platform}-${item.id}-${idx}`}
                                onClick={() => handlePlayHistory(item, idx)}
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
                                    <p className="text-xs text-surface-300/60 truncate">{item.artist}</p>
                                </div>
                                <img
                                    src="/icons/svg/play-circle-outline.svg"
                                    alt=""
                                    className="w-5 h-5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
                                />
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-surface-300/40 py-8 text-center border border-dashed border-white/10 rounded-xl">
                        暂无播放记录
                    </div>
                )}
            </section>
        </div>
    )
}
