/**
 * 播放历史管理
 * 自动记录播放过的歌曲
 */
import { db } from '@/utils/db'
import { atom, getDefaultStore } from 'jotai'

/** 播放历史状态 */
export const musicHistoryAtom = atom<any[]>([])

const store = getDefaultStore()
const MAX_HISTORY = 200

class MusicHistoryManager {
    /** 初始化：加载历史 */
    async setup() {
        await this.refreshState()
    }

    /** 添加到播放历史 */
    async addHistory(musicItem: any) {
        if (!musicItem?.id || !musicItem?.platform) return

        const id = `${musicItem.platform}-${musicItem.id}`
        const now = Date.now()

        // upsert：如果已存在则更新时间戳
        await db.history.put({
            id,
            musicItem: JSON.stringify(musicItem),
            timestamp: now,
        })

        // 限制历史数量
        const count = await db.history.count()
        if (count > MAX_HISTORY) {
            const oldest = await db.history.orderBy('timestamp').limit(count - MAX_HISTORY).toArray()
            await db.history.bulkDelete(oldest.map(h => h.id))
        }

        await this.refreshState()
    }

    /** 获取所有历史（按时间倒序） */
    async getAll(): Promise<any[]> {
        const records = await db.history.orderBy('timestamp').reverse().toArray()
        return records.map(r => JSON.parse(r.musicItem))
    }

    /** 清空历史 */
    async clear() {
        await db.history.clear()
        await this.refreshState()
    }

    /** 删除单条历史 */
    async remove(musicItem: any) {
        const id = `${musicItem.platform}-${musicItem.id}`
        await db.history.delete(id)
        await this.refreshState()
    }

    /** 刷新状态 */
    private async refreshState() {
        const items = await this.getAll()
        store.set(musicHistoryAtom, items)
    }
}

const musicHistoryManager = new MusicHistoryManager()
export default musicHistoryManager
