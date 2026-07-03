/**
 * BottomPanel - 底部弹出面板
 * 移动端从底部滑入，桌面端也可用作底部弹窗
 */
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface BottomPanelProps {
    visible: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
}

export default function BottomPanel({ visible, onClose, title, children }: BottomPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null)

    // ESC 关闭
    useEffect(() => {
        if (!visible) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [visible, onClose])

    // 阻止 body 滚动
    useEffect(() => {
        if (visible) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [visible])

    if (!visible) return null

    return createPortal(
        <div className="fixed inset-0 z-[9000] flex items-end justify-center">
            {/* 遮罩 */}
            <div
                className="absolute inset-0 bg-black/50 animate-[fade-in_0.2s_ease-out]"
                onClick={onClose}
            />
            {/* 面板 */}
            <div
                ref={panelRef}
                className="relative w-full max-w-lg max-h-[70vh] bg-surface-900 rounded-t-2xl
                    flex flex-col overflow-hidden animate-[slide-up_0.3s_ease-out]"
            >
                {/* 拖拽指示条 */}
                <div className="flex justify-center py-2 shrink-0">
                    <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>

                {/* 标题 */}
                {title && (
                    <div className="px-4 pb-2 shrink-0">
                        <h3 className="text-base font-semibold text-white">{title}</h3>
                    </div>
                )}

                {/* 内容 */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-safe pb-6">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    )
}
