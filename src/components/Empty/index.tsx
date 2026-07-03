/**
 * 空状态组件
 * 用于无数据时的友好提示
 */

interface EmptyProps {
    icon?: string
    title?: string
    description?: string
    className?: string
    children?: React.ReactNode
}

export default function Empty({
    icon = '/icons/svg/inbox-arrow-down.svg',
    title = '暂无数据',
    description,
    className = '',
    children,
}: EmptyProps) {
    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
            <img
                src={icon}
                alt=""
                className="w-16 h-16 opacity-15 mb-4"
            />
            <p className="text-sm text-surface-300/50 mb-1">{title}</p>
            {description && (
                <p className="text-xs text-surface-300/30">{description}</p>
            )}
            {children && <div className="mt-4">{children}</div>}
        </div>
    )
}
