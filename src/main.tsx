import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ensureDB } from './utils/db'
import pluginManager from './core/pluginManager'
import musicSheetManager from './core/musicSheet'
import musicHistoryManager from './core/musicHistory'
import VConsole from 'vconsole'
import './index.css'

// 开发环境或 URL 带 ?debug 时启用 vConsole
if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')) {
    new VConsole()
}

// 初始化所有核心模块
async function bootstrap() {
    try {
        // 确保数据库可用（处理 schema 不兼容情况）
        await ensureDB()

        await Promise.all([
            pluginManager.setup(),
            musicSheetManager.setup(),
            musicHistoryManager.setup(),
        ])
        console.log('All core modules initialized')
    } catch (e) {
        console.error('Core module init failed:', e)
    }
}
bootstrap()

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>,
)
