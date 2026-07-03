import { atom } from 'jotai';
import { RepeatMode } from '@/constants';

/** 当前播放歌曲 */
export const currentMusicAtom = atom<IMusic.IMusicItem | null>(null);

/** 播放状态 */
export const isPlayingAtom = atom(false);

/** 播放进度（秒） */
export const currentTimeAtom = atom(0);

/** 歌曲总时长（秒） */
export const durationAtom = atom(0);

/** 音量 0-1 */
export const volumeAtom = atom(0.8);

/** 播放模式 */
export const repeatModeAtom = atom<RepeatMode>(RepeatMode.Queue);

/** 播放队列 */
export const playQueueAtom = atom<IMusic.IMusicItem[]>([]);

/** 播放队列当前索引 */
export const playQueueIndexAtom = atom<number>(0);

/** 侧边栏是否展开（移动端） */
export const sidebarOpenAtom = atom(false);

/** 播放倍速 */
export const playbackRateAtom = atom(1);

/** 定时关闭（分钟，0表示未设置） */
export const sleepTimerAtom = atom(0);

/** 定时关闭倒计时剩余秒数 */
export const sleepTimerRemainingAtom = atom(0);
