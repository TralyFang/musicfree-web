/**
 * 骨架屏组件
 * 用于列表/内容加载时的占位显示
 */

interface SkeletonProps {
    className?: string
}

/** 单行骨架 */
export function SkeletonLine({ className = '' }: SkeletonProps) {
    return (
        <div className={`h-4 rounded bg-white/5 animate-pulse ${className}`} />
    )
}

/** 歌曲列表项骨架 */
export function SkeletonMusicItem() {
    return (
        <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-10 h-10 rounded-lg bg-white/5 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-3.5 w-3/4 rounded bg-white/5 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-white/[0.03] animate-pulse" />
            </div>
        </div>
    )
}

/** 歌曲列表骨架（多行） */
export function SkeletonMusicList({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-1">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonMusicItem key={i} />
            ))}
        </div>
    )
}

/** 卡片骨架 */
export function SkeletonCard() {
    return (
        <div className="rounded-xl bg-white/5 animate-pulse p-4 space-y-3">
            <div className="w-full aspect-square rounded-lg bg-white/[0.03]" />
            <div className="h-3.5 w-3/4 rounded bg-white/[0.03]" />
            <div className="h-3 w-1/2 rounded bg-white/[0.02]" />
        </div>
    )
}

/** 卡片网格骨架 */
export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    )
}
