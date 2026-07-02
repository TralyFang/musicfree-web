import { useParams } from 'react-router-dom'

export default function Playlist() {
    const { id } = useParams()

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">歌单详情</h1>
            <p className="text-sm text-surface-300/50">歌单 ID: {id}</p>
            <div className="text-sm text-surface-300/50 py-12 text-center border border-dashed border-white/10 rounded-xl">
                歌单功能开发中...
            </div>
        </div>
    )
}
