import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import SlackPage from './pages/SlackPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/slack" replace />} />
      <Route path="/slack" element={<SlackPage />} />
    </Routes>
  )
}

export default App
