/**
 * 歌单管理模块
 * 支持创建/编辑/删除/导入歌单
 */
import { db, type IDBMusicSheet } from '@/utils/db'
import { nanoid } from 'nanoid'
import { atom, getDefaultStore } from 'jotai'

/** 歌单列表状态 */
export const musicSheetsAtom = atom<IDBMusicSheet[]>([])

const store = getDefaultStore()

class MusicSheetManager {
    /** 初始化：加载所有歌单 */
    async setup() {
        const sheets = await db.musicSheets.orderBy('createdAt').reverse().toArray()
        store.set(musicSheetsAtom, sheets)
    }

    /** 获取所有歌单 */
    async getAll(): Promise<IDBMusicSheet[]> {
        return db.musicSheets.orderBy('createdAt').reverse().toArray()
    }

    /** 获取单个歌单 */
    async getById(id: string): Promise<IDBMusicSheet | undefined> {
        return db.musicSheets.get(id)
    }

    /** 创建歌单 */
    async create(title: string, coverImg?: string): Promise<IDBMusicSheet> {
        const now = Date.now()
        const sheet: IDBMusicSheet = {
            id: nanoid(),
            title,
            coverImg,
            musicList: '[]',
            createdAt: now,
            updatedAt: now,
        }
        await db.musicSheets.add(sheet)
        await this.refreshState()
        return sheet
    }

    /** 更新歌单标题 */
    async updateTitle(id: string, title: string) {
        await db.musicSheets.update(id, { title, updatedAt: Date.now() })
        await this.refreshState()
    }

    /** 删除歌单 */
    async remove(id: string) {
        await db.musicSheets.delete(id)
        await this.refreshState()
    }

    /** 添加歌曲到歌单 */
    async addMusic(sheetId: string, musicItems: any[]) {
        const sheet = await db.musicSheets.get(sheetId)
        if (!sheet) return

        const existingList: any[] = JSON.parse(sheet.musicList || '[]')
        const existingIds = new Set(existingList.map(m => `${m.platform}-${m.id}`))

        // 去重添加
        const newItems = musicItems.filter(m => !existingIds.has(`${m.platform}-${m.id}`))
        const updatedList = [...existingList, ...newItems]

        await db.musicSheets.update(sheetId, {
            musicList: JSON.stringify(updatedList),
            updatedAt: Date.now(),
        })
        await this.refreshState()
    }

    /** 从歌单移除歌曲 */
    async removeMusic(sheetId: string, musicItem: any) {
        const sheet = await db.musicSheets.get(sheetId)
        if (!sheet) return

        const list: any[] = JSON.parse(sheet.musicList || '[]')
        const filtered = list.filter(
            m => !(m.platform === musicItem.platform && m.id === musicItem.id)
        )

        await db.musicSheets.update(sheetId, {
            musicList: JSON.stringify(filtered),
            updatedAt: Date.now(),
        })
        await this.refreshState()
    }

    /** 获取歌单内的歌曲列表 */
    async getMusicList(sheetId: string): Promise<any[]> {
        const sheet = await db.musicSheets.get(sheetId)
        if (!sheet) return []
        return JSON.parse(sheet.musicList || '[]')
    }

    /** 刷新状态 */
    private async refreshState() {
        const sheets = await this.getAll()
        store.set(musicSheetsAtom, sheets)
    }
}

const musicSheetManager = new MusicSheetManager()
export default musicSheetManager
