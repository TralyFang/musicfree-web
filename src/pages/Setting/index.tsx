export default function Setting() {
    return (
        <div className="space-y-6 md:space-y-8">
            <h1 className="text-xl md:text-2xl font-bold text-white">设置</h1>

            {/* 插件管理 */}
            <section className="space-y-3 md:space-y-4">
                <h2 className="text-base md:text-lg font-semibold text-white">插件管理</h2>
                <div className="p-4 md:p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
                    <p className="text-sm text-surface-300/70">
                        通过安装插件来扩展音乐源。支持从 URL 安装或导入本地文件。
                    </p>

                    {/* 安装按钮区域 */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button className="px-4 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-colors active:scale-[0.97]">
                            从 URL 安装
                        </button>
                        <button className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors active:scale-[0.97]">
                            导入本地文件
                        </button>
                    </div>

                    {/* 已安装插件列表 */}
                    <div className="border-t border-white/5 pt-4">
                        <h3 className="text-sm font-medium text-surface-300 mb-3">
                            已安装插件
                        </h3>
                        <div className="text-sm text-surface-300/50 py-4 text-center">
                            暂无已安装的插件
                        </div>
                    </div>
                </div>
            </section>

            {/* 通用设置 */}
            <section className="space-y-3 md:space-y-4">
                <h2 className="text-base md:text-lg font-semibold text-white">通用设置</h2>
                <div className="p-4 md:p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
                    {/* 代理设置 */}
                    <div>
                        <label className="block text-sm text-surface-300 mb-2">
                            CORS 代理地址
                        </label>
                        <input
                            type="text"
                            placeholder="https://your-cors-proxy.workers.dev"
                            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10
                                text-white text-sm placeholder:text-surface-300/40
                                focus:outline-none focus:border-primary-500/50
                                transition-all"
                        />
                        <p className="text-xs text-surface-300/40 mt-1.5">
                            用于解决跨域请求问题，留空则尝试直连
                        </p>
                    </div>
                </div>
            </section>

            {/* 关于 */}
            <section className="space-y-3 md:space-y-4">
                <h2 className="text-base md:text-lg font-semibold text-white">关于</h2>
                <div className="p-4 md:p-5 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                        <img src="/icons/logo.png" alt="logo" className="w-10 h-10 rounded-xl" />
                        <div>
                            <p className="text-sm font-medium text-white">MusicFree Web</p>
                            <p className="text-xs text-surface-300/60">v0.1.0</p>
                        </div>
                    </div>
                    <p className="text-sm text-surface-300/60">
                        一个免费的、基于插件的音乐播放器 PWA 版本。
                    </p>
                </div>
            </section>
        </div>
    )
}
