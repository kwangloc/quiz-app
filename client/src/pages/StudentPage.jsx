import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import bgPhoto from '../assets/images/song-thu.jpg'
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  Input,
  LoadingState,
  Modal,
  ProgressBar,
  ScoreRing,
  SearchInput,
  Stepper,
  Toast,
  cx,
} from '../components/ui'

// Below this many entries a search box is more clutter than help
const SEARCH_THRESHOLD = 5

// Diacritic-insensitive matching so "dong luc" finds "Xí nghiệp Động Lực".
// đ has no combining form to strip, so it is mapped explicitly after NFD.
function normalizeVi(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
}

function matchesQuery(text, query) {
  const q = normalizeVi(query).trim()
  if (!q) return true
  // Every whitespace-separated term must appear, so word order does not matter
  return q.split(/\s+/).every((term) => normalizeVi(text).includes(term))
}

function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0))
  const hrs = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  const mm = String(mins).padStart(2, '0')
  const ss = String(secs).padStart(2, '0')
  return hrs > 0 ? `${String(hrs).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`
}

function formatMinSec(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0))
  return `${Math.floor(s / 60)} phút ${s % 60} giây`
}

// How many questions the candidate will actually face, once the per-attempt draw
// is taken into account
function effectiveQuestionCount(exam) {
  const bank = exam?.questionCount ?? 0
  const draw = exam?.numQuestions
  return draw && draw > 0 && draw < bank ? draw : bank
}

const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export default function StudentPage({ setMode }) {
  const [exams, setExams] = useState([])
  const [selectedExam, setSelectedExam] = useState(null)
  const [questions, setQuestions] = useState([])
  const [examQuestions, setExamQuestions] = useState(null)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [departments, setDepartments] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [loadingSetup, setLoadingSetup] = useState(true)
  const [loadingExams, setLoadingExams] = useState(false)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [setupError, setSetupError] = useState('')
  const [deptQuery, setDeptQuery] = useState('')
  const [examQuery, setExamQuery] = useState('')
  const [answers, setAnswers] = useState({})
  const [startTime, setStartTime] = useState(null)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [started, setStarted] = useState(false)
  const [resultInfo, setResultInfo] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    if (!notification) return
    const timer = setTimeout(() => setNotification(null), 4000)
    return () => clearTimeout(timer)
  }, [notification])

  function loadSetup() {
    setLoadingSetup(true)
    setSetupError('')
    fetch('http://localhost:3001/api/departments')
      .then((r) => r.json())
      .then((list) => {
        setDepartments(list)
        // No departments configured yet — fall back to offering every exam so the
        // app stays usable before an admin sets the list up.
        if (!list.length) {
          return fetch('http://localhost:3001/api/exams')
            .then((r) => r.json())
            .then(setExams)
        }
      })
      .catch(() => setSetupError('Không kết nối được máy chủ. Vui lòng kiểm tra và thử lại.'))
      .finally(() => setLoadingSetup(false))
  }

  useEffect(loadSetup, [])

  function selectDepartment(dept) {
    setSelectedDepartment(dept)
    setExams([])
    setExamQuery('')
    setLoadingExams(true)
    fetch(`http://localhost:3001/api/exams?departmentId=${dept.id}`)
      .then((r) => r.json())
      .then(setExams)
      .catch(() => setNotification({ type: 'error', message: 'Không tải được danh sách bài thi.' }))
      .finally(() => setLoadingExams(false))
  }

  function selectExam(exam) {
    setSelectedExam(exam)
    setLoadingQuestions(true)
    fetch(`http://localhost:3001/api/questions?examId=${exam.id}`)
      .then((r) => r.json())
      .then(setQuestions)
      .catch(() => setNotification({ type: 'error', message: 'Không tải được câu hỏi của bài thi.' }))
      .finally(() => setLoadingQuestions(false))
  }

  useEffect(() => {
    if (submitted || !startTime) return
    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((new Date() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime, submitted])

  // Auto-submit when time limit reached
  useEffect(() => {
    const timeLimitMinutes = selectedExam?.timeLimitMinutes
    const limit =
      timeLimitMinutes != null && !isNaN(timeLimitMinutes) ? timeLimitMinutes * 60 : null
    if (!startTime || submitted || isSubmitting || !limit || limit <= 0) return
    if (timeElapsed >= limit) {
      submit()
    }
  }, [timeElapsed, selectedExam, submitted, startTime, isSubmitting])

  function startExam() {
    if (!name.trim()) {
      setNameError('Vui lòng nhập họ và tên của bạn.')
      return
    }
    setNameError('')
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
    // Apply question limit if set
    const numQuestionsLimit = selectedExam?.numQuestions
    let questionsToUse = questions
    if (numQuestionsLimit && numQuestionsLimit > 0 && numQuestionsLimit < questions.length) {
      questionsToUse = shuffle(questions).slice(0, numQuestionsLimit)
    }
    const shuffled = shuffle(questionsToUse).map((q) => {
      const withIdx = (q.choices || []).map((t, idx) => ({ t, idx }))
      const sc = shuffle(withIdx)
      const newChoices = sc.map((c) => c.t)
      const newCorrect = sc.findIndex((c) => String(c.idx) === String(q.correct))
      return { ...q, choices: newChoices, correct: String(newCorrect) }
    })
    setExamQuestions(shuffled)
    setStarted(true)
    setStartTime(new Date())
  }

  function choose(qid, idx) {
    setAnswers((prev) => ({ ...prev, [qid]: idx }))
  }

  async function submit() {
    if (isSubmitting) return
    setIsSubmitting(true)
    const submitTime = new Date()
    let score = 0
    const activeQs = examQuestions || questions
    activeQs.forEach((q) => {
      if (answers[q.id] != null && String(answers[q.id]) === String(q.correct)) score++
    })
    try {
      const res = await fetch('http://localhost:3001/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: name,
          department: selectedDepartment?.name || null,
          examId: selectedExam?.id,
          answers,
          score,
          total: activeQs.length,
          startTime: startTime.toISOString(),
          submitTime: submitTime.toISOString(),
          timeSpent: timeElapsed,
        }),
      })
      if (!res.ok) {
        let detail = ''
        try {
          detail = await res.text()
        } catch {}
        throw new Error('Server responded with ' + res.status + (detail ? ' - ' + detail : ''))
      }
      setSubmitted(true)
      setResultInfo({
        name,
        department: selectedDepartment?.name || '',
        examTitle: selectedExam?.title || '',
        score,
        total: activeQs.length,
        timeSpent: timeElapsed,
      })
    } catch (e) {
      setNotification({
        type: 'error',
        message: 'Không nộp được bài. Kiểm tra kết nối máy chủ rồi thử lại.',
      })
      console.error('Submit failed:', e)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Back to the very start of the flow — the next candidate picks their own department
  function resetToStart() {
    setStarted(false)
    setName('')
    setNameError('')
    setSelectedExam(null)
    setSelectedDepartment(null)
    setDeptQuery('')
    setExamQuery('')
    setExamQuestions(null)
    setQuestions([])
    setAnswers({})
    setStartTime(null)
    setTimeElapsed(0)
    setSubmitted(false)
  }

  const hasDepartments = departments.length > 0
  const steps = hasDepartments ? ['Phòng ban', 'Bài thi', 'Họ tên'] : ['Bài thi', 'Họ tên']
  const stepOffset = hasDepartments ? 0 : 1

  function goToStep(index) {
    const target = index + stepOffset
    if (target <= 0) {
      setSelectedDepartment(null)
      setExams([])
      setSelectedExam(null)
      setExamQuery('')
    } else if (target === 1) {
      setSelectedExam(null)
      setQuestions([])
      setNameError('')
    }
  }

  /* ------------------------------------------------ Step 0 — loading/error */
  if (loadingSetup || setupError) {
    return (
      <CandidateShell>
        <Header currentMode="student" setMode={setMode} />
        <FlowCard>
          {setupError ? (
            <EmptyState
              icon={Icon.Alert}
              tone="danger"
              title="Không kết nối được máy chủ"
              description={setupError}
              action={
                <Button variant="primary" icon={Icon.Refresh} onClick={loadSetup}>
                  Thử lại
                </Button>
              }
            />
          ) : (
            <LoadingState label="Đang chuẩn bị kỳ thi..." />
          )}
        </FlowCard>
      </CandidateShell>
    )
  }

  /* -------------------------------------------------- Step 1 — department */
  if (hasDepartments && !selectedDepartment) {
    const filtered = departments.filter((d) => matchesQuery(d.name, deptQuery))
    return (
      <CandidateShell>
        <Header currentMode="student" setMode={setMode} />
        <FlowCard
          steps={steps}
          current={0}
          onStepClick={goToStep}
          title="Bạn thuộc phòng ban nào?"
          width="max-w-3xl"
        >
          {departments.length > SEARCH_THRESHOLD && (
            <div className="mb-4">
              <SearchInput
                autoFocus
                value={deptQuery}
                onChange={(e) => setDeptQuery(e.target.value)}
                onClear={() => setDeptQuery('')}
                onKeyDown={(e) => {
                  // One match left — Enter picks it without reaching for the mouse
                  if (e.key === 'Enter' && filtered.length === 1) selectDepartment(filtered[0])
                  if (e.key === 'Escape') setDeptQuery('')
                }}
                placeholder="Tìm phòng ban (không cần dấu)..."
              />
              {deptQuery.trim() !== '' && (
                <p className="mt-2 text-xs text-slate-500">
                  Tìm thấy <span className="font-semibold text-slate-700">{filtered.length}</span>/
                  {departments.length} phòng ban
                </p>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={Icon.Search}
              title="Không tìm thấy phòng ban phù hợp"
              description="Thử bỏ bớt từ khóa, hoặc xóa ô tìm kiếm để xem toàn bộ danh sách."
              action={
                <Button variant="secondary" onClick={() => setDeptQuery('')}>
                  Xóa tìm kiếm
                </Button>
              }
            />
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 max-h-[42vh] overflow-y-auto scroll-slim -mx-1 px-1 py-1">
              {filtered.map((dept) => (
                <PickerButton
                  key={dept.id}
                  icon={Icon.Building}
                  title={dept.name}
                  onClick={() => selectDepartment(dept)}
                />
              ))}
            </div>
          )}
        </FlowCard>
      </CandidateShell>
    )
  }

  /* -------------------------------------------------------- Step 2 — exam */
  if (!selectedExam) {
    const filtered = exams.filter((e) => matchesQuery(e.title, examQuery))
    return (
      <CandidateShell>
        <Header currentMode="student" setMode={setMode} />
        <FlowCard
          steps={steps}
          current={1 - stepOffset}
          onStepClick={goToStep}
          title="Chọn bài thi"
          context={selectedDepartment && [{ icon: Icon.Building, value: selectedDepartment.name }]}
          onBack={hasDepartments ? () => goToStep(0) : undefined}
          backLabel="Đổi phòng ban"
          width="max-w-2xl"
        >
          {loadingExams ? (
            <LoadingState label="Đang tải danh sách bài thi..." />
          ) : exams.length === 0 ? (
            <EmptyState
              icon={Icon.Doc}
              tone="warning"
              title="Chưa có bài thi nào"
              description={
                selectedDepartment
                  ? `Phòng ban "${selectedDepartment.name}" chưa được giao bài thi. Vui lòng liên hệ quản trị viên.`
                  : 'Chưa có bài thi nào được tạo. Vui lòng liên hệ quản trị viên.'
              }
              action={
                hasDepartments ? (
                  <Button variant="secondary" icon={Icon.ArrowLeft} onClick={() => goToStep(0)}>
                    Chọn phòng ban khác
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              {exams.length > SEARCH_THRESHOLD && (
                <div className="mb-4">
                  <SearchInput
                    autoFocus
                    value={examQuery}
                    onChange={(e) => setExamQuery(e.target.value)}
                    onClear={() => setExamQuery('')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && filtered.length === 1) selectExam(filtered[0])
                      if (e.key === 'Escape') setExamQuery('')
                    }}
                    placeholder="Tìm bài thi (không cần dấu)..."
                  />
                  {examQuery.trim() !== '' && (
                    <p className="mt-2 text-xs text-slate-500">
                      Tìm thấy <span className="font-semibold text-slate-700">{filtered.length}</span>
                      /{exams.length} bài thi
                    </p>
                  )}
                </div>
              )}

              {filtered.length === 0 ? (
                <EmptyState
                  icon={Icon.Search}
                  title="Không tìm thấy bài thi phù hợp"
                  description="Thử bỏ bớt từ khóa, hoặc xóa ô tìm kiếm để xem toàn bộ danh sách."
                  action={
                    <Button variant="secondary" onClick={() => setExamQuery('')}>
                      Xóa tìm kiếm
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-2.5 max-h-[42vh] overflow-y-auto scroll-slim -mx-1 px-1 py-1">
                  {filtered.map((exam) => (
                    <PickerButton
                      key={exam.id}
                      icon={Icon.Doc}
                      title={exam.title}
                      onClick={() => selectExam(exam)}
                      meta={
                        <>
                          <MetaItem icon={Icon.List}>{effectiveQuestionCount(exam)} câu hỏi</MetaItem>
                          <MetaItem icon={Icon.Clock}>
                            {exam.timeLimitMinutes > 0
                              ? `${exam.timeLimitMinutes} phút`
                              : 'Không giới hạn'}
                          </MetaItem>
                        </>
                      }
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </FlowCard>
      </CandidateShell>
    )
  }

  /* -------------------------------------------------------- Step 3 — name */
  if (!started) {
    const total = effectiveQuestionCount(selectedExam)
    const ready = !loadingQuestions && questions.length > 0
    return (
      <CandidateShell>
        <Header currentMode="student" setMode={setMode} />
        <FlowCard
          steps={steps}
          current={2 - stepOffset}
          onStepClick={goToStep}
          title="Xác nhận và bắt đầu"
          onBack={() => goToStep(1 - stepOffset)}
          backLabel="Đổi bài thi"
          width="max-w-xl"
        >
          {/* Recap of everything picked so far, so nothing is a surprise */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 mb-5">
            <p className="text-base font-semibold text-slate-900 leading-snug">
              {selectedExam.title}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedDepartment && (
                <Badge icon={Icon.Building}>{selectedDepartment.name}</Badge>
              )}
              <Badge icon={Icon.List} tone="accent">
                {total} câu hỏi
              </Badge>
              <Badge icon={Icon.Clock} tone={selectedExam.timeLimitMinutes > 0 ? 'warning' : 'neutral'}>
                {selectedExam.timeLimitMinutes > 0
                  ? `${selectedExam.timeLimitMinutes} phút`
                  : 'Không giới hạn thời gian'}
              </Badge>
              <Badge icon={Icon.CheckCircle} tone="success">
                Phải đạt từ {selectedExam.passingThreshold ?? 80}%
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5 mb-5">
            <label htmlFor="candidate-name" className="block text-sm font-medium text-slate-700">
              Họ và tên<span className="text-rose-500 ml-0.5">*</span>
            </label>
            <Input
              id="candidate-name"
              size="lg"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (nameError) setNameError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && ready && startExam()}
              placeholder="Ví dụ: Nguyễn Văn An"
              className={nameError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15' : ''}
            />
            {nameError ? (
              <p className="text-xs text-rose-600 flex items-center gap-1">
                <Icon.Alert className="w-3.5 h-3.5 shrink-0" />
                {nameError}
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Tên này sẽ hiển thị trên bảng kết quả, vui lòng nhập đầy đủ và chính xác.
              </p>
            )}
          </div>

          {!loadingQuestions && questions.length === 0 && (
            <Alert tone="danger" className="mb-5">
              Bài thi này chưa có câu hỏi nào. Vui lòng chọn bài thi khác hoặc liên hệ quản trị viên.
            </Alert>
          )}

          <Button
            variant="primary"
            size="xl"
            fullWidth
            icon={Icon.Play}
            loading={loadingQuestions}
            disabled={!ready}
            onClick={startExam}
          >
            {loadingQuestions ? 'Đang tải câu hỏi...' : 'Bắt đầu làm bài'}
          </Button>
        </FlowCard>
      </CandidateShell>
    )
  }

  /* ------------------------------------------------------------ The quiz */
  const activeQuestions = examQuestions || questions
  const answeredCount = activeQuestions.filter((q) => answers[q.id] !== undefined).length
  const unansweredCount = activeQuestions.length - answeredCount
  const limitSeconds =
    selectedExam?.timeLimitMinutes > 0 ? selectedExam.timeLimitMinutes * 60 : null
  const remaining = limitSeconds != null ? Math.max(limitSeconds - timeElapsed, 0) : null

  function gotoQuestion(id) {
    const el = document.getElementById('question-' + id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Header currentMode="student" setMode={setMode} isFixed locked />
      <Toast notification={notification} />

      {/* Exam bar — the single home for identity, progress and the clock */}
      <div className="fixed top-16 left-0 right-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 truncate leading-tight">
              {selectedExam.title}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {name}
              {selectedDepartment ? ` · ${selectedDepartment.name}` : ''}
            </p>
          </div>

          <div className="hidden md:block w-48 lg:w-64">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-500">Đã trả lời</span>
              <span className="font-semibold text-slate-700 tnum">
                {answeredCount}/{activeQuestions.length}
              </span>
            </div>
            <ProgressBar value={answeredCount} total={activeQuestions.length} />
          </div>

          <TimerChip remaining={remaining} elapsed={timeElapsed} />
        </div>
      </div>

      <div className="pt-32 pb-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          {/* Questions */}
          <div className="min-w-0 space-y-4">
            {/* Mobile tracker — the sidebar is hidden below lg */}
            <details className="lg:hidden group">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-card">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Icon.List className="w-4 h-4 text-slate-400" />
                  Danh sách câu hỏi
                </span>
                <span className="text-xs font-medium text-slate-500 tnum">
                  {answeredCount}/{activeQuestions.length} đã trả lời
                </span>
              </summary>
              <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <QuestionGrid questions={activeQuestions} answers={answers} onGoto={gotoQuestion} />
              </div>
            </details>

            <p className="px-1 text-sm text-slate-500">
              Mỗi câu chọn <strong className="font-semibold text-slate-700">1 phương án đúng</strong>.
              Bạn có thể quay lại sửa câu trả lời bất cứ lúc nào trước khi nộp bài.
            </p>

            {activeQuestions.map((q, idx) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={idx}
                selected={answers[q.id]}
                onChoose={choose}
              />
            ))}

            {/* Closing action card — the natural end of the scroll */}
            <Card className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-900">Hoàn tất bài thi</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {unansweredCount === 0
                      ? 'Bạn đã trả lời tất cả câu hỏi.'
                      : `Còn ${unansweredCount} câu chưa trả lời.`}
                  </p>
                </div>
                <div className="flex gap-2.5">
                  <Button variant="secondary" icon={Icon.Logout} onClick={() => setShowQuitConfirm(true)}>
                    Thoát
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    icon={Icon.Check}
                    onClick={() => setShowSubmitConfirm(true)}
                  >
                    Nộp bài
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar tracker */}
          <aside className="hidden lg:block">
            <div className="sticky top-36 space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-semibold text-slate-800">Tiến độ</p>
                  <span className="text-sm font-bold text-accent-700 tnum">
                    {answeredCount}/{activeQuestions.length}
                  </span>
                </div>
                <ProgressBar value={answeredCount} total={activeQuestions.length} />
                <p className="mt-2 text-xs text-slate-500">
                  {unansweredCount === 0
                    ? 'Đã trả lời tất cả câu hỏi.'
                    : `Còn ${unansweredCount} câu chưa trả lời.`}
                </p>

                <div className="my-4 h-px bg-slate-200" />

                <QuestionGrid questions={activeQuestions} answers={answers} onGoto={gotoQuestion} />

                <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-accent-600" />
                    Đã trả lời
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded border border-slate-300 bg-white" />
                    Chưa trả lời
                  </span>
                </div>
              </Card>

              <div className="space-y-2.5">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={Icon.Check}
                  onClick={() => setShowSubmitConfirm(true)}
                >
                  Nộp bài
                </Button>
                <Button variant="secondary" fullWidth icon={Icon.Logout} onClick={() => setShowQuitConfirm(true)}>
                  Thoát
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Submit confirmation */}
      <Modal
        open={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        size="sm"
        icon={Icon.Check}
        title="Nộp bài thi?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowSubmitConfirm(false)}>
              Xem lại bài
            </Button>
            <Button
              variant="primary"
              loading={isSubmitting}
              onClick={() => {
                setShowSubmitConfirm(false)
                submit()
              }}
            >
              Nộp bài
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Bạn đã trả lời{' '}
          <strong className="text-slate-900">
            {answeredCount}/{activeQuestions.length}
          </strong>{' '}
          câu hỏi. Sau khi nộp, bạn không thể sửa lại bài làm.
        </p>
        {unansweredCount > 0 && (
          <Alert tone="warning" className="mt-4">
            Còn <strong>{unansweredCount}</strong> câu chưa trả lời — những câu này sẽ được tính là
            sai.
          </Alert>
        )}
      </Modal>

      {/* Quit confirmation */}
      <Modal
        open={showQuitConfirm}
        onClose={() => setShowQuitConfirm(false)}
        size="sm"
        icon={Icon.Alert}
        title="Thoát khỏi bài thi?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowQuitConfirm(false)}>
              Tiếp tục làm bài
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setShowQuitConfirm(false)
                resetToStart()
              }}
            >
              Thoát, không lưu
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Toàn bộ bài làm hiện tại sẽ bị hủy và không được ghi nhận kết quả. Hành động này không thể
          hoàn tác.
        </p>
      </Modal>

      {/* Result */}
      <ResultModal
        info={resultInfo}
        passingThreshold={selectedExam?.passingThreshold}
        onClose={() => {
          setResultInfo(null)
          resetToStart()
        }}
      />
    </div>
  )
}

/* ========================================================================== */
/* Candidate flow chrome                                                      */
/* ========================================================================== */

/**
 * Full-bleed backdrop for the pre-exam steps. The workshop photo is pushed far
 * back behind a blur and a navy scrim so it reads as texture instead of noise.
 */
function CandidateShell({ children }) {
  return (
    <div className="relative min-h-screen flex flex-col bg-slate-900 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center scale-110 blur-xs opacity-200"
        style={{ backgroundImage: `url(${bgPhoto})` }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-brand-900/75 via-slate-900/65 to-accent-950/80"
        aria-hidden="true"
      />
      <div className="relative flex flex-col min-h-screen">{children}</div>
    </div>
  )
}

function FlowCard({
  steps,
  current,
  onStepClick,
  title,
  subtitle,
  context,
  onBack,
  backLabel,
  width = 'max-w-2xl',
  children,
}) {
  return (
    <>
      <main className="flex-1 flex items-center justify-center px-4 py-6 sm:py-10">
        <div className={cx('w-full animate-slide-up', width)}>
          <div className="bg-white rounded-3xl shadow-pop border border-white/20 overflow-hidden">
            {steps && (
              <div className="px-5 sm:px-8 py-4 border-b border-slate-200 bg-slate-50/80">
                <Stepper steps={steps} current={current} onStepClick={onStepClick} />
              </div>
            )}

            <div className="px-5 sm:px-8 py-6 sm:py-8">
              {title && (
                <div className="mb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    {title}
                  </h1>
                  {subtitle && <p className="mt-2 text-sm text-slate-500 leading-relaxed">{subtitle}</p>}
                  {context && context.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {context.map((c, i) => (
                        <Badge key={i} tone="accent" icon={c.icon}>
                          {c.value}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {children}

              {onBack && (
                <div className="mt-6 pt-5 border-t border-slate-200">
                  <Button variant="ghost" size="sm" icon={Icon.ArrowLeft} onClick={onBack}>
                    {backLabel || 'Quay lại'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="relative pb-5 text-center">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur-sm text-xs font-medium text-white/70">
          <span className="text-amber-300">✦</span>
          Designed by <span className="font-semibold text-white/90">Quốc Vinh</span>
        </span>
      </footer>
    </>
  )
}

/** One row in the department / exam pickers. */
function PickerButton({ icon: IconCmp, title, meta, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left flex items-center gap-3.5 rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 transition-all hover:border-accent-400 hover:bg-accent-50/60 hover:shadow-card active:scale-[0.995]"
    >
      <span className="grid place-items-center w-10 h-10 rounded-xl bg-slate-100 text-slate-500 shrink-0 transition-colors group-hover:bg-accent-100 group-hover:text-accent-700">
        <IconCmp className="w-5 h-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-800 leading-snug">{title}</span>
        {meta && <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">{meta}</span>}
      </span>
      <Icon.ArrowRight className="w-5 h-5 text-slate-300 shrink-0 transition-all group-hover:text-accent-600 group-hover:translate-x-0.5" />
    </button>
  )
}

function MetaItem({ icon: IconCmp, children }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <IconCmp className="w-3.5 h-3.5" />
      {children}
    </span>
  )
}

/* ========================================================================== */
/* Quiz pieces                                                                */
/* ========================================================================== */

function TimerChip({ remaining, elapsed }) {
  const counting = remaining != null
  // Colour ramps as the deadline approaches so running out is never a surprise
  const tone = !counting
    ? 'bg-slate-100 text-slate-700 border-slate-200'
    : remaining <= 60
      ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
      : remaining <= 300
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-accent-50 text-accent-700 border-accent-200'

  return (
    <div className={cx('flex items-center gap-2.5 rounded-xl border px-3 py-2 shrink-0', tone)}>
      <Icon.Clock className="w-5 h-5 shrink-0" />
      <div className="leading-none">
        <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">
          {counting ? 'Còn lại' : 'Đã làm'}
        </p>
        <p className="mt-1 text-lg sm:text-xl font-bold tnum">
          {formatClock(counting ? remaining : elapsed)}
        </p>
      </div>
    </div>
  )
}

function QuestionGrid({ questions, answers, onGoto }) {
  return (
    <div className="grid grid-cols-6 lg:grid-cols-5 gap-1.5">
      {questions.map((q, idx) => {
        const answered = answers[q.id] !== undefined
        return (
          <button
            key={q.id}
            onClick={() => onGoto(q.id)}
            title={answered ? `Câu ${idx + 1} — đã trả lời` : `Câu ${idx + 1} — chưa trả lời`}
            className={cx(
              'h-9 rounded-lg text-xs font-bold tnum border transition-colors',
              answered
                ? 'bg-accent-600 text-white border-accent-600 hover:bg-accent-700'
                : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
            )}
          >
            {idx + 1}
          </button>
        )
      })}
    </div>
  )
}

function QuestionCard({ question, index, selected, onChoose }) {
  const answered = selected !== undefined
  return (
    <article
      id={'question-' + question.id}
      className="scroll-mt-36 rounded-2xl border border-slate-200 bg-white shadow-card p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span
          className={cx(
            'grid place-items-center w-8 h-8 rounded-lg text-sm font-bold shrink-0 tnum transition-colors',
            answered ? 'bg-accent-600 text-white' : 'bg-slate-100 text-slate-500'
          )}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 pt-1">
          <h3 className="text-base font-semibold text-slate-900 leading-relaxed">{question.text}</h3>
        </div>
      </div>

      <div className="mt-4 space-y-2 sm:pl-11">
        {question.choices.map((choice, i) => {
          const isSelected = String(selected) === String(i)
          return (
            <label key={i} className="block cursor-pointer">
              <input
                type="radio"
                name={'q' + question.id}
                className="peer sr-only"
                checked={isSelected}
                onChange={() => onChoose(question.id, i)}
              />
              <div
                className={cx(
                  'flex items-start gap-3 rounded-xl border-2 px-3.5 py-3 transition-all',
                  'peer-focus-visible:ring-4 peer-focus-visible:ring-accent-500/30',
                  isSelected
                    ? 'border-accent-500 bg-accent-50'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <span
                  className={cx(
                    'grid place-items-center w-6 h-6 rounded-md text-xs font-bold shrink-0 transition-colors',
                    isSelected
                      ? 'bg-accent-600 text-white'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  )}
                >
                  {isSelected ? <Icon.Check className="w-4 h-4" /> : CHOICE_LETTERS[i] || i + 1}
                </span>
                <span
                  className={cx(
                    'text-sm leading-relaxed',
                    isSelected ? 'text-accent-900 font-medium' : 'text-slate-700'
                  )}
                >
                  {choice}
                </span>
              </div>
            </label>
          )
        })}
      </div>
    </article>
  )
}

function ResultModal({ info, onClose, passingThreshold }) {
  const percent = info && info.total > 0 ? Math.round((info.score / info.total) * 100) : 0
  const threshold =
    typeof passingThreshold === 'number' && passingThreshold >= 0 ? passingThreshold : 80
  const passed = percent >= threshold
  const verdict = useMemo(() => {
    if (percent === 100) return { label: 'Xuất sắc', note: 'Hoàn hảo! Bạn trả lời đúng tất cả câu hỏi.' }
    if (passed) return { label: 'Đạt', note: 'Rất tốt! Bạn đã nắm vững kiến thức.' }
    return { label: 'Chưa đạt', note: 'Hãy ôn tập lại và thử lại lần sau.' }
  }, [percent, passed])

  return (
    <Modal
      open={Boolean(info)}
      onClose={onClose}
      size="lg"
      hideClose
      closeOnBackdrop={false}
      footer={
        <Button variant="primary" size="lg" icon={Icon.ArrowRight} onClick={onClose}>
          Về màn hình chính
        </Button>
      }
    >
      {info && (
        <div className="text-center">
          <p className="text-sm font-medium text-slate-500">Kết quả bài làm</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">{info.examTitle}</h2>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
            <ScoreRing percent={percent} passed={passed} />

            <div className="text-left space-y-3 min-w-0">
              <div
                className={cx(
                  'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border font-bold',
                  passed
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                )}
              >
                {passed ? <Icon.CheckCircle className="w-5 h-5" /> : <Icon.Alert className="w-5 h-5" />}
                <span className="text-lg">{verdict.label}</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xs">{verdict.note}</p>
              <p className="text-xs text-slate-400">Ngưỡng đạt của bài thi: {threshold}%</p>
            </div>
          </div>

          <dl className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <Stat label="Họ tên" value={info.name || '—'} />
            <Stat label="Phòng ban" value={info.department || '—'} />
            <Stat
              label="Số câu đúng"
              value={
                <>
                  <span className="text-accent-700">{info.score}</span>
                  <span className="text-slate-400">/{info.total}</span>
                </>
              }
            />
            <Stat label="Thời gian làm" value={formatMinSec(info.timeSpent)} />
          </dl>
        </div>
      )}
    </Modal>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-slate-900 truncate" title={typeof value === 'string' ? value : undefined}>
        {value}
      </dd>
    </div>
  )
}
