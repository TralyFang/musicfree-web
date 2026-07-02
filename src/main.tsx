import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import pluginManager from './core/pluginManager'
import musicSheetManager from './core/musicSheet'
import musicHistoryManager from './core/musicHistory'
import './index.css'

// 初始化所有核心模块
async function bootstrap() {
    try {
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
