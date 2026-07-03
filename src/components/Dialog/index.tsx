import { useState, useRef, useEffect } from 'react'
import { createRoot } from 'react-dom/client'

interface DialogOptions {
    title: string
    content?: string
    confirmText?: string
    cancelText?: string
    showCancel?: boolean
    onConfirm?: () => void | Promise<void>
    onCancel?: () => void
}

interface InputDialogOptions extends Omit<DialogOptions, 'onConfirm'> {
    placeholder?: string
    defaultValue?: string
    onConfirm?: (value: string) => void | Promise<void>
}

function DialogComponent({
    title,
    content,
    confirmText = '确定',
    cancelText = '取消',
    showCancel = true,
    onConfirm,
    onCancel,
    onClose,
}: DialogOptions & { onClose: () => void }) {
    const handleConfirm = async () => {
        await onConfirm?.()
        onClose()
    }

    const handleCancel = () => {
        onCancel?.()
        onClose()
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ animation: 'fade-in 0.15s ease' }}>
            <div className="absolute inset-0 bg-black/60" onClick={handleCancel} />
            <div className="relative bg-surface-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                style={{ animation: 'fade-in 0.2s ease' }}>
                <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                {content && <p className="text-sm text-surface-300/70 mb-4">{content}</p>}
                <div className="flex gap-3 mt-4">
                    {showCancel && (
                        <button
                            onClick={handleCancel}
                            className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 text-sm text-surface-300/70
                                hover:bg-white/10 transition-colors"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={handleConfirm}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-primary-600 text-sm text-white
                            hover:bg-primary-500 transition-colors"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}

function InputDialogComponent({
    title,
    content,
    placeholder,
    defaultValue = '',
    confirmText = '确定',
    cancelText = '取消',
    onConfirm,
    onCancel,
    onClose,
}: InputDialogOptions & { onClose: () => void }) {
    const [value, setValue] = useState(defaultValue)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const handleConfirm = async () => {
        await (onConfirm as (v: string) => void | Promise<void>)?.(value)
        onClose()
    }

    const handleCancel = () => {
        onCancel?.()
        onClose()
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ animation: 'fade-in 0.15s ease' }}>
            <div className="absolute inset-0 bg-black/60" onClick={handleCancel} />
            <div className="relative bg-surface-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                style={{ animation: 'fade-in 0.2s ease' }}>
                <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                {content && <p className="text-sm text-surface-300/70 mb-3">{content}</p>}
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10
                        text-sm text-white placeholder:text-surface-300/40
                        focus:outline-none focus:border-primary-500/50"
                />
                <div className="flex gap-3 mt-4">
                    <button
                        onClick={handleCancel}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 text-sm text-surface-300/70
                            hover:bg-white/10 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-primary-600 text-sm text-white
                            hover:bg-primary-500 transition-colors"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}

// 命令式调用
function createDialogContainer() {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const destroy = () => {
        root.unmount()
        container.remove()
    }

    return { root, destroy }
}

const Dialog = {
    /** 确认弹窗 */
    confirm(options: DialogOptions) {
        const { root, destroy } = createDialogContainer()
        root.render(<DialogComponent {...options} onClose={destroy} />)
    },

    /** 提示弹窗（无取消按钮） */
    alert(options: Omit<DialogOptions, 'showCancel'>) {
        const { root, destroy } = createDialogContainer()
        root.render(<DialogComponent {...options} showCancel={false} onClose={destroy} />)
    },

    /** 输入弹窗 */
    input(options: InputDialogOptions) {
        const { root, destroy } = createDialogContainer()
        root.render(<InputDialogComponent {...options} onClose={destroy} />)
    },
}

export default Dialog
