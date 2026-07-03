import { useState, useRef } from 'react'
import trackPlayer from '@/core/trackPlayer'
import musicSheetManager from '@/core/musicSheet'
import Toast from '@/components/Toast'

interface LocalMusicItem {
    id: string
    title: string
    artist: string
    duration: number
    url: string
    platform: string
    file: File
}

/** 从文件名中提取歌曲信息 */
function parseFileName(fileName: string): { title: string; artist: string } {
    // 去掉扩展名
    const name = fileName.replace(/\.(mp3|m4a|flac|wav|ogg|aac|wma)$/i, '')
    // 尝试按 " - " 分割为歌手 - 歌名
    const parts = name.split(' - ')
    if (parts.length >= 2) {
        return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() }
    }
    return { title: name, artist: '未知歌手' }
}

/** 获取音频时长 */
function getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
        const audio = new Audio()
        audio.preload = 'metadata'
        audio.onloadedmetadata = () => {
            resolve(audio.duration || 0)
            URL.revokeObjectURL(audio.src)
        }
        audio.onerror = () => {
            resolve(0)
            URL.revokeObjectURL(audio.src)
        }
        audio.src = URL.createObjectURL(file)
    })
}

export default function LocalMusic() {
    const [localFiles, setLocalFiles] = useState<LocalMusicItem[]>([])
    const [importing, setImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files?.length) return

        setImporting(true)
        const items: LocalMusicItem[] = []

        for (const file of Array.from(files)) {
            const { title, artist } = parseFileName(file.name)
            const duration = await getAudioDuration(file)
            const url = URL.createObjectURL(file)

            items.push({
                id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                title,
                artist,
                duration,
                url,
                platform: '本地音乐',
                file,
            })
        }

        setLocalFiles(prev => [...prev, ...items])
        setImporting(false)
        Toast.success(`成功导入 ${items.length} 首本地音乐`)

        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handlePlayAll = async () => {
        if (localFiles.length === 0) return
        const musicItems = localFiles.map(f => ({
            id: f.id,
            title: f.title,
            artist: f.artist,
            duration: f.duration,
            url: f.url,
            platform: f.platform,
        }))
        await trackPlayer.setQueueAndPlay(musicItems, 0)
    }

    const handlePlayItem = async (index: number) => {
        const musicItems = localFiles.map(f => ({
            id: f.id,
            title: f.title,
            artist: f.artist,
            duration: f.duration,
            url: f.url,
            platform: f.platform,
        }))
        await trackPlayer.setQueueAndPlay(musicItems, index)
    }

    const handleAddToFavorites = async (item: LocalMusicItem) => {
        await musicSheetManager.addToFavorites({
            id: item.id,
            title: item.title,
            artist: item.artist,
            duration: item.duration,
            url: item.url,
            platform: item.platform,
        })
        Toast.success('已添加到我喜欢')
    }

    const handleRemoveItem = (index: number) => {
        setLocalFiles(prev => {
            const next = [...prev]
            // 释放 Object URL
            URL.revokeObjectURL(next[index].url)
            next.splice(index, 1)
            return next
        })
    }

    const formatDuration = (seconds: number) => {
        if (!seconds || !isFinite(seconds)) return '--:--'
        const m = Math.floor(seconds / 60)
        const s = Math.floor(seconds % 60)
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-white">本地音乐</h1>
                <div className="flex items-center gap-3">
                    {localFiles.length > 0 && (
                        <button
                            onClick={handlePlayAll}
                            className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500
                                text-white text-sm font-medium transition-colors flex items-center gap-1.5"
                        >
                            <img src="/icons/svg/play.svg" alt="" className="w-4 h-4" />
                            播放全部
                        </button>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".mp3,.m4a,.flac,.wav,.ogg,.aac,.wma"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        id="local-music-input"
                    />
                    <label
                        htmlFor="local-music-input"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
                            bg-white/5 border border-white/10 hover:bg-white/10
                            text-sm text-surface-300 cursor-pointer transition-colors"
                    >
                        <img src="/icons/svg/arrow-up-tray.svg" alt="" className="w-4 h-4 opacity-60" />
                        {importing ? '导入中...' : '导入音乐'}
                    </label>
                </div>
            </div>

            <p className="text-xs text-surface-300/50">
                支持 MP3、M4A、FLAC、WAV、OGG 等格式。导入的音乐仅在当前会话有效，刷新页面后需重新导入。
            </p>

            {localFiles.length === 0 ? (
                <div className="text-center py-16">
                    <img src="/icons/svg/musical-note.svg" alt="" className="w-16 h-16 mx-auto opacity-20 mb-4" />
                    <p className="text-surface-300/50 text-sm">还没有导入本地音乐</p>
                    <p className="text-surface-300/30 text-xs mt-1">点击上方「导入音乐」按钮选择本地音频文件</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {localFiles.map((item, index) => (
                        <div
                            key={item.id}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg
                                hover:bg-white/5 transition-colors group"
                        >
                            <span className="text-xs text-surface-300/30 w-6 text-center shrink-0">
                                {index + 1}
                            </span>
                            <button
                                onClick={() => handlePlayItem(index)}
                                className="flex-1 min-w-0 text-left"
                            >
                                <p className="text-sm text-white truncate">{item.title}</p>
                                <p className="text-xs text-surface-300/60 truncate">
                                    {item.artist} · {formatDuration(item.duration)}
                                </p>
                            </button>
                            <button
                                onClick={() => handleAddToFavorites(item)}
                                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-60
                                    hover:!opacity-100 hover:bg-white/10 transition-all"
                                aria-label="收藏"
                            >
                                <img src="/icons/svg/heart-outline.svg" alt="" className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleRemoveItem(index)}
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
