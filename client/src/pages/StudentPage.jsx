import { useEffect, useState, useRef } from 'react'
import Header from '../components/Header'
// Decorative SVG background for the result modal
const RESULT_BG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23d1fae5' offset='0'/%3E%3Cstop stop-color='%23a7f3d0' offset='1'/%3E%3C/linearGradient%3E%3Cpattern id='dots' x='0' y='0' width='24' height='24' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='2' cy='2' r='2' fill='%2300000030'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3Crect width='100%25' height='100%25' fill='url(%23dots)'/%3E%3C/svg%3E"
import logo from '../assets/images/bg.jpg'

export default function StudentPage({ setMode }){
  const [questions, setQuestions] = useState([])
  const [examQuestions, setExamQuestions] = useState(null)
  const [name, setName] = useState('')
  const [answers, setAnswers] = useState({})
  const [startTime, setStartTime] = useState(null)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [started, setStarted] = useState(false)
  const [resultInfo, setResultInfo] = useState(null)
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(null)
  const [passingThreshold, setPassingThreshold] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [examTitle, setExamTitle] = useState('Kiểm tra kiến thức')
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)

  useEffect(()=>{ 
    fetch('http://localhost:3001/api/questions').then(r=>r.json()).then(setQuestions)
    fetch('http://localhost:3001/api/settings/time-limit')
      .then(r=>r.json())
      .then(d=> setTimeLimitMinutes(d && d.minutes != null ? Number(d.minutes) : null))
      .catch(()=>{})
    fetch('http://localhost:3001/api/settings/passing-threshold')
      .then(r=>r.json())
      .then(d=> setPassingThreshold(d && d.percent != null ? Number(d.percent) : null))
      .catch(()=>{})
    fetch('http://localhost:3001/api/settings/exam-title')
      .then(r=>r.json())
      .then(d=> { if(d && d.title) setExamTitle(d.title) })
      .catch(()=>{})
  }, [])

  useEffect(() => {
    if (submitted || !startTime) return
    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((new Date() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime, submitted])

  // Auto-submit when time limit reached
  useEffect(() => {
    const limit = (timeLimitMinutes != null && !isNaN(timeLimitMinutes)) ? timeLimitMinutes * 60 : null
    if (!startTime || submitted || isSubmitting || !limit || limit <= 0) return
    if (timeElapsed >= limit) {
      submit()
    }
  }, [timeElapsed, timeLimitMinutes, submitted, startTime, isSubmitting])

  function startExam() {
    if (!name.trim()) return alert('Vui lòng nhập tên của bạn')
    // Ensure previous submission state is cleared for a fresh attempt
    setSubmitted(false)
    // Shuffle questions and choices per attempt
    const shuffle = (arr) => {
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }
    const shuffled = shuffle(questions).map(q => {
      const withIdx = (q.choices || []).map((t, idx) => ({ t, idx }))
      const sc = shuffle(withIdx)
      const newChoices = sc.map(c => c.t)
      const newCorrect = sc.findIndex(c => String(c.idx) === String(q.correct))
      return { ...q, choices: newChoices, correct: String(newCorrect) }
    })
    setExamQuestions(shuffled)
    setStarted(true)
    setStartTime(new Date())
  }

  function choose(qid, idx){
    setAnswers(prev => ({...prev, [qid]: idx}))
  }

  function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  async function submit(){
    if (isSubmitting) return
    setIsSubmitting(true)
    const submitTime = new Date()
    let score = 0
    const activeQs = examQuestions || questions
    activeQs.forEach(q => {
      if(answers[q.id] != null && String(answers[q.id]) === String(q.correct)) score++
    })
    try {
      const res = await fetch('http://localhost:3001/api/results', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ 
          studentName: name, 
          answers, 
          score,
          total: activeQs.length,
          startTime: startTime.toISOString(),
          submitTime: submitTime.toISOString(),
          timeSpent: timeElapsed
        })
      })
      if (!res.ok) {
        let detail = ''
        try { const t = await res.text(); detail = t } catch {}
        throw new Error('Server responded with '+res.status+(detail?(' - '+detail):''))
      }
      setSubmitted(true)
      setResultInfo({
        name,
        score,
        total: (examQuestions || questions).length,
        timeSpent: timeElapsed,
      })
    } catch (e) {
      alert('Không thể nộp bài. Vui lòng kiểm tra kết nối máy chủ. Lỗi: '+e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleQuit() {
    setStarted(false)
    setName('')
    setAnswers({})
    setStartTime(null)
    setTimeElapsed(0)
    setSubmitted(false)
    setShowQuitConfirm(false)
  }

{/* <div className="absolute inset-0 bg-center bg-cover bg-no-repeat blur-sm" style={{ backgroundImage: `url(${logo})`, backgroundColor: '#f0fdf4' }} > */}

  // Show start screen if not started
  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800">
        <Header currentMode="student" setMode={setMode} isFixed={false} />

          <div className="mt-1 flex items-center justify-center p-4 min-h-[calc(100vh-80px)] bg-center bg-cover" style={{ backgroundImage: `url(${logo})`, backgroundColor: '#f0fdf4' }}>
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
              <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">{examTitle}</h2>
            
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Nhập tên của bạn:</label>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && startExam()}
                placeholder="Nhập họ tên"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
              />
            </div>

            <button
              onClick={startExam}
              className="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
            >
              Bắt đầu làm bài
            </button>
          </div>
          </div>
      </div>
    )
  }


  // Show quiz questions after started
  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentMode="student" setMode={setMode} isFixed={true} />

      <div className="pt-20 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-6">
            {/* Sidebar Tracker now includes timer */}
            <QuestionTracker 
              sidebar 
              studentName={name}
              questions={examQuestions || questions} 
              answers={answers} 
              timeElapsed={timeElapsed}
              timeLimitMinutes={timeLimitMinutes}
              formatTime={formatTime}
              goto={(id) => {
              const el = document.getElementById('question-'+id)
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }} 
            />
            <div className="flex-1">
              {resultInfo && (
                <ResultModal 
                  info={resultInfo} 
                  onClose={() => {
                    setResultInfo(null)
                    setStarted(false)
                    setName('')
                    setAnswers({})
                    setExamQuestions(null)
                    setStartTime(null)
                    setTimeElapsed(0)
                    setSubmitted(false)
                  }}
                  formatTime={formatTime}
                  passingThreshold={passingThreshold}
                />
              )}
              {/* <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-lg shadow">
                <div>
                  <h2 className="text-xl font-semibold">Chào mừng, {name}</h2>
                  <p className="text-sm text-gray-600">Trả lời tất cả các câu hỏi và nộp bài khi hoàn thành</p>
                  {timeLimitMinutes != null && Number(timeLimitMinutes) > 0 && (
                    <div className="mt-1 text-xs text-gray-500">Giới hạn thời gian: {timeLimitMinutes} phút</div>
                  )}
                  {passingThreshold != null && Number(passingThreshold) >= 0 && (
                    <div className="mt-1 text-xs text-gray-500">Ngưỡng đạt: {passingThreshold}%</div>
                  )}
                </div>
              </div> */}

              <div className="space-y-4">
                {(examQuestions || questions).map((q, idx)=>(
              <div key={q.id} id={'question-'+q.id} className="p-4 border rounded-lg bg-white shadow scroll-mt-24">
                <div className="font-medium mb-3 text-gray-800">
                  <span className="inline-block mr-2 px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-sm">Câu {idx + 1}</span>
                  {q.text}
                </div>
                <div className="space-y-2">
                  <span><i>(Chọn 1 phương án đúng)</i></span>
                  {q.choices.map((c,i)=>(
                    <label key={i} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                      <input 
                        type="radio" 
                        name={'q'+q.id} 
                        checked={String(answers[q.id])===String(i)} 
                        onChange={()=>choose(q.id, i)} 
                        className="w-4 h-4"
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
              <div className="mt-6 flex gap-3">
            <button 
              className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition" 
              onClick={() => setShowSubmitConfirm(true)}
            >
              Nộp bài
            </button>
            <button 
              className="px-4 py-3 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition" 
              onClick={() => setShowQuitConfirm(true)}
            >
              Thoát
            </button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Confirmation Modal */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Xác nhận nộp bài</h3>
              <p className="text-gray-600 mb-6">Bạn có chắc chắn muốn nộp bài thi không?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Hủy
                </button>
                <button 
                  onClick={() => {
                    setShowSubmitConfirm(false)
                    submit()
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Nộp bài
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quit Confirmation Modal */}
        {showQuitConfirm && (
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Xác nhận thoát</h3>
              <p className="text-gray-600 mb-6">Bạn có chắc chắn muốn thoát và hủy bài làm hiện tại không?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowQuitConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleQuit}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Thoát
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Tracker component shows answered/unanswered status and allows jumping
function QuestionTracker({ questions, answers, goto, sidebar, timeElapsed, timeLimitMinutes, formatTime, studentName }) {
  if (!questions.length) return null
  const unanswered = questions.filter(q => answers[q.id] === undefined).length
  const baseClasses = sidebar
    ? 'sticky top-20 z-30 w-80 bg-white rounded-lg shadow p-3 border border-gray-200 h-fit'
    : 'mb-6 bg-white rounded-lg shadow p-4 sticky top-20 z-30 border border-gray-200'
  return (
    <div className={baseClasses}>
      <div className="mb-3">
        {sidebar && studentName && <div className="text-xl font-bold mb-2">Xin chào, <span className="text-emerald-700">{studentName}</span></div>}
        {/* <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-xl">Danh sách câu hỏi</h3>
        </div> */}
        {timeLimitMinutes != null && Number(timeLimitMinutes) > 0 && (
          <div className="mt-1 text-base text-gray-600">Giới hạn thời gian: {timeLimitMinutes} phút</div>
        )}
        {sidebar && <div className="mt-1 text-base text-gray-600">Tổng số câu: {questions.length}</div>}
        <div className="mt-1 text-base text-gray-600">Chưa làm: {unanswered}</div>

        {/* Timer moved here */}
        <div className="mt-2 p-2 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-between">
          {(timeLimitMinutes != null && Number(timeLimitMinutes) > 0) ? (
            <>
              <span className="text-base text-gray-600">Còn lại:</span>
              <span className="text-4xl font-mono font-semibold text-red-600">{formatTime(Math.max(timeLimitMinutes * 60 - timeElapsed, 0))}</span>
            </>
          ) : (
            <>
              <span className="text-xs text-gray-600">Đã trôi qua</span>
              <span className="text-lg font-mono font-semibold text-green-600">{formatTime(timeElapsed)}</span>
            </>
          )}
        </div>
      </div>
      <div className={sidebar ? 'grid grid-cols-4 gap-2' : 'grid grid-cols-8 sm:grid-cols-10 gap-2'}>
        {questions.map((q, idx) => {
          const answered = answers[q.id] !== undefined
          return (
            <button
              key={q.id}
              onClick={() => goto(q.id)}
              className={`h-7 text-xs rounded-md font-medium transition-colors border flex items-center justify-center
                ${answered ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' : 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200'}`}
              title={answered ? 'Đã chọn đáp án' : 'Chưa trả lời'}
            >
              {idx + 1}
            </button>
          )
        })}
      </div>
      
    </div>
  )
}



function ResultModal({ info, onClose, formatTime, passingThreshold }) {
  const percent = Math.round((info.score / info.total) * 100)
  const threshold = typeof passingThreshold === 'number' && passingThreshold >= 0 ? passingThreshold : 80
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl mx-4">
        <div className="relative overflow-hidden rounded-xl shadow-2xl min-h-[450px] flex flex-col bg-white border-3 border-gray-700">
          <div className="absolute inset-0 bg-center bg-cover bg-no-repeat blur-xs" style={{ backgroundImage: `url(${logo})`, backgroundColor: '#f0fdf4' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-white/70 opacity-10" />
          <div className="relative p-8 sm:p-10 grow flex flex-col">
            <div className="relative flex items-center justify-center mb-4">
              <h3 className="text-4xl font-extrabold text-center ">Kết quả bài làm</h3>
              <button onClick={onClose} className="absolute right-0 p-2 rounded-full hover:bg-white/70" aria-label="Đóng">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="col-span-2 rounded-xl p-4 border border-emerald-100 shadow bg-gradient-to-br from-white/80 to-white/60">
                <p className="text-xl font-bold text-gray-900">Họ tên: <span className="font-bold text-emerald-700">{info.name || '—'}</span></p>
                <div className="text-xl font-bold text-gray-900">Điểm: <span className="font-bold text-emerald-700">{info.score}<span className="text-gray-900">/{info.total}</span></span></div>
                {/* <div className="mt-1 text-3xl font-extrabold text-emerald-700">{info.score}<span className="text-gray-900">/{info.total}</span></div> */}
                <div className="text-xl font-bold text-gray-900">Tỷ lệ đúng: <span className="font-bold text-emerald-700">{percent}%</span></div>
                <div className="text-xl text-gray-900">(Ngưỡng yêu cầu: {threshold}%)</div>
                {/* <p className="text-gray-800">Ngưỡng yêu cầu: {threshold}%</p> */}
              </div>
              <div className="rounded-xl p-4 border border-emerald-100 shadow bg-gradient-to-br from-white/80 to-white/60">
                <div className="text-xl font-bold text-gray-900">Thời gian làm</div>
                <div className="mt-1 text-3xl font-extrabold text-emerald-700 font-mono">{formatTime(info.timeSpent)}</div>
              </div>
            </div>
            <div className="rounded-xl p-4 border border-emerald-100 shadow bg-gradient-to-br from-white/80 to-white/60">
              <h4 className="text-xl font-bold text-gray-900 mb-2">Nhận xét:</h4>
              <p className="text-gray-800 text-center">
                {percent === 100 && <><span className="text-4xl font-bold text-emerald-700">Xuất sắc</span> <br /> Hoàn hảo! Bạn trả lời đúng tất cả câu hỏi.</>}
                {percent >= threshold && percent < 100 && <><span className="text-4xl font-bold text-emerald-700">Đạt</span> <br /> Rất tốt! Bạn đã nắm vững kiến thức.</>}
                {percent < threshold && <><span className="text-4xl font-bold text-red-500">Chưa đạt</span> <br /> Hãy ôn tập lại và thử lại!</>}
              </p>
            </div>
            <div className="mt-auto pt-4 flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-white/70">Về màn hình chính</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
