/**
 * 歌曲操作面板
 * 长按或点击更多按钮时弹出，提供添加到歌单、下一首播放等操作
 */
import BottomPanel from '@/components/BottomPanel'
import Toast from '@/components/Toast'
import trackPlayer from '@/core/trackPlayer'
import musicSheetManager from '@/core/musicSheet'
import { useState, useEffect } from 'react'

interface MusicItemActionsProps {
    visible: boolean
    onClose: () => void
    musicItem: IMusic.IMusicItem | null
}

export default function MusicItemActions({ visible, onClose, musicItem }: MusicItemActionsProps) {
    const [sheets, setSheets] = useState<IMusic.IMusicSheetItem[]>([])
    const [showSheetPicker, setShowSheetPicker] = useState(false)

    useEffect(() => {
        if (visible) {
            musicSheetManager.getAllSheets().then(setSheets)
        }
    }, [visible])

    if (!musicItem) return null

    const actions = [
        {
            icon: '/icons/svg/play.svg',
            label: '下一首播放',
            action: () => {
                trackPlayer.addToQueue(musicItem)
                Toast.success('已添加到播放队列')
                onClose()
            },
        },
        {
            icon: '/icons/svg/heart-outline.svg',
            label: '收藏到我喜欢',
            action: async () => {
                await musicSheetManager.addToFavorites(musicItem)
                Toast.success('已收藏')
                onClose()
            },
        },
        {
            icon: '/icons/svg/plus.svg',
            label: '添加到歌单',
            action: () => {
                setShowSheetPicker(true)
            },
        },
        {
            icon: '/icons/svg/album-outline.svg',
            label: `专辑: ${musicItem.album || '未知'}`,
            action: () => {
                onClose()
                // 可以跳转专辑页面
            },
            disabled: !musicItem.album,
        },
        {
            icon: '/icons/svg/user.svg',
            label: `歌手: ${musicItem.artist || '未知'}`,
            action: () => {
                onClose()
                // 可以跳转歌手页面
            },
            disabled: !musicItem.artist,
        },
    ]

    if (showSheetPicker) {
        return (
            <BottomPanel visible={visible} onClose={() => { setShowSheetPicker(false); onClose() }} title="选择歌单">
                <div className="space-y-1">
                    {sheets.length === 0 ? (
                        <p className="text-sm text-surface-300/50 text-center py-6">暂无歌单，请先创建</p>
                    ) : (
                        sheets.map(sheet => (
                            <button
                                key={sheet.id}
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-colors text-left"
                                onClick={async () => {
                                    await musicSheetManager.addMusicToSheet(sheet.id, musicItem)
                                    Toast.success(`已添加到「${sheet.title}」`)
                                    setShowSheetPicker(false)
                                    onClose()
                                }}
                            >
                                <img src="/icons/svg/playlist.svg" alt="" className="w-5 h-5 opacity-60" />
                                <span className="text-sm text-white">{sheet.title}</span>
                                <span className="text-xs text-surface-300/40 ml-auto">{sheet.musicList?.length || 0}首</span>
                            </button>
                        ))
                    )}
                </div>
            </BottomPanel>
        )
    }

    return (
        <BottomPanel visible={visible} onClose={onClose} title={musicItem.title}>
            <div className="space-y-1">
                <p className="text-xs text-surface-300/50 mb-3 truncate">{musicItem.artist} - {musicItem.album || '未知专辑'}</p>
                {actions.map((item) => (
                    <button
                        key={item.label}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-colors text-left disabled:opacity-30"
                        onClick={item.action}
                        disabled={item.disabled}
                    >
                        <img src={item.icon} alt="" className="w-5 h-5 opacity-60" />
                        <span className="text-sm text-white">{item.label}</span>
                    </button>
                ))}
            </div>
        </BottomPanel>
    )
}
