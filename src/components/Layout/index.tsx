import { Outlet, useLocation } from 'react-router-dom'
import { useAtom } from 'jotai'
import Sidebar from '@/components/Sidebar'
import MusicBar from '@/components/MusicBar'
import { sidebarOpenAtom } from '@/store'

/** 页面淡入过渡组件 */
function PageTransition({ children }: { children: React.ReactNode }) {
    const location = useLocation()
    return (
        <div key={location.pathname} className="animate-page-in">
            {children}
        </div>
    )
}

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom)

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-surface-950">
            {/* 移动端遮罩 */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* 侧边栏 - 桌面常驻，移动端抽屉 */}
            <div
                className={`
                    fixed inset-y-0 left-0 z-50 w-60 transform transition-transform duration-300 ease-in-out
                    lg:relative lg:translate-x-0 lg:z-auto
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            {/* 主内容区 */}
            <main className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* 移动端顶部栏 */}
                <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-surface-900/50 border-b border-white/5 shrink-0">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
                        aria-label="打开菜单"
                    >
                        <img src="/icons/svg/bars-3.svg" alt="菜单" className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <img src="/icons/logo.png" alt="MusicFree" className="w-6 h-6 rounded" />
                        <span className="text-sm font-semibold text-white">MusicFree</span>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
                    <PageTransition>
                        <Outlet />
                    </PageTransition>
                </div>
            </main>

            {/* 底部播放栏 */}
            <MusicBar />
        </div>
    )
}
