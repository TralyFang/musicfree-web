import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { useNavigate } from 'react-router-dom'
import { musicSheetsAtom } from '@/core/musicSheet'
import musicSheetManager from '@/core/musicSheet'

export default function SheetList() {
    const sheets = useAtomValue(musicSheetsAtom)
    const navigate = useNavigate()
    const [showCreate, setShowCreate] = useState(false)
    const [newTitle, setNewTitle] = useState('')

    const handleCreate = async () => {
        if (!newTitle.trim()) return
        await musicSheetManager.create(newTitle.trim())
        setNewTitle('')
        setShowCreate(false)
    }

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (confirm('确定删除这个歌单吗？')) {
            await musicSheetManager.remove(id)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl md:text-2xl font-bold text-white">我的歌单</h1>
                <button
                    onClick={() => setShowCreate(true)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-primary-600 hover:bg-primary-500
                        text-white transition-colors flex items-center gap-1"
                >
                    <img src="/icons/svg/plus.svg" alt="" className="w-3.5 h-3.5" />
                    新建歌单
                </button>
            </div>

            {/* 新建歌单弹窗 */}
            {showCreate && (
                <div className="flex gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                    <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        placeholder="输入歌单名称..."
                        autoFocus
                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                            text-white text-sm placeholder:text-surface-300/40
                            focus:outline-none focus:border-primary-500/50"
                    />
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500
                            text-white text-sm transition-colors"
                    >
                        创建
                    </button>
                    <button
                        onClick={() => { setShowCreate(false); setNewTitle('') }}
                        className="px-3 py-2 rounded-lg hover:bg-white/5 text-surface-300/60 text-sm transition-colors"
                    >
                        取消
                    </button>
                </div>
            )}

            {/* 歌单列表 */}
            {sheets.length === 0 ? (
                <div className="text-sm text-surface-300/50 py-12 text-center">
                    还没有创建歌单，点击上方按钮创建一个吧
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {sheets.map((sheet) => {
                        const musicList = JSON.parse(sheet.musicList || '[]')
                        return (
                            <div
                                key={sheet.id}
                                onClick={() => navigate(`/playlist/${sheet.id}`)}
                                className="group p-3 rounded-xl bg-white/[0.03] border border-white/5
                                    hover:bg-white/[0.06] hover:border-white/10 cursor-pointer
                                    transition-all"
                            >
                                {/* 封面 */}
                                <div className="aspect-square rounded-lg overflow-hidden bg-white/5 mb-3">
                                    <img
                                        src={sheet.coverImg || musicList[0]?.artwork || '/icons/logo.png'}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                {/* 信息 */}
                                <p className="text-sm text-white truncate font-medium">{sheet.title}</p>
                                <div className="flex items-center justify-between mt-1">
                                    <p className="text-xs text-surface-300/50">{musicList.length} 首</p>
                                    <button
                                        onClick={(e) => handleDelete(e, sheet.id)}
                                        className="p-1 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100
                                            hover:bg-red-500/10 transition-all"
                                        aria-label="删除歌单"
                                    >
                                        <img src="/icons/svg/trash-outline.svg" alt="" className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
