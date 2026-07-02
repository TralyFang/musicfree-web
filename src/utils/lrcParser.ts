/**
 * LRC 歌词解析器
 * 支持标准 LRC 格式、增强 LRC、翻译歌词
 */

export interface ILyricLine {
    /** 时间（秒） */
    time: number
    /** 歌词文本 */
    text: string
    /** 翻译文本 */
    translation?: string
}

/** 时间标签正则: [mm:ss.xx] 或 [mm:ss.xxx] */
const TIME_REG = /\[(\d{1,3}):(\d{1,2})(?:\.(\d{1,3}))?\]/g

/** 解析时间标签为秒 */
function parseTime(min: string, sec: string, ms?: string): number {
    const minutes = parseInt(min, 10)
    const seconds = parseInt(sec, 10)
    let milliseconds = 0
    if (ms) {
        // 统一处理 2 位或 3 位毫秒
        milliseconds = parseInt(ms.padEnd(3, '0'), 10)
    }
    return minutes * 60 + seconds + milliseconds / 1000
}

/** 解析 LRC 歌词文本 */
export function parseLrc(lrcString: string): ILyricLine[] {
    if (!lrcString || typeof lrcString !== 'string') return []

    const lines = lrcString.split(/\r?\n/)
    const result: ILyricLine[] = []

    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        // 提取所有时间标签
        const times: number[] = []
        let match: RegExpExecArray | null
        const reg = new RegExp(TIME_REG.source, 'g')

        while ((match = reg.exec(trimmed)) !== null) {
            times.push(parseTime(match[1], match[2], match[3]))
        }

        if (times.length === 0) continue

        // 提取歌词文本（去掉时间标签）
        const text = trimmed.replace(TIME_REG, '').trim()

        // 每个时间标签都对应一行歌词
        for (const time of times) {
            result.push({ time, text })
        }
    }

    // 按时间排序
    result.sort((a, b) => a.time - b.time)
    return result
}

/** 合并翻译歌词 */
export function mergeLrcTranslation(
    original: ILyricLine[],
    translation: ILyricLine[]
): ILyricLine[] {
    if (!translation.length) return original

    const merged = original.map((line) => ({ ...line }))

    for (const transLine of translation) {
        // 找到时间最接近的原歌词行
        let closest = 0
        let minDiff = Infinity

        for (let i = 0; i < merged.length; i++) {
            const diff = Math.abs(merged[i].time - transLine.time)
            if (diff < minDiff) {
                minDiff = diff
                closest = i
            }
        }

        // 如果差距在 0.5 秒内，认为是同一行
        if (minDiff < 0.5 && transLine.text) {
            merged[closest].translation = transLine.text
        }
    }

    return merged
}

/** 根据当前时间获取高亮歌词索引 */
export function findCurrentLyricIndex(lyrics: ILyricLine[], currentTime: number): number {
    if (!lyrics.length) return -1

    // 二分查找
    let low = 0
    let high = lyrics.length - 1

    while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        if (lyrics[mid].time <= currentTime) {
            low = mid + 1
        } else {
            high = mid - 1
        }
    }

    return high
}
