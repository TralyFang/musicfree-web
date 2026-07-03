import { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useAtomValue } from 'jotai'
import { isPlayingAtom } from '@/store'

/**
 * PWA 更新提示组件
 *
 * 更新策略：
 * - 前台 + 未播放 → 显示更新横幅，用户手动确认
 * - 前台 + 播放中 → 显示更新横幅，用户手动确认（不中断播放）
 * - 后台 + 未播放 → 静默自动更新
 * - 后台 + 播放中 → 等待播放结束或回到前台时再处理
 */
export default function ReloadPrompt() {
    const isPlaying = useAtomValue(isPlayingAtom)
    const isPlayingRef = useRef(isPlaying)
    isPlayingRef.current = isPlaying

    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(_swUrl, registration) {
            // 每小时检查一次更新
            if (registration) {
                setInterval(() => {
                    registration.update()
                }, 60 * 60 * 1000)
            }
        },
        onRegisterError(error) {
            console.error('SW registration error:', error)
        },
    })

    const pendingUpdateRef = useRef(false)
    const updateSWRef = useRef(updateServiceWorker)
    updateSWRef.current = updateServiceWorker

    // 当 needRefresh 变为 true 时，根据场景决定行为
    useEffect(() => {
        if (!needRefresh) return

        if (document.hidden && !isPlayingRef.current) {
            // 后台 + 未播放 → 静默更新
            updateServiceWorker(true)
        } else if (document.hidden && isPlayingRef.current) {
            // 后台 + 播放中 → 标记 pending，等后续处理
            pendingUpdateRef.current = true
        }
        // 前台情况 → 显示横幅（由 JSX 渲染控制）
    }, [needRefresh, updateServiceWorker])

    // 监听 visibilitychange：回到前台时如果有 pending + 未播放，自动更新
    useEffect(() => {
        const handleVisibility = () => {
            if (!document.hidden && pendingUpdateRef.current && !isPlayingRef.current) {
                console.log('[SW] 回到前台，自动更新')
                updateSWRef.current(true)
                pendingUpdateRef.current = false
                setNeedRefresh(false)
            }
        }
        document.addEventListener('visibilitychange', handleVisibility)
        return () => document.removeEventListener('visibilitychange', handleVisibility)
    }, [setNeedRefresh])

    // 监听播放状态：播放结束时如果在后台 + 有 pending，自动更新
    useEffect(() => {
        if (!isPlaying && pendingUpdateRef.current) {
            if (document.hidden) {
                console.log('[SW] 播放结束，后台静默更新')
                updateSWRef.current(true)
                pendingUpdateRef.current = false
            }
            // 如果在前台且未播放，横幅仍显示，用户可以点击
        }
    }, [isPlaying])

    // 前台场景：显示更新横幅（仅当 needRefresh 且非后台已处理时）
    if (!needRefresh || (document.hidden && !isPlayingRef.current)) return null

    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] animate-page-in">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-800 border border-white/10 shadow-2xl shadow-black/50">
                <div className="flex items-center gap-2">
                    <img src="/icons/svg/arrow-path.svg" alt="" className="w-4 h-4 opacity-60" />
                    <span className="text-sm text-white">发现新版本</span>
                </div>
                <button
                    onClick={() => updateServiceWorker(true)}
                    className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium transition-colors"
                >
                    立即更新
                </button>
                <button
                    onClick={() => setNeedRefresh(false)}
                    className="p-1 rounded-md hover:bg-white/10 transition-colors"
                    aria-label="稍后更新"
                >
                    <img src="/icons/svg/x-mark.svg" alt="" className="w-4 h-4 opacity-40" />
                </button>
            </div>
        </div>
    )
}
