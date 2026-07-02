/** 播放模式 */
export enum RepeatMode {
    /** 列表循环 */
    Queue = 'queue',
    /** 单曲循环 */
    RepeatOne = 'repeat-one',
    /** 随机播放 */
    Shuffle = 'shuffle',
}

/** 本地存储键名 */
export const StorageKeys = {
    /** 当前播放歌曲 */
    CurrentMusic: 'musicfree-current-music',
    /** 播放模式 */
    RepeatMode: 'musicfree-repeat-mode',
    /** 音量 */
    Volume: 'musicfree-volume',
    /** 代理地址 */
    ProxyUrl: 'musicfree-proxy-url',
    /** 主题 */
    Theme: 'musicfree-theme',
} as const;

/** 默认封面图 */
export const DefaultArtwork = '/icons/logo.png';
