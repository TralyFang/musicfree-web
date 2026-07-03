/**
 * Toast 轻量提示组件
 * 全局单例，通过 Toast.show('message') 调用
 */
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface ToastItem {
    id: number
    message: string
    type: 'info' | 'success' | 'error'
}

let toastId = 0
let addToastFn: ((item: ToastItem) => void) | null = null

/** Toast 容器组件 - 放在 App 根级 */
export function ToastContainer() {
    const [toasts, setToasts] = useState<ToastItem[]>([])

    const addToast = useCallback((item: ToastItem) => {
        setToasts(prev => [...prev, item])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== item.id))
        }, 2500)
    }, [])

    useEffect(() => {
        addToastFn = addToast
        return () => { addToastFn = null }
    }, [addToast])

    if (toasts.length === 0) return null

    return createPortal(
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`
                        px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg backdrop-blur-md
                        animate-[toast-in_0.3s_ease-out]
                        ${toast.type === 'error' ? 'bg-red-500/90 text-white' :
                          toast.type === 'success' ? 'bg-green-500/90 text-white' :
                          'bg-surface-800/90 text-white'}
                    `}
                >
                    {toast.message}
                </div>
            ))}
        </div>,
        document.body
    )
}

/** 静态调用方法 */
const Toast = {
    show(message: string, type: 'info' | 'success' | 'error' = 'info') {
        if (addToastFn) {
            addToastFn({ id: ++toastId, message, type })
        }
    },
    success(message: string) {
        this.show(message, 'success')
    },
    error(message: string) {
        this.show(message, 'error')
    },
}

export default Toast
