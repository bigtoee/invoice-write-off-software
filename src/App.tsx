import { Routes, Route, Navigate } from 'react-router'
import Home from './pages/Home'
import Workbench from './pages/Workbench'
import Ledger from './pages/Ledger'
import Analytics from './pages/Analytics'
import Compliance from './pages/Compliance'
import Settings from './pages/Settings'
import Layout from './components/Layout'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<Layout />}>
        <Route path="/workbench" element={<Workbench />} />
        <Route path="/ledger" element={<Ledger />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
