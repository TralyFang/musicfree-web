import { useState } from 'react'

export default function Search() {
    const [query, setQuery] = useState('')

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">搜索</h1>

            {/* 搜索输入框 */}
            <div className="relative max-w-xl">
                <img
                    src="/icons/svg/magnifying-glass.svg"
                    alt="搜索"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50"
                />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="搜索歌曲、专辑、歌手..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10
                        text-white placeholder:text-surface-300/40
                        focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.07]
                        transition-all"
                />
            </div>

            {/* 搜索结果区域 */}
            <div className="text-sm text-surface-300/50 py-12 text-center">
                {query
                    ? '请先安装插件后再搜索'
                    : '输入关键词开始搜索'}
            </div>
        </div>
    )
}
