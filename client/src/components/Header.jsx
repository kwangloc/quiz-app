import { useState } from 'react'
import logo from '../assets/images/logo.png'

const TEACHER_PIN = '1317'

export default function Header({ currentMode, setMode, isFixed = false }) {
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')

  const isTeacher = currentMode === 'teacher'
  const bgGradient = isTeacher ? 'from-blue-600 to-blue-800' : 'from-green-600 to-green-800'

  function handleTeacherClick() {
    if (isTeacher) {
      setMode('teacher')
    } else {
      setShowPinModal(true)
    }
  }

  function verifyPin() {
    if (pinInput === TEACHER_PIN) {
      setMode('teacher')
      setShowPinModal(false)
      setPinInput('')
      setPinError('')
    } else {
      setPinError('Incorrect PIN')
      setPinInput('')
    }
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter') {
      verifyPin()
    }
  }

  function closePinModal() {
    setShowPinModal(false)
    setPinInput('')
    setPinError('')
  }

  const headerClasses = isFixed
    ? 'fixed top-0 left-0 right-0 z-40'
    : ''

  return (
    <>
      <div className={`bg-gradient-to-r ${bgGradient} text-white p-3 shadow-lg ${headerClasses}`}>
        <div className="max-w-6xl mx-auto flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <img src={logo} alt="Quiz Master Logo" className="w-10 h-10" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold">Xí nghiệp động lực</h1>
              <p className={`${isTeacher ? 'text-blue-100' : 'text-green-100'} text-xs`}>Tổng Công ty Sông Thu</p>
            </div>
          </div>
          <div className="flex gap-2 text-white font-bold">
            Trắc nghiệm kiểm tra kiến thức dành cho cán bộ công nhân viên
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('student')}
              className={`px-4 py-2 ${currentMode === 'student' ? 'bg-white text-green-600' : 'border-2 border-white text-white'} font-semibold rounded-lg hover:bg-opacity-90 transition`}
            >
              Người thi
            </button>
            <button
              onClick={handleTeacherClick}
              className={`px-4 py-2 ${currentMode === 'teacher' ? 'bg-white text-blue-600' : 'border-2 border-white text-white'} font-semibold rounded-lg hover:bg-opacity-90 transition`}
            >
              Admin
            </button>
          </div>
        </div>
      </div>

      {/* PIN Verification Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-300 rounded-lg shadow-2xl p-8 w-full max-w-sm">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Đăng nhập Admin</h2>
            <p className="text-center text-gray-600 mb-6">Nhập mã PIN để truy cập bảng điều khiển</p>
            
            <div className="mb-6">
              <input
                type="password"
                maxLength="6"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder=""
                autoFocus
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:outline-none focus:border-blue-600"
              />
              <p className="text-gray-500 text-sm mt-2 text-center">{pinInput.length > 0 ? `${pinInput.length} digit${pinInput.length > 1 ? 's' : ''}` : 'Nhập mã PIN'}</p>
              {pinError && <p className="text-red-600 text-sm mt-2 text-center font-semibold">{pinError}</p>}
            </div>

            <div className="flex gap-3">
              <button
                onClick={closePinModal}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
              >
                Hủy
              </button>
              <button
                onClick={verifyPin}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
