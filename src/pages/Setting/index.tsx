import { useState, useRef } from 'react'
import { useAtomValue } from 'jotai'
import pluginManager, { pluginsAtom, pluginMeta } from '@/core/pluginManager'
import { exportBackup, importBackup, ResumeMode } from '@/utils/backup'

export default function Setting() {
    const plugins = useAtomValue(pluginsAtom)
    const [installUrl, setInstallUrl] = useState('')
    const [installing, setInstalling] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text })
        setTimeout(() => setMessage(null), 3000)
    }

    /** 从 URL 安装 */
    const handleInstallFromUrl = async () => {
        if (!installUrl.trim()) return
        setInstalling(true)
        const result = await pluginManager.installPluginFromUrl(installUrl.trim())
        setInstalling(false)
        if (result.success) {
            showMessage('success', `插件「${result.pluginName}」安装成功`)
            setInstallUrl('')
        } else {
            showMessage('error', result.message ?? '安装失败')
        }
    }

    /** 从本地文件安装 */
    const handleInstallFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files?.length) return
        setInstalling(true)
        let successCount = 0
        for (const file of Array.from(files)) {
            const result = await pluginManager.installPluginFromFile(file)
            if (result.success) successCount++
        }
        setInstalling(false)
        showMessage('success', `成功安装 ${successCount} 个插件`)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    /** 卸载插件 */
    const handleUninstall = async (hash: string, name: string) => {
        await pluginManager.uninstallPlugin(hash)
        showMessage('success', `插件「${name}」已卸载`)
    }

    /** 切换启用状态 */
    const handleToggleEnabled = (plugin: any, enabled: boolean) => {
        pluginManager.setPluginEnabled(plugin, enabled)
    }

    return (
        <div className="space-y-8 max-w-2xl">
            <h1 className="text-xl md:text-2xl font-bold text-white">设置</h1>

            {/* 消息提示 */}
            {message && (
                <div className={`px-4 py-3 rounded-lg text-sm ${
                    message.type === 'success'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                    {message.text}
                </div>
            )}

            {/* 插件安装 */}
            <section className="space-y-4">
                <h2 className="text-base font-semibold text-white/90">安装插件</h2>

                {/* URL 安装 */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={installUrl}
                        onChange={(e) => setInstallUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleInstallFromUrl()}
                        placeholder="输入插件 URL..."
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10
                            text-white text-sm placeholder:text-surface-300/40
                            focus:outline-none focus:border-primary-500/50 transition-all"
                    />
                    <button
                        onClick={handleInstallFromUrl}
                        disabled={installing || !installUrl.trim()}
                        className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500
                            disabled:opacity-50 text-white text-sm font-medium transition-colors shrink-0"
                    >
                        {installing ? '安装中...' : '安装'}
                    </button>
                </div>

                {/* 本地文件安装 */}
                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".js"
                        multiple
                        onChange={handleInstallFromFile}
                        className="hidden"
                        id="plugin-file-input"
                    />
                    <label
                        htmlFor="plugin-file-input"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                            bg-white/5 border border-white/10 hover:bg-white/10
                            text-sm text-surface-300 cursor-pointer transition-colors"
                    >
                        <img src="/icons/svg/arrow-up-tray.svg" alt="" className="w-4 h-4 opacity-60" />
                        从本地文件安装
                    </label>
                </div>
            </section>

            {/* 数据备份与恢复 */}
            <section className="space-y-4">
                <h2 className="text-base font-semibold text-white/90">备份与恢复</h2>
                <p className="text-xs text-surface-300/50">
                    与 MusicFree App 格式兼容，可直接导入 App 导出的 backup.json。
                </p>

                {/* 恢复模式选择 */}
                <div className="flex items-center gap-3 text-sm text-surface-300">
                    <span className="text-white/70">恢复模式:</span>
                    <select
                        id="resume-mode"
                        defaultValue={ResumeMode.Overwrite}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10
                            text-white text-sm focus:outline-none focus:border-primary-500/50"
                    >
                        <option value={ResumeMode.Overwrite}>覆盖</option>
                        <option value={ResumeMode.Append}>追加</option>
                        <option value={ResumeMode.OverwriteDefault}>合并同名</option>
                    </select>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={async () => {
                            try {
                                await exportBackup()
                                showMessage('success', '备份文件已下载')
                            } catch (err: any) {
                                showMessage('error', `备份失败: ${err.message}`)
                            }
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                            bg-white/5 border border-white/10 hover:bg-white/10
                            text-sm text-surface-300 transition-colors"
                    >
                        <img src="/icons/svg/arrow-down-tray.svg" alt="" className="w-4 h-4 opacity-60" />
                        导出备份
                    </button>
                    <button
                        onClick={async () => {
                            const modeEl = document.getElementById('resume-mode') as HTMLSelectElement
                            const mode = (modeEl?.value as ResumeMode) || ResumeMode.Overwrite
                            const result = await importBackup(mode)
                            if (result.success) {
                                showMessage('success', result.message)
                                setTimeout(() => window.location.reload(), 1500)
                            } else {
                                showMessage('error', result.message)
                            }
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                            bg-white/5 border border-white/10 hover:bg-white/10
                            text-sm text-surface-300 transition-colors"
                    >
                        <img src="/icons/svg/arrow-up-tray.svg" alt="" className="w-4 h-4 opacity-60" />
                        恢复备份
                    </button>
                </div>
            </section>

            {/* 已安装插件列表 */}
            <section className="space-y-4">
                <h2 className="text-base font-semibold text-white/90">
                    已安装插件 ({plugins.length})
                </h2>

                {plugins.length === 0 ? (
                    <p className="text-sm text-surface-300/50 py-6 text-center">
                        暂无已安装的插件
                    </p>
                ) : (
                    <div className="space-y-2">
                        {plugins.map((plugin) => {
                            const enabled = pluginMeta.isPluginEnabled(plugin.name)
                            return (
                                <div
                                    key={plugin.hash}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl
                                        bg-white/[0.03] border border-white/5"
                                >
                                    {/* 插件信息 */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white font-medium truncate">
                                            {plugin.name}
                                        </p>
                                        <p className="text-xs text-surface-300/50 truncate">
                                            v{plugin.instance?.version ?? '未知'} ·
                                            支持: {[...plugin.supportedMethods].slice(0, 3).join(', ')}
                                        </p>
                                    </div>

                                    {/* 启用/禁用开关 */}
                                    <button
                                        onClick={() => handleToggleEnabled(plugin, !enabled)}
                                        className={`relative w-10 h-5 rounded-full transition-colors ${
                                            enabled ? 'bg-primary-600' : 'bg-white/10'
                                        }`}
                                        aria-label={enabled ? '禁用插件' : '启用插件'}
                                    >
                                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white
                                            transition-transform ${enabled ? 'left-5.5 translate-x-0.5' : 'left-0.5'}`}
                                        />
                                    </button>

                                    {/* 卸载 */}
                                    <button
                                        onClick={() => handleUninstall(plugin.hash, plugin.name)}
                                        className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                                        aria-label="卸载插件"
                                    >
                                        <img src="/icons/svg/trash-outline.svg" alt="卸载" className="w-4 h-4 opacity-60" />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>
        </div>
    )
}
