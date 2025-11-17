import { useState } from 'react'
import TeacherPage from './pages/TeacherPage'
import StudentPage from './pages/StudentPage'

export default function App() {
  const [mode, setMode] = useState('student')
  return (
    <div className="min-h-screen bg-gray-50">
      {mode === 'teacher' ? <TeacherPage setMode={setMode} /> : <StudentPage setMode={setMode} />}
    </div>
  )
}
