import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Search from '@/pages/Search'
import Setting from '@/pages/Setting'
import Playlist from '@/pages/Playlist'

function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="search" element={<Search />} />
                <Route path="playlist/:id" element={<Playlist />} />
                <Route path="setting" element={<Setting />} />
            </Route>
        </Routes>
    )
}

export default App
