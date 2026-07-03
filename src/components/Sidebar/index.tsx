import { NavLink } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { musicSheetsAtom } from '@/core/musicSheet'

const navItems = [
    { path: '/', label: '首页', icon: 'home-outline' },
    { path: '/search', label: '搜索', icon: 'magnifying-glass' },
    { path: '/toplist', label: '榜单', icon: 'trophy' },
    { path: '/recommend', label: '推荐歌单', icon: 'fire-outline' },
    { path: '/sheets', label: '我的歌单', icon: 'playlist' },
    { path: '/history', label: '历史', icon: 'clock-outline' },
    { path: '/local', label: '本地音乐', icon: 'folder-music-outline' },
    { path: '/playing', label: '正在播放', icon: 'musical-note' },
    { path: '/setting', label: '设置', icon: 'cog-8-tooth' },
]

interface SidebarProps {
    onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
    const sheets = useAtomValue(musicSheetsAtom)

    return (
        <aside className="w-60 h-full bg-surface-900 lg:bg-surface-900/50 border-r border-white/5 flex flex-col shrink-0">
            {/* Logo */}
            <div className="flex items-center justify-between px-5 py-5">
                <div className="flex items-center gap-3">
                    <img
                        src="/icons/logo.png"
                        alt="MusicFree"
                        className="w-8 h-8 rounded-lg"
                    />
                    <span className="text-lg font-semibold text-white">
                        MusicFree
                    </span>
                </div>
                {/* 移动端关闭按钮 */}
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors lg:hidden"
                    aria-label="关闭菜单"
                >
                    <img src="/icons/svg/x-mark.svg" alt="关闭" className="w-5 h-5" />
                </button>
            </div>

            {/* 导航 */}
            <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
                <div className="text-xs text-surface-300/60 uppercase tracking-wider px-4 py-2">
                    菜单
                </div>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        onClick={onClose}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'nav-item-active' : ''}`
                        }
                    >
                        <img
                            src={`/icons/svg/${item.icon}.svg`}
                            alt={item.label}
                            className="w-5 h-5 opacity-80"
                        />
                        <span>{item.label}</span>
                    </NavLink>
                ))}

                {/* 歌单区域 */}
                {sheets.length > 0 && (
                    <div className="mt-6">
                        <div className="text-xs text-surface-300/60 uppercase tracking-wider px-4 py-2">
                            我的歌单
                        </div>
                        <div className="space-y-0.5">
                            {sheets.slice(0, 10).map((sheet) => (
                                <NavLink
                                    key={sheet.id}
                                    to={`/playlist/${sheet.id}`}
                                    onClick={onClose}
                                    className={({ isActive }) =>
                                        `nav-item text-sm ${isActive ? 'nav-item-active' : ''}`
                                    }
                                >
                                    <img
                                        src="/icons/svg/musical-note.svg"
                                        alt=""
                                        className="w-4 h-4 opacity-50"
                                    />
                                    <span className="truncate">{sheet.title}</span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                )}
            </nav>

            {/* 底部信息 */}
            <div className="px-5 py-4 border-t border-white/5">
                <p className="text-xs text-surface-300/40">
                    MusicFree Web v0.1.0
                </p>
            </div>
        </aside>
    )
}
