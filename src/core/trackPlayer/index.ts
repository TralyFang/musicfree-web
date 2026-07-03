/**
 * 播放器核心 - Web Audio 封装
 * 支持播放/暂停/上下首/循环/随机/Media Session
 */
import { getDefaultStore } from 'jotai'
import {
    currentMusicAtom,
    isPlayingAtom,
    currentTimeAtom,
    durationAtom,
    playQueueAtom,
    playQueueIndexAtom,
    repeatModeAtom,
} from '@/store'
import pluginManager from '@/core/pluginManager'
import musicHistoryManager from '@/core/musicHistory'
import { RepeatMode } from '@/constants'
import { wrapWithProxy } from '@/core/proxy'
import Hls from 'hls.js'

class TrackPlayer {
    private audio: HTMLAudioElement
    private store = getDefaultStore()
    private hls: Hls | null = null

    constructor() {
        this.audio = new Audio()
        this.setupEventListeners()
        this.setupMediaSession()
    }

    private setupEventListeners() {
        this.audio.addEventListener('timeupdate', () => {
            this.store.set(currentTimeAtom, this.audio.currentTime)
        })

        this.audio.addEventListener('durationchange', () => {
            this.store.set(durationAtom, this.audio.duration || 0)
        })

        this.audio.addEventListener('ended', () => {
            this.skipToNext()
        })

        this.audio.addEventListener('play', () => {
            this.store.set(isPlayingAtom, true)
        })

        this.audio.addEventListener('pause', () => {
            this.store.set(isPlayingAtom, false)
        })

        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e)
        })
    }

    private setupMediaSession() {
        if (!('mediaSession' in navigator)) return

        navigator.mediaSession.setActionHandler('play', () => this.resume())
        navigator.mediaSession.setActionHandler('pause', () => this.pause())
        navigator.mediaSession.setActionHandler('previoustrack', () => this.skipToPrevious())
        navigator.mediaSession.setActionHandler('nexttrack', () => this.skipToNext())
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime != null) this.seekTo(details.seekTime)
        })
    }

    private updateMediaSession(musicItem: any) {
        if (!('mediaSession' in navigator)) return

        navigator.mediaSession.metadata = new MediaMetadata({
            title: musicItem.title ?? '未知歌曲',
            artist: musicItem.artist ?? '未知歌手',
            album: musicItem.album ?? '',
            artwork: musicItem.artwork
                ? [{ src: musicItem.artwork, sizes: '512x512', type: 'image/png' }]
                : [],
        })
    }

    /** 销毁 HLS 实例 */
    private destroyHls() {
        if (this.hls) {
            this.hls.destroy()
            this.hls = null
        }
    }

    /** 判断是否为 HLS 地址 */
    private isHlsUrl(url: string): boolean {
        return /\.m3u8(\?.*)?$/i.test(url)
    }

    /** 播放指定歌曲 */
    async play(musicItem: any, quality: string = 'standard') {
        this.store.set(currentMusicAtom, musicItem)
        this.store.set(currentTimeAtom, 0)
        this.store.set(durationAtom, 0)
        this.destroyHls()

        // 通过插件获取音源 URL
        const plugin = pluginManager.getByMedia(musicItem)
        let source: { url: string; headers?: Record<string, string> } | null = null

        if (plugin) {
            source = await plugin.getMediaSource(musicItem, quality)
        }

        const url = source?.url || musicItem.url
        if (!url) {
            console.error('No media source available')
            return
        }

        // 外部 URL 走代理解决 CORS
        const playUrl = url.startsWith('http') ? wrapWithProxy(url, source?.headers) : url

        // HLS 流媒体支持
        if (this.isHlsUrl(url) && Hls.isSupported()) {
            this.hls = new Hls({
                xhrSetup: (xhr: XMLHttpRequest, hlsUrl: string) => {
                    // HLS 分片请求也走代理
                    const proxiedUrl = hlsUrl.startsWith('http') ? wrapWithProxy(hlsUrl) : hlsUrl
                    xhr.open('GET', proxiedUrl, true)
                },
            })
            this.hls.loadSource(playUrl)
            this.hls.attachMedia(this.audio)
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.audio.play().catch(() => {})
            })
        } else {
            this.audio.src = playUrl
        }

        try {
            if (!this.isHlsUrl(url) || !Hls.isSupported()) {
                await this.audio.play()
            }
            this.updateMediaSession(musicItem)
            // 记录播放历史
            musicHistoryManager.addHistory(musicItem)
        } catch (e) {
            console.error('Play failed:', e)
        }
    }

    /** 播放队列中的某个索引 */
    async playIndex(index: number) {
        const queue = this.store.get(playQueueAtom)
        if (index < 0 || index >= queue.length) return
        this.store.set(playQueueIndexAtom, index)
        await this.play(queue[index])
    }

    /** 恢复播放 */
    async resume() {
        try {
            await this.audio.play()
        } catch {}
    }

    /** 暂停 */
    pause() {
        this.audio.pause()
    }

    /** 播放/暂停切换 */
    async togglePlay() {
        if (this.audio.paused) {
            await this.resume()
        } else {
            this.pause()
        }
    }

    /** 跳转到指定时间 */
    seekTo(time: number) {
        this.audio.currentTime = time
    }

    /** 下一首 */
    async skipToNext() {
        const queue = this.store.get(playQueueAtom) as any[]
        if (queue.length === 0) return

        const currentIndex = this.store.get(playQueueIndexAtom) as number
        const repeatMode = this.store.get(repeatModeAtom) as string

        let nextIndex: number

        switch (repeatMode) {
            case RepeatMode.RepeatOne:
                nextIndex = currentIndex
                break
            case RepeatMode.Shuffle:
                nextIndex = Math.floor(Math.random() * queue.length)
                break
            case RepeatMode.Queue:
            default:
                nextIndex = (currentIndex + 1) % queue.length
                break
        }

        await this.playIndex(nextIndex)
    }

    /** 上一首 */
    async skipToPrevious() {
        const queue = this.store.get(playQueueAtom) as any[]
        if (queue.length === 0) return

        const currentIndex = this.store.get(playQueueIndexAtom) as number
        const repeatMode = this.store.get(repeatModeAtom) as string

        let prevIndex: number

        switch (repeatMode) {
            case RepeatMode.RepeatOne:
                prevIndex = currentIndex
                break
            case RepeatMode.Shuffle:
                prevIndex = Math.floor(Math.random() * queue.length)
                break
            case RepeatMode.Queue:
            default:
                prevIndex = (currentIndex - 1 + queue.length) % queue.length
                break
        }

        await this.playIndex(prevIndex)
    }

    /** 设置播放队列并开始播放 */
    async setQueueAndPlay(queue: any[], startIndex: number = 0) {
        this.store.set(playQueueAtom, queue)
        this.store.set(playQueueIndexAtom, startIndex)
        await this.play(queue[startIndex])
    }

    /** 添加到队列末尾 */
    addToQueue(musicItem: any) {
        const queue = [...this.store.get(playQueueAtom), musicItem]
        this.store.set(playQueueAtom, queue)
    }

    /** 设置播放模式 */
    setRepeatMode(mode: RepeatMode) {
        this.store.set(repeatModeAtom, mode)
    }

    /** 设置音量 (0-1) */
    setVolume(volume: number) {
        this.audio.volume = Math.max(0, Math.min(1, volume))
    }

    /** 获取当前音量 */
    getVolume() {
        return this.audio.volume
    }

    /** 销毁播放器 */
    destroy() {
        this.audio.pause()
        this.audio.src = ''
    }
}

const trackPlayer = new TrackPlayer()
export default trackPlayer
