import Dexie, { type EntityTable } from 'dexie';

/** 插件存储 */
export interface IDBPlugin {
    /** SHA256 哈希作为主键 */
    hash: string;
    /** 插件名 */
    name: string;
    /** 平台标识 */
    platform: string;
    /** 插件源码 */
    code: string;
    /** 插件版本 */
    version?: string;
    /** 远程更新 URL */
    srcUrl?: string;
    /** 插件作者 */
    author?: string;
    /** 插件描述 */
    description?: string;
    /** 创建时间 */
    createdAt: number;
}

/** 插件元数据 */
export interface IDBPluginMeta {
    /** 插件平台名 作为主键 */
    name: string;
    /** 排序 */
    order: number;
    /** 是否启用 */
    enabled: boolean;
    /** 用户自定义变量 */
    userVariables: Record<string, string>;
}

/** 播放列表 */
export interface IDBPlaylist {
    /** 播放列表ID */
    id: string;
    /** 列表中的歌曲 */
    musicItems: string; // JSON 序列化的 IMusicItem[]
    /** 更新时间 */
    updatedAt: number;
}

/** 歌单 */
export interface IDBMusicSheet {
    /** 歌单ID */
    id: string;
    /** 歌单标题 */
    title: string;
    /** 封面 */
    coverImg?: string;
    /** 歌曲列表 */
    musicList: string; // JSON 序列化的 IMusicItem[]
    /** 创建时间 */
    createdAt: number;
    /** 更新时间 */
    updatedAt: number;
}

/** 播放历史 */
export interface IDBHistory {
    /** platform + id 组合主键 */
    id: string;
    /** 歌曲数据 */
    musicItem: string; // JSON 序列化的 IMusicItem
    /** 时间戳 */
    timestamp: number;
}

/** 媒体缓存 */
export interface IDBMediaCache {
    /** platform + id 组合 */
    key: string;
    /** 缓存数据 */
    data: string; // JSON 序列化
    /** 更新时间 */
    updatedAt: number;
}

/** 歌词缓存 */
export interface IDBLyricCache {
    /** platform + id 组合 */
    key: string;
    /** 原始歌词 */
    rawLrc: string;
    /** 翻译歌词 */
    translation?: string;
    /** 更新时间 */
    updatedAt: number;
}

const DB_NAME = 'MusicFreeDB'
const DB_VERSION = 2

const DB_STORES = {
    plugins: 'hash, name, platform, createdAt',
    pluginMeta: 'name, order, enabled',
    playlist: 'id, updatedAt',
    musicSheets: 'id, title, createdAt, updatedAt',
    history: 'id, timestamp',
    mediaCache: 'key, updatedAt',
    lyricCache: 'key, updatedAt',
}

function createDB(): MusicFreeDB {
    const db = new MusicFreeDB()
    return db
}

class MusicFreeDB extends Dexie {
    plugins!: EntityTable<IDBPlugin, 'hash'>;
    pluginMeta!: EntityTable<IDBPluginMeta, 'name'>;
    playlist!: EntityTable<IDBPlaylist, 'id'>;
    musicSheets!: EntityTable<IDBMusicSheet, 'id'>;
    history!: EntityTable<IDBHistory, 'id'>;
    mediaCache!: EntityTable<IDBMediaCache, 'key'>;
    lyricCache!: EntityTable<IDBLyricCache, 'key'>;

    constructor() {
        super(DB_NAME);
        this.version(DB_VERSION).stores(DB_STORES);
    }
}

/** 全局数据库实例 */
export let db = createDB();

/**
 * 确保数据库可用。
 * 如果打开时出现升级错误（如主键变更），自动删除旧库并重建。
 */
export async function ensureDB(): Promise<void> {
    try {
        await db.open()
    } catch (e: any) {
        const msg = e?.message || e?.inner?.message || ''
        if (
            msg.includes('UpgradeError') ||
            msg.includes('changing primary key') ||
            msg.includes('DatabaseClosedError')
        ) {
            console.warn('[DB] Schema incompatible, deleting old database and recreating...')
            try {
                db.close()
            } catch {}
            await Dexie.delete(DB_NAME)
            db = createDB()
            await db.open()
            console.info('[DB] Database recreated successfully')
        } else {
            throw e
        }
    }
}
