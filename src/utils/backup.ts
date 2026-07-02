/**
 * 备份与恢复 - 兼容 MusicFree 原生 App 格式
 *
 * 备份格式（与主项目一致）:
 * {
 *     musicSheets: IMusic.IMusicSheetItem[],  // 每项含 id, title, musicList(对象数组), coverImg 等
 *     plugins: Array<{ srcUrl: string; version: string }>,
 * }
 */
import { db } from './db'
import musicSheetManager from '@/core/musicSheet'
import pluginManager, { pluginsAtom } from '@/core/pluginManager'
import { getDefaultStore } from 'jotai'

/** 恢复模式 - 与主项目保持一致 */
export enum ResumeMode {
    /** 追加：所有歌单作为新歌单创建 */
    Append = 'append',
    /** 覆盖：清空后导入 */
    Overwrite = 'overwrite',
    /** 覆盖默认歌单，同名歌单合并 */
    OverwriteDefault = 'overwrite-default',
}

interface IBackupJson {
    musicSheets: Array<{
        id: string
        title: string
        musicList: any[]
        coverImg?: string
        platform?: string
        worksNum?: number
        [k: string]: any
    }>
    plugins: Array<{ srcUrl: string; version: string }>
}

/** 导出备份数据（与主项目格式完全一致） */
export async function exportBackup(): Promise<void> {
    // 获取所有歌单
    const sheets = await db.musicSheets.toArray()
    const musicSheets = sheets.map(sheet => ({
        id: sheet.id,
        title: sheet.title,
        coverImg: sheet.coverImg || '',
        musicList: JSON.parse(sheet.musicList || '[]'),
    }))

    // 获取所有已启用的插件
    const store = getDefaultStore()
    const plugins = store.get(pluginsAtom)
    const normalizedPlugins = plugins
        .filter(p => p.instance?.srcUrl)
        .map(p => ({
            srcUrl: p.instance.srcUrl,
            version: p.instance?.version ?? '0.0.0',
        }))

    const backupData: IBackupJson = {
        musicSheets,
        plugins: normalizedPlugins,
    }

    const json = JSON.stringify(backupData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `backup.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

/**
 * 恢复备份（与主项目逻辑一致）
 * @param resumeMode 恢复模式
 */
export async function importBackup(
    resumeMode: ResumeMode = ResumeMode.Overwrite,
): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) {
                resolve({ success: false, message: '未选择文件' })
                return
            }

            try {
                const text = await file.text()
                const result = await resume(text, resumeMode)
                resolve(result)
            } catch (err: any) {
                resolve({ success: false, message: `恢复失败: ${err.message}` })
            }
        }

        input.click()
    })
}

/**
 * 核心恢复逻辑 - 按照主项目 Backup.resume 实现
 */
async function resume(
    raw: string | object,
    resumeMode: ResumeMode = ResumeMode.Overwrite,
): Promise<{ success: boolean; message: string }> {
    let obj: IBackupJson
    if (typeof raw === 'string') {
        obj = JSON.parse(raw)
    } else {
        obj = raw as IBackupJson
    }

    const { plugins, musicSheets } = obj ?? {}

    if (!musicSheets && !plugins) {
        return { success: false, message: '无效的备份文件格式' }
    }

    let pluginCount = 0
    let sheetCount = 0

    /** 恢复插件 */
    if (plugins?.length) {
        const installedPlugins = getDefaultStore().get(pluginsAtom)

        for (const pluginInfo of plugins) {
            if (!pluginInfo.srcUrl) continue

            // 检查是否已安装（同源且本地版本更高则跳过）
            const existing = installedPlugins.find(
                p => p.instance?.srcUrl === pluginInfo.srcUrl
            )
            if (existing) {
                // 已安装，跳过
                continue
            }

            // 从 URL 安装
            try {
                const result = await pluginManager.installPluginFromUrl(pluginInfo.srcUrl)
                if (result.success) pluginCount++
            } catch {
                // 单个插件安装失败不中断整体流程
            }
        }
    }

    /** 恢复歌单 */
    if (musicSheets?.length) {
        if (resumeMode === ResumeMode.Overwrite) {
            // 覆盖模式：清空所有歌单后重新导入
            await db.musicSheets.clear()

            for (let i = musicSheets.length - 1; i >= 0; i--) {
                const sheet = musicSheets[i]
                const newSheet = await musicSheetManager.create(sheet.title || '未命名歌单', sheet.coverImg)
                if (sheet.musicList?.length) {
                    await musicSheetManager.addMusic(newSheet.id, sheet.musicList)
                }
                sheetCount++
            }
        } else if (resumeMode === ResumeMode.Append) {
            // 追加模式：逆序恢复，最新创建的在最上方
            for (let i = musicSheets.length - 1; i >= 0; i--) {
                const sheet = musicSheets[i]
                const newSheet = await musicSheetManager.create(sheet.title || '未命名歌单', sheet.coverImg)
                if (sheet.musicList?.length) {
                    await musicSheetManager.addMusic(newSheet.id, sheet.musicList)
                }
                sheetCount++
            }
        } else if (resumeMode === ResumeMode.OverwriteDefault) {
            // 覆盖默认 + 合并同名
            const existingSheets = await db.musicSheets.toArray()
            const existsSheetMap: Record<string, string> = {}
            existingSheets.forEach(s => {
                existsSheetMap[s.title] = s.id
            })

            for (let i = musicSheets.length - 1; i >= 0; i--) {
                const sheet = musicSheets[i]
                const title = sheet.title || '未命名歌单'
                let targetId = existsSheetMap[title]

                if (!targetId) {
                    const newSheet = await musicSheetManager.create(title, sheet.coverImg)
                    targetId = newSheet.id
                }

                if (sheet.musicList?.length) {
                    await musicSheetManager.addMusic(targetId, sheet.musicList)
                }
                sheetCount++
            }
        }

        // 刷新歌单状态
        await musicSheetManager.setup()
    }

    const parts: string[] = []
    if (sheetCount > 0) parts.push(`${sheetCount} 个歌单`)
    if (pluginCount > 0) parts.push(`${pluginCount} 个插件`)

    return {
        success: true,
        message: `恢复成功！已导入 ${parts.join('、') || '数据'}`,
    }
}
