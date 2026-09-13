import { useState } from 'react'
import logo from '../assets/images/logo.png'
import { Button, Field, Icon, Input, Modal, cx } from './ui'

const TEACHER_PIN = '1317'

/**
 * The one bar both flows share. It stays corporate navy in either role — the
 * role is signalled by the switch on the right and by the accent tint the page
 * body picks up — so moving between Người thi and Admin never feels like
 * landing in a different app.
 */
export default function Header({ currentMode, setMode, isFixed = false, locked = false }) {
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')

  const isTeacher = currentMode === 'teacher'

  function handleTeacherClick() {
    if (isTeacher) return
    setShowPinModal(true)
  }

  function verifyPin() {
    if (pinInput === TEACHER_PIN) {
      setMode('teacher')
      closePinModal()
    } else {
      setPinError('Mã PIN không đúng. Vui lòng thử lại.')
      setPinInput('')
    }
  }

  function closePinModal() {
    setShowPinModal(false)
    setPinInput('')
    setPinError('')
  }

  return (
    <>
      <header
        className={cx(
          'bg-gradient-to-r from-brand-900 via-brand-800 to-brand-900 text-white shadow-lg',
          isFixed && 'fixed top-0 left-0 right-0 z-40'
        )}
      >
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 flex items-center gap-4">
          {/* Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logo}
              alt="Tổng Công ty Sông Thu"
              className="w-10 h-10 rounded-full bg-white/95 p-0.5 shrink-0"
            />
            <div className="min-w-0 leading-tight">
              <p className="text-sm sm:text-base font-bold truncate">Tổng Công ty Sông Thu</p>
            </div>
          </div>

          {/* Programme name — the least important element, so it drops out first */}
          <p className="hidden xl:block flex-1 text-center text-sm font-medium text-blue-100/80 truncate px-4">
            Trắc nghiệm kiểm tra kiến thức dành cho cán bộ công nhân viên
          </p>

          {/* Role switch */}
          <div className="ml-auto xl:ml-0 flex items-center gap-2 shrink-0">
            {locked ? (
              <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-white/10 border border-white/20 text-xs sm:text-sm font-semibold text-blue-50">
                <Icon.Clock className="w-4 h-4" />
                Đang làm bài
              </span>
            ) : (
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/10 border border-white/15">
                <RoleButton
                  active={!isTeacher}
                  icon={Icon.User}
                  label="Người thi"
                  onClick={() => setMode('student')}
                />
                <RoleButton
                  active={isTeacher}
                  icon={Icon.Lock}
                  label="Admin"
                  onClick={handleTeacherClick}
                />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* PIN gate for the admin dashboard */}
      <Modal
        open={showPinModal}
        onClose={closePinModal}
        size="sm"
        icon={Icon.Lock}
        title="Đăng nhập quản trị"
        description="Nhập mã PIN để mở bảng điều khiển."
        footer={
          <>
            <Button variant="secondary" onClick={closePinModal}>
              Hủy
            </Button>
            <Button variant="primary" onClick={verifyPin} disabled={!pinInput}>
              Xác nhận
            </Button>
          </>
        }
      >
        <Field error={pinError}>
          <Input
            type="password"
            inputMode="numeric"
            maxLength={6}
            size="lg"
            value={pinInput}
            autoFocus
            onChange={(e) => {
              setPinInput(e.target.value)
              setPinError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && verifyPin()}
            placeholder="••••"
            className="text-center text-2xl tracking-[0.4em] font-semibold"
          />
        </Field>
      </Modal>
    </>
  )
}

function RoleButton({ active, icon: IconCmp, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors',
        active ? 'bg-white text-brand-800 shadow-sm' : 'text-blue-100 hover:bg-white/10'
      )}
    >
      <IconCmp className="w-4 h-4" />
      {label}
    </button>
  )
}
