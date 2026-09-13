import { useEffect, useState } from 'react'
import TeacherPage from './pages/TeacherPage'
import StudentPage from './pages/StudentPage'

export default function App() {
  const [mode, setMode] = useState('student')

  // The accent token lives on <html> rather than a wrapper div so that modals
  // and toasts — which render through a portal into document.body — pick up the
  // same role tint as the page behind them.
  useEffect(() => {
    document.documentElement.dataset.role = mode === 'teacher' ? 'admin' : 'candidate'
  }, [mode])

  return mode === 'teacher' ? (
    <TeacherPage setMode={setMode} />
  ) : (
    <StudentPage setMode={setMode} />
  )
}
