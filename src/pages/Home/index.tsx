export default function Home() {
    return (
        <div className="space-y-6 md:space-y-8">
            {/* 欢迎区域 */}
            <section>
                <h1 className="text-xl md:text-2xl font-bold text-white mb-2">
                    欢迎使用 MusicFree
                </h1>
                <p className="text-sm md:text-base text-surface-300/70">
                    安装插件后即可搜索和播放音乐。前往设置页面管理插件。
                </p>
            </section>

            {/* 快速开始 */}
            <section>
                <h2 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">快速开始</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    <QuickStartCard
                        icon="/icons/svg/code-bracket-square.svg"
                        title="安装插件"
                        description="从 URL 或本地文件安装音乐源插件"
                        linkTo="/setting"
                    />
                    <QuickStartCard
                        icon="/icons/svg/magnifying-glass.svg"
                        title="搜索音乐"
                        description="安装插件后，搜索你喜欢的音乐"
                        linkTo="/search"
                    />
                    <QuickStartCard
                        icon="/icons/svg/playlist.svg"
                        title="管理歌单"
                        description="创建和管理你的个人歌单"
                        linkTo="/"
                    />
                </div>
            </section>

            {/* 最近播放 */}
            <section>
                <h2 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">最近播放</h2>
                <div className="text-sm text-surface-300/50 py-8 text-center border border-dashed border-white/10 rounded-xl">
                    暂无播放记录
                </div>
            </section>
        </div>
    )
}

function QuickStartCard({
    icon,
    title,
    description,
    linkTo,
}: {
    icon: string
    title: string
    description: string
    linkTo: string
}) {
    return (
        <a
            href={linkTo}
            className="group block p-4 md:p-5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all active:scale-[0.98]"
        >
            <img
                src={icon}
                alt={title}
                className="w-7 h-7 md:w-8 md:h-8 mb-2 md:mb-3 opacity-70 group-hover:opacity-100 transition-opacity"
            />
            <h3 className="text-sm font-medium text-white mb-1">{title}</h3>
            <p className="text-xs text-surface-300/60">{description}</p>
        </a>
    )
}
