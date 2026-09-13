import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import excelExample from '../assets/images/excel-format-example.png'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Field,
  FilePicker,
  Icon,
  Input,
  Modal,
  Select,
  Tabs,
  Toast,
  cx,
} from '../components/ui'

const API = 'http://localhost:3001/api'

const TABS = [
  { id: 'exams', label: 'Bài thi', icon: Icon.Doc },
  { id: 'questions', label: 'Câu hỏi', icon: Icon.List },
  { id: 'departments', label: 'Phòng ban', icon: Icon.Building },
  { id: 'results', label: 'Kết quả', icon: Icon.Chart },
]

const EMPTY_EXAM_FORM = {
  title: '',
  timeLimitMinutes: '0',
  passingThreshold: '80',
  numQuestions: '',
  departmentIds: [],
}

function formatDuration(seconds) {
  if (seconds == null) return '—'
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}p ${s % 60}s`
}

function formatTimeOfDay(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}

export default function TeacherPage({ setMode }) {
  const [exams, setExams] = useState([])
  const [selectedExamId, setSelectedExamId] = useState(null)
  const [examModalOpen, setExamModalOpen] = useState(false)
  const [editingExamId, setEditingExamId] = useState(null)
  const [examForm, setExamForm] = useState(EMPTY_EXAM_FORM)
  const [resultsExamFilter, setResultsExamFilter] = useState('')
  const [questions, setQuestions] = useState([])
  const [results, setResults] = useState([])
  const [departments, setDepartments] = useState([])
  const [newDepartment, setNewDepartment] = useState('')
  const [editingDeptId, setEditingDeptId] = useState(null)
  const [editDeptName, setEditDeptName] = useState('')
  const [activeTab, setActiveTab] = useState('exams')
  const [text, setText] = useState('')
  const [choices, setChoices] = useState(['', '', '', ''])
  const [correct, setCorrect] = useState('0')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editChoices, setEditChoices] = useState(['', ''])
  const [editCorrect, setEditCorrect] = useState('0')
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [notification, setNotification] = useState(null)
  const [confirmState, setConfirmState] = useState(null)
  const [answersModal, setAnswersModal] = useState(null)
  const [showExcelExample, setShowExcelExample] = useState(false)

  useEffect(() => {
    if (!notification) return
    const timer = setTimeout(() => setNotification(null), 3500)
    return () => clearTimeout(timer)
  }, [notification])

  function showNotification(message, type = 'success') {
    setNotification({ message, type })
  }

  /** Opens the shared confirm dialog instead of the OS confirm() box. */
  function confirmAction({ title, message, confirmLabel, tone = 'danger', onConfirm }) {
    setConfirmState({ title, message, confirmLabel, tone, onConfirm })
  }

  /* ------------------------------------------------------------- loading -- */
  async function loadExams() {
    try {
      const r = await fetch(`${API}/exams`)
      setExams(await r.json())
    } catch (e) {
      showNotification('Không tải được danh sách bài thi', 'error')
    }
  }

  async function loadQuestions(examId) {
    if (!examId) return setQuestions([])
    try {
      const r = await fetch(`${API}/questions?examId=${examId}`)
      setQuestions(await r.json())
    } catch (e) {
      showNotification('Không tải được câu hỏi', 'error')
    }
  }

  async function loadResults(examId) {
    try {
      const url = examId ? `${API}/results?examId=${examId}` : `${API}/results`
      const r = await fetch(url)
      setResults(await r.json())
    } catch (e) {
      showNotification('Không tải được kết quả', 'error')
    }
  }

  async function loadDepartments() {
    try {
      const r = await fetch(`${API}/departments`)
      setDepartments(await r.json())
    } catch (e) {
      showNotification('Không tải được danh sách phòng ban', 'error')
    }
  }

  useEffect(() => {
    loadExams()
    loadResults()
    loadDepartments()
  }, [])

  useEffect(() => {
    loadQuestions(selectedExamId)
  }, [selectedExamId])

  useEffect(() => {
    if (activeTab === 'results') loadResults(resultsExamFilter || null)
  }, [activeTab, resultsExamFilter])

  /* ----------------------------------------------------------- questions -- */
  function setChoice(i, val) {
    setChoices((prev) => prev.map((c, idx) => (idx === i ? val : c)))
  }

  async function addQuestion() {
    if (!selectedExamId) return showNotification('Vui lòng chọn bài thi trước', 'error')
    if (!text.trim()) return showNotification('Nội dung câu hỏi là bắt buộc', 'error')
    if (choices.filter((c) => c.trim()).length < 2)
      return showNotification('Cần ít nhất 2 phương án trả lời', 'error')
    await fetch(`${API}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, choices, correct, examId: selectedExamId }),
    })
    await loadQuestions(selectedExamId)
    await loadExams()
    setText('')
    setChoices(['', '', '', ''])
    setCorrect('0')
    showNotification('Đã thêm câu hỏi')
  }

  function startEdit(q) {
    setEditingId(q.id)
    setEditText(q.text)
    setEditChoices(q.choices)
    setEditCorrect(String(q.correct))
  }

  async function saveEdit() {
    if (!editText.trim()) return showNotification('Nội dung câu hỏi là bắt buộc', 'error')
    await fetch(`${API}/questions/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: editText, choices: editChoices, correct: editCorrect }),
    })
    await loadQuestions(selectedExamId)
    setEditingId(null)
    showNotification('Đã cập nhật câu hỏi')
  }

  function deleteQuestion(q, index) {
    confirmAction({
      title: 'Xóa câu hỏi?',
      message: `Câu ${index + 1}: "${q.text}" sẽ bị xóa vĩnh viễn khỏi ngân hàng câu hỏi.`,
      confirmLabel: 'Xóa câu hỏi',
      onConfirm: async () => {
        await fetch(`${API}/questions/${q.id}`, { method: 'DELETE' })
        await loadQuestions(selectedExamId)
        await loadExams()
        showNotification('Đã xóa câu hỏi')
      },
    })
  }

  function setEditChoice(i, val) {
    setEditChoices((prev) => prev.map((c, idx) => (idx === i ? val : c)))
  }

  function clearAllQuestions() {
    if (!selectedExamId) return
    confirmAction({
      title: 'Xóa toàn bộ câu hỏi?',
      message: `Tất cả ${questions.length} câu hỏi của bài thi này sẽ bị xóa. Hành động này không thể hoàn tác.`,
      confirmLabel: 'Xóa tất cả',
      onConfirm: async () => {
        try {
          await fetch(`${API}/questions/clear-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ examId: selectedExamId }),
          })
          await loadQuestions(selectedExamId)
          await loadExams()
          showNotification('Đã xóa tất cả câu hỏi')
        } catch (e) {
          showNotification('Lỗi khi xóa câu hỏi: ' + e.message, 'error')
        }
      },
    })
  }

  async function handleImportExcel() {
    if (!selectedExamId) return showNotification('Vui lòng chọn bài thi trước', 'error')
    if (!importFile) return showNotification('Vui lòng chọn file Excel', 'error')
    setImporting(true)
    setImportResult(null)

    const formData = new FormData()
    formData.append('file', importFile)
    formData.append('examId', selectedExamId)

    try {
      const res = await fetch(`${API}/questions/import`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setImportResult({ error: data.error || 'Nhập dữ liệu thất bại' })
      } else {
        setImportResult(data)
        setImportFile(null)
        await loadQuestions(selectedExamId)
        await loadExams()
      }
    } catch (e) {
      setImportResult({ error: `Lỗi kết nối: ${e.message}` })
    } finally {
      setImporting(false)
    }
  }

  /* --------------------------------------------------------------- exams -- */
  function openCreateExam() {
    setEditingExamId(null)
    setExamForm(EMPTY_EXAM_FORM)
    setExamModalOpen(true)
  }

  function openEditExam(exam) {
    setEditingExamId(exam.id)
    setExamForm({
      title: exam.title,
      timeLimitMinutes: String(exam.timeLimitMinutes ?? 0),
      passingThreshold: String(exam.passingThreshold ?? 80),
      numQuestions: exam.numQuestions != null ? String(exam.numQuestions) : '',
      departmentIds: exam.departmentIds || [],
    })
    setExamModalOpen(true)
  }

  function toggleExamDepartment(deptId) {
    setExamForm((f) => ({
      ...f,
      departmentIds: f.departmentIds.includes(deptId)
        ? f.departmentIds.filter((id) => id !== deptId)
        : [...f.departmentIds, deptId],
    }))
  }

  function setAllExamDepartments(all) {
    setExamForm((f) => ({ ...f, departmentIds: all ? departments.map((d) => d.id) : [] }))
  }

  async function saveExam() {
    if (!examForm.title.trim()) return showNotification('Tiêu đề bài thi là bắt buộc', 'error')
    const t = Number(examForm.timeLimitMinutes)
    if (isNaN(t) || t < 0)
      return showNotification('Thời gian làm bài phải là số phút không âm', 'error')
    const p = Number(examForm.passingThreshold)
    if (isNaN(p) || p < 0 || p > 100)
      return showNotification('Ngưỡng đạt phải từ 0 đến 100', 'error')
    let n = null
    if (examForm.numQuestions !== '') {
      n = Number(examForm.numQuestions)
      if (isNaN(n) || n < 1) return showNotification('Số câu hỏi phải là số dương', 'error')
    }
    const body = JSON.stringify({
      title: examForm.title.trim(),
      timeLimitMinutes: Math.floor(t),
      passingThreshold: Math.floor(p),
      numQuestions: n,
      departmentIds: examForm.departmentIds,
    })
    const url = editingExamId ? `${API}/exams/${editingExamId}` : `${API}/exams`
    const res = await fetch(url, {
      method: editingExamId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return showNotification(data.error || 'Không thể lưu bài thi', 'error')
    }
    setExamModalOpen(false)
    await loadExams()
    showNotification(editingExamId ? 'Đã cập nhật bài thi' : 'Đã tạo bài thi mới')
  }

  function deleteExam(exam) {
    confirmAction({
      title: 'Xóa bài thi?',
      message: `Bài thi "${exam.title}" và toàn bộ ${exam.questionCount ?? 0} câu hỏi của nó sẽ bị xóa. Kết quả đã lưu vẫn được giữ lại. Hành động này không thể hoàn tác.`,
      confirmLabel: 'Xóa bài thi',
      onConfirm: async () => {
        await fetch(`${API}/exams/${exam.id}`, { method: 'DELETE' })
        if (selectedExamId === exam.id) setSelectedExamId(null)
        await loadExams()
        showNotification('Đã xóa bài thi')
      },
    })
  }

  function manageExamQuestions(examId) {
    setSelectedExamId(examId)
    setActiveTab('questions')
  }

  /* --------------------------------------------------------- departments -- */
  async function addDepartment() {
    const name = newDepartment.trim()
    if (!name) return showNotification('Tên phòng ban là bắt buộc', 'error')
    const res = await fetch(`${API}/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return showNotification(data.error || 'Không thể thêm phòng ban', 'error')
    }
    setNewDepartment('')
    await loadDepartments()
    showNotification('Đã thêm phòng ban')
  }

  async function saveDepartment() {
    const name = editDeptName.trim()
    if (!name) return showNotification('Tên phòng ban là bắt buộc', 'error')
    const res = await fetch(`${API}/departments/${editingDeptId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return showNotification(data.error || 'Không thể cập nhật phòng ban', 'error')
    }
    setEditingDeptId(null)
    setEditDeptName('')
    await loadDepartments()
    // Exam rows embed department names, so they go stale on a rename
    await loadExams()
    showNotification('Đã cập nhật phòng ban')
  }

  function deleteDepartment(dept) {
    confirmAction({
      title: 'Xóa phòng ban?',
      message: `Phòng ban "${dept.name}" sẽ bị xóa và gỡ khỏi mọi bài thi đang giao cho nó. Kết quả thi đã lưu vẫn giữ nguyên tên phòng ban cũ.`,
      confirmLabel: 'Xóa phòng ban',
      onConfirm: async () => {
        await fetch(`${API}/departments/${dept.id}`, { method: 'DELETE' })
        if (editingDeptId === dept.id) setEditingDeptId(null)
        await loadDepartments()
        // Deleting a department drops its exam assignments server-side
        await loadExams()
        showNotification('Đã xóa phòng ban')
      },
    })
  }

  /* ------------------------------------------------------------- results -- */
  function deleteResult(result) {
    confirmAction({
      title: 'Xóa kết quả?',
      message: `Kết quả của "${result.studentName}" sẽ bị xóa vĩnh viễn.`,
      confirmLabel: 'Xóa kết quả',
      onConfirm: async () => {
        await fetch(`${API}/results/${result.id}`, { method: 'DELETE' })
        await loadResults(resultsExamFilter || null)
        showNotification('Đã xóa kết quả')
      },
    })
  }

  function exportResults() {
    const a = document.createElement('a')
    a.href = resultsExamFilter
      ? `${API}/results/export?examId=${resultsExamFilter}`
      : `${API}/results/export`
    a.click()
  }

  function clearAllResults() {
    const scope = resultsExamFilter ? 'kết quả của bài thi đang lọc' : 'TẤT CẢ kết quả'
    confirmAction({
      title: 'Xóa kết quả thi?',
      message: `Bạn sắp xóa ${scope} (${results.length} lượt). Nên xuất Excel trước khi xóa. Hành động này không thể hoàn tác.`,
      confirmLabel: 'Xóa kết quả',
      onConfirm: async () => {
        try {
          await fetch(`${API}/results/clear-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resultsExamFilter ? { examId: resultsExamFilter } : {}),
          })
          await loadResults(resultsExamFilter || null)
          showNotification('Đã xóa kết quả')
        } catch (e) {
          showNotification('Lỗi khi xóa kết quả: ' + e.message, 'error')
        }
      },
    })
  }

  const resultStats = useMemo(() => {
    if (!results.length) return null
    const percents = results.map((r) => (r.percent != null ? r.percent : 0))
    const avg = Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
    return {
      count: results.length,
      avg,
      best: Math.max(...percents),
      worst: Math.min(...percents),
    }
  }, [results])

  const selectedExam = exams.find((e) => e.id === selectedExamId) || null
  const tabsWithCounts = TABS.map((t) => ({
    ...t,
    count:
      t.id === 'exams'
        ? exams.length
        : t.id === 'departments'
          ? departments.length
          : t.id === 'results'
            ? results.length
            : selectedExamId
              ? questions.length
              : undefined,
  }))

  return (
    <div className="min-h-screen bg-slate-100">
      <Header currentMode="teacher" setMode={setMode} isFixed />
      <Toast notification={notification} />
      <ConfirmDialog state={confirmState} onCancel={() => setConfirmState(null)} />

      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Bảng điều khiển
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Quản lý bài thi, ngân hàng câu hỏi, phòng ban và kết quả của kỳ thi.
            </p>
          </div>

          <div className="mb-6">
            <Tabs tabs={tabsWithCounts} value={activeTab} onChange={setActiveTab} />
          </div>

          {activeTab === 'exams' && (
            <ExamsTab
              exams={exams}
              departments={departments}
              onCreate={openCreateExam}
              onEdit={openEditExam}
              onDelete={deleteExam}
              onManageQuestions={manageExamQuestions}
              onGoToDepartments={() => setActiveTab('departments')}
            />
          )}

          {activeTab === 'questions' && (
            <QuestionsTab
              exams={exams}
              selectedExam={selectedExam}
              selectedExamId={selectedExamId}
              setSelectedExamId={setSelectedExamId}
              questions={questions}
              onGoToExams={() => setActiveTab('exams')}
              text={text}
              setText={setText}
              choices={choices}
              setChoice={setChoice}
              setChoices={setChoices}
              correct={correct}
              setCorrect={setCorrect}
              onAddQuestion={addQuestion}
              importFile={importFile}
              setImportFile={setImportFile}
              importing={importing}
              importResult={importResult}
              onImport={handleImportExcel}
              onEditQuestion={startEdit}
              onDeleteQuestion={deleteQuestion}
              onClearAll={clearAllQuestions}
              onShowExcelExample={() => setShowExcelExample(true)}
            />
          )}

          {activeTab === 'departments' && (
            <DepartmentsTab
              departments={departments}
              newDepartment={newDepartment}
              setNewDepartment={setNewDepartment}
              onAdd={addDepartment}
              editingDeptId={editingDeptId}
              editDeptName={editDeptName}
              setEditDeptName={setEditDeptName}
              onStartEdit={(d) => {
                setEditingDeptId(d.id)
                setEditDeptName(d.name)
              }}
              onCancelEdit={() => setEditingDeptId(null)}
              onSave={saveDepartment}
              onDelete={deleteDepartment}
            />
          )}

          {activeTab === 'results' && (
            <ResultsTab
              results={results}
              exams={exams}
              stats={resultStats}
              filter={resultsExamFilter}
              setFilter={setResultsExamFilter}
              onRefresh={() => loadResults(resultsExamFilter || null)}
              onExport={exportResults}
              onClearAll={clearAllResults}
              onDelete={deleteResult}
              onViewAnswers={setAnswersModal}
            />
          )}
        </div>
      </div>

      {/* Create / edit exam */}
      <ExamFormModal
        open={examModalOpen}
        editing={Boolean(editingExamId)}
        form={examForm}
        setForm={setExamForm}
        departments={departments}
        onToggleDepartment={toggleExamDepartment}
        onSetAllDepartments={setAllExamDepartments}
        onClose={() => setExamModalOpen(false)}
        onSave={saveExam}
      />

      {/* Edit question */}
      <Modal
        open={editingId !== null}
        onClose={() => setEditingId(null)}
        size="lg"
        icon={Icon.Pencil}
        title="Sửa câu hỏi"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingId(null)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={saveEdit}>
              Lưu thay đổi
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Field label="Nội dung câu hỏi" required>
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Nhập nội dung câu hỏi"
            />
          </Field>

          <Field
            label="Các phương án trả lời"
            hint="Chọn nút tròn bên trái để đánh dấu phương án đúng."
          >
            <div className="space-y-2">
              {editChoices.map((c, i) => (
                <ChoiceRow
                  key={i}
                  index={i}
                  value={c}
                  checked={String(editCorrect) === String(i)}
                  onSelect={() => setEditCorrect(String(i))}
                  onChange={(v) => setEditChoice(i, v)}
                  onRemove={
                    editChoices.length > 2
                      ? () => {
                          setEditChoices((prev) => prev.filter((_, idx) => idx !== i))
                          if (Number(editCorrect) >= editChoices.length - 1)
                            setEditCorrect(String(Math.max(0, editChoices.length - 2)))
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          </Field>

          <Button
            variant="soft"
            size="sm"
            icon={Icon.Plus}
            onClick={() => setEditChoices((prev) => [...prev, ''])}
          >
            Thêm phương án
          </Button>
        </div>
      </Modal>

      {/* Full-size example sheet */}
      <Modal
        open={showExcelExample}
        onClose={() => setShowExcelExample(false)}
        size="xl"
        icon={Icon.Sheet}
        title="File Excel mẫu"
        description="Cột A = câu hỏi · Cột B–E = 4 phương án · Cột F = số thứ tự phương án đúng (1–4)."
        footer={
          <Button variant="primary" onClick={() => setShowExcelExample(false)}>
            Đã hiểu
          </Button>
        }
      >
        <img
          src={excelExample}
          alt="Ví dụ file Excel câu hỏi đúng định dạng"
          className="w-full rounded-xl border border-slate-200"
        />
        <p className="mt-3 text-xs text-slate-500 leading-relaxed">
          Không cần dòng tiêu đề. Mỗi dòng là một câu hỏi; dòng trống sẽ được bỏ qua khi nhập.
        </p>
      </Modal>

      {/* Raw answers for one attempt */}
      <Modal
        open={Boolean(answersModal)}
        onClose={() => setAnswersModal(null)}
        size="md"
        icon={Icon.List}
        title="Chi tiết bài làm"
        description={
          answersModal
            ? `${answersModal.studentName} · ${answersModal.examTitle || 'Không rõ bài thi'}`
            : undefined
        }
      >
        <AnswersDetail result={answersModal} />
      </Modal>
    </div>
  )
}

/* ========================================================================== */
/* Exams                                                                      */
/* ========================================================================== */

function ExamsTab({
  exams,
  departments,
  onCreate,
  onEdit,
  onDelete,
  onManageQuestions,
  onGoToDepartments,
}) {
  return (
    <div className="space-y-4">
      {departments.length === 0 && (
        <Alert
          tone="info"
          title="Chưa có phòng ban nào"
          action={
            <Button variant="secondary" size="sm" onClick={onGoToDepartments}>
              Thêm phòng ban
            </Button>
          }
        >
          Người thi chọn phòng ban trước khi chọn bài thi. Hãy tạo danh sách phòng ban trước.
        </Alert>
      )}

      <Card>
        <CardHeader
          icon={Icon.Doc}
          title={`Danh sách bài thi (${exams.length})`}
          actions={
            <Button variant="primary" icon={Icon.Plus} onClick={onCreate}>
              Tạo bài thi mới
            </Button>
          }
        />
        {exams.length === 0 ? (
          <EmptyState
            icon={Icon.Doc}
            title="Chưa có bài thi nào"
            description="Tạo bài thi đầu tiên, rồi thêm câu hỏi và giao cho các phòng ban."
            action={
              <Button variant="primary" icon={Icon.Plus} onClick={onCreate}>
                Tạo bài thi mới
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-200">
            {exams.map((exam) => (
              <li
                key={exam.id}
                className="flex flex-wrap items-start justify-between gap-4 px-5 sm:px-6 py-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-slate-900 leading-snug">
                    {exam.title}
                  </h3>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge icon={Icon.List}>{exam.questionCount ?? 0} câu hỏi</Badge>
                    <Badge icon={Icon.Clock}>
                      {exam.timeLimitMinutes > 0
                        ? `${exam.timeLimitMinutes} phút`
                        : 'Không giới hạn'}
                    </Badge>
                    <Badge icon={Icon.CheckCircle}>Phải đạt từ {exam.passingThreshold}%</Badge>
                    <Badge>
                      {exam.numQuestions
                        ? `Rút ${exam.numQuestions} câu/lượt`
                        : 'Dùng toàn bộ ngân hàng'}
                    </Badge>
                  </div>

                  <div className="mt-2.5">
                    <AssignedDepartments
                      names={exam.departmentNames || []}
                      totalDepartments={departments.length}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="soft"
                    size="sm"
                    icon={Icon.List}
                    onClick={() => onManageQuestions(exam.id)}
                  >
                    Câu hỏi
                  </Button>
                  <Button variant="secondary" size="sm" icon={Icon.Pencil} onClick={() => onEdit(exam)}>
                    Sửa
                  </Button>
                  <Button
                    variant="dangerGhost"
                    size="sm"
                    icon={Icon.Trash}
                    onClick={() => onDelete(exam)}
                    aria-label={`Xóa bài thi ${exam.title}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

/**
 * An exam assigned to every department produced five rows of chips, which buried
 * the row's real content. Collapse the common cases and let the admin expand.
 */
function AssignedDepartments({ names, totalDepartments }) {
  const [expanded, setExpanded] = useState(false)
  const VISIBLE = 4

  if (names.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
        <Icon.Alert className="w-4 h-4" />
        Chưa giao cho phòng ban nào — người thi sẽ không thấy bài thi này
      </span>
    )
  }

  if (totalDepartments > 0 && names.length === totalDepartments) {
    return (
      <Badge tone="accent" icon={Icon.Building}>
        Tất cả {totalDepartments} phòng ban
      </Badge>
    )
  }

  const shown = expanded ? names : names.slice(0, VISIBLE)
  const hidden = names.length - shown.length

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-slate-400">Giao cho:</span>
      {shown.map((n) => (
        <Badge key={n} tone="accent">
          {n}
        </Badge>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs font-medium text-accent-700 hover:text-accent-800 hover:underline"
        >
          +{hidden} phòng ban khác
        </button>
      )}
      {expanded && names.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
        >
          Thu gọn
        </button>
      )}
    </div>
  )
}

function ExamFormModal({
  open,
  editing,
  form,
  setForm,
  departments,
  onToggleDepartment,
  onSetAllDepartments,
  onClose,
  onSave,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      icon={editing ? Icon.Pencil : Icon.Plus}
      title={editing ? 'Sửa bài thi' : 'Tạo bài thi mới'}
      description="Thiết lập thời gian, ngưỡng đạt và phòng ban được giao."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" onClick={onSave}>
            {editing ? 'Lưu thay đổi' : 'Tạo bài thi'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Tiêu đề bài thi" required>
          <Input
            value={form.title}
            autoFocus
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Ví dụ: An toàn lao động 2026"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Thời gian làm bài (phút)" hint="Đặt 0 nếu không giới hạn thời gian">
            <Input
              type="number"
              min="0"
              value={form.timeLimitMinutes}
              onChange={(e) => setForm((f) => ({ ...f, timeLimitMinutes: e.target.value }))}
            />
          </Field>
          <Field label="Ngưỡng điểm đạt (%)" hint="Tỷ lệ đúng tối thiểu để được coi là Đạt">
            <Input
              type="number"
              min="0"
              max="100"
              value={form.passingThreshold}
              onChange={(e) => setForm((f) => ({ ...f, passingThreshold: e.target.value }))}
            />
          </Field>
        </div>

        <Field
          label="Số câu rút ngẫu nhiên mỗi lượt thi"
          hint="Để trống nếu muốn dùng toàn bộ ngân hàng câu hỏi mỗi lượt thi"
        >
          <Input
            type="number"
            min="1"
            value={form.numQuestions}
            onChange={(e) => setForm((f) => ({ ...f, numQuestions: e.target.value }))}
            placeholder="Để trống = dùng tất cả câu hỏi"
          />
        </Field>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-slate-700">
              Giao cho phòng ban
              <span className="ml-1.5 font-normal text-slate-400">
                ({form.departmentIds.length} đã chọn)
              </span>
            </label>
            {departments.length > 0 && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="xs" onClick={() => onSetAllDepartments(true)}>
                  Chọn tất cả
                </Button>
                <Button variant="ghost" size="xs" onClick={() => onSetAllDepartments(false)}>
                  Bỏ chọn
                </Button>
              </div>
            )}
          </div>

          {departments.length === 0 ? (
            <Alert tone="warning">
              Chưa có phòng ban nào. Hãy thêm ở tab "Phòng ban" trước khi giao bài thi.
            </Alert>
          ) : (
            <div className="rounded-xl border border-slate-300 max-h-52 overflow-y-auto scroll-slim p-1.5 space-y-0.5">
              {departments.map((dept) => {
                const checked = form.departmentIds.includes(dept.id)
                return (
                  <label
                    key={dept.id}
                    className={cx(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-sm transition-colors',
                      checked ? 'bg-accent-50 text-accent-900' : 'hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded"
                      checked={checked}
                      onChange={() => onToggleDepartment(dept.id)}
                    />
                    <span className="min-w-0 truncate">{dept.name}</span>
                  </label>
                )
              })}
            </div>
          )}

          {form.departmentIds.length === 0 && departments.length > 0 && (
            <p className="text-xs text-amber-700 flex items-center gap-1 pt-0.5">
              <Icon.Alert className="w-3.5 h-3.5 shrink-0" />
              Chưa chọn phòng ban nào — người thi sẽ không thấy bài thi này.
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}

/* ========================================================================== */
/* Questions                                                                  */
/* ========================================================================== */

function QuestionsTab({
  exams,
  selectedExam,
  selectedExamId,
  setSelectedExamId,
  questions,
  onGoToExams,
  text,
  setText,
  choices,
  setChoice,
  setChoices,
  correct,
  setCorrect,
  onAddQuestion,
  importFile,
  setImportFile,
  importing,
  importResult,
  onImport,
  onEditQuestion,
  onDeleteQuestion,
  onClearAll,
  onShowExcelExample,
}) {
  if (!selectedExamId) {
    return (
      <Card>
        <EmptyState
          icon={Icon.List}
          title="Chọn một bài thi để quản lý câu hỏi"
          description={
            exams.length === 0
              ? 'Chưa có bài thi nào. Hãy tạo bài thi trước, rồi quay lại đây để thêm câu hỏi.'
              : 'Mỗi bài thi có ngân hàng câu hỏi riêng. Chọn bài thi bạn muốn chỉnh sửa.'
          }
          action={
            exams.length === 0 ? (
              <Button variant="primary" icon={Icon.Plus} onClick={onGoToExams}>
                Đi tới danh sách bài thi
              </Button>
            ) : (
              <div className="w-64">
                <Select
                  value=""
                  onChange={(e) => setSelectedExamId(Number(e.target.value))}
                  aria-label="Chọn bài thi"
                >
                  <option value="" disabled>
                    Chọn bài thi...
                  </option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title}
                    </option>
                  ))}
                </Select>
              </div>
            )
          }
        />
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {/* Which exam am I editing? */}
      <Card className="px-5 sm:px-6 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-accent-50 text-accent-600">
              <Icon.Doc className="w-5 h-5" />
            </span>
            <div className="leading-tight">
              <p className="text-xs text-slate-500">Đang chỉnh sửa</p>
              <p className="text-sm font-semibold text-slate-900">Ngân hàng câu hỏi</p>
            </div>
          </div>
          <div className="min-w-56 flex-1 max-w-md">
            <Select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(Number(e.target.value))}
              aria-label="Bài thi đang chỉnh sửa"
            >
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                </option>
              ))}
            </Select>
          </div>
          {selectedExam && (
            <div className="flex flex-wrap gap-1.5">
              <Badge icon={Icon.List}>{questions.length} câu hỏi</Badge>
              {selectedExam.numQuestions > 0 && (
                <Badge tone="accent">Rút {selectedExam.numQuestions} câu/lượt</Badge>
              )}
            </div>
          )}
          <Button variant="ghost" size="sm" icon={Icon.ArrowLeft} onClick={onGoToExams}>
            Danh sách bài thi
          </Button>
        </div>
      </Card>

      {/* Two ways in: bulk import, or one at a time */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            icon={Icon.Sheet}
            title="Nhập từ Excel"
            description="Thêm nhiều câu hỏi cùng lúc từ file .xlsx"
          />
          <CardBody className="space-y-4">
            <Alert tone="info" title="Định dạng file">
              <span className="block mt-0.5">
                Cột <strong>A</strong> = câu hỏi · Cột <strong>B–E</strong> = 4 phương án · Cột{' '}
                <strong>F</strong> = số thứ tự phương án đúng (1–4)
              </span>
            </Alert>

            {/* A real sheet says more than the rule above — click to see it full size */}
            <div>
              <button
                type="button"
                onClick={onShowExcelExample}
                className="group block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition-colors hover:border-accent-400"
              >
                <img
                  src={excelExample}
                  alt="Ví dụ file Excel câu hỏi đúng định dạng"
                  className="w-full object-cover object-left-top max-h-44"
                />
                <span className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-500 transition-colors group-hover:text-accent-700">
                  <Icon.Search className="w-3.5 h-3.5" />
                  Xem file mẫu phóng to
                </span>
              </button>
            </div>

            <Field label="Chọn file Excel">
              <FilePicker file={importFile} onChange={setImportFile} accept=".xlsx,.xls" />
            </Field>

            <Button
              variant="primary"
              fullWidth
              icon={Icon.Upload}
              disabled={!importFile}
              loading={importing}
              onClick={onImport}
            >
              {importing ? 'Đang nhập dữ liệu...' : 'Nhập câu hỏi'}
            </Button>

            {importResult && (
              <ImportResultPanel result={importResult} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon={Icon.Pencil}
            title="Thêm thủ công"
            description="Tạo từng câu hỏi trực tiếp trên ứng dụng"
          />
          <CardBody className="space-y-4">
            <Field label="Nội dung câu hỏi" required>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onAddQuestion()}
                placeholder="Nhập nội dung câu hỏi..."
              />
            </Field>

            <Field
              label="Các phương án trả lời"
              hint="Chọn nút tròn bên trái để đánh dấu phương án đúng."
            >
              <div className="space-y-2">
                {choices.map((c, i) => (
                  <ChoiceRow
                    key={i}
                    index={i}
                    value={c}
                    checked={String(correct) === String(i)}
                    onSelect={() => setCorrect(String(i))}
                    onChange={(v) => setChoice(i, v)}
                    onRemove={
                      choices.length > 2
                        ? () => {
                            setChoices((prev) => prev.filter((_, idx) => idx !== i))
                            if (Number(correct) >= choices.length - 1)
                              setCorrect(String(Math.max(0, choices.length - 2)))
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            </Field>

            <div className="flex items-center justify-between gap-3 pt-1">
              <Button
                variant="ghost"
                size="sm"
                icon={Icon.Plus}
                onClick={() => setChoices((prev) => [...prev, ''])}
              >
                Thêm phương án
              </Button>
              <Button variant="primary" icon={Icon.Plus} onClick={onAddQuestion}>
                Thêm câu hỏi
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* The bank itself */}
      <Card>
        <CardHeader
          icon={Icon.List}
          title="Ngân hàng câu hỏi"
          description={`${questions.length} câu hỏi trong bài thi này`}
          actions={
            questions.length > 0 && (
              <Button variant="dangerGhost" size="sm" icon={Icon.Trash} onClick={onClearAll}>
                Xóa tất cả
              </Button>
            )
          }
        />
        {questions.length === 0 ? (
          <EmptyState
            icon={Icon.Inbox}
            title="Ngân hàng câu hỏi đang trống"
            description="Nhập từ Excel hoặc thêm thủ công ở phía trên để bắt đầu."
          />
        ) : (
          <ul className="divide-y divide-slate-200">
            {questions.map((q, idx) => (
              <li key={q.id} className="px-5 sm:px-6 py-4 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-start gap-4">
                  <span className="grid place-items-center w-7 h-7 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold shrink-0 tnum">
                    {idx + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 leading-relaxed">{q.text}</p>
                    <ul className="mt-2 space-y-1">
                      {q.choices.map((c, i) => {
                        const isCorrect = String(i) === String(q.correct)
                        return (
                          <li
                            key={i}
                            className={cx(
                              'flex items-start gap-2 text-sm',
                              isCorrect ? 'text-emerald-700 font-medium' : 'text-slate-500'
                            )}
                          >
                            <span
                              className={cx(
                                'grid place-items-center w-5 h-5 rounded text-[11px] font-bold shrink-0 mt-px',
                                isCorrect
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-400'
                              )}
                            >
                              {isCorrect ? <Icon.Check className="w-3.5 h-3.5" /> : i + 1}
                            </span>
                            <span className="leading-relaxed">{c}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Icon.Pencil}
                      onClick={() => onEditQuestion(q)}
                      aria-label={`Sửa câu ${idx + 1}`}
                    />
                    <Button
                      variant="dangerGhost"
                      size="sm"
                      icon={Icon.Trash}
                      onClick={() => onDeleteQuestion(q, idx)}
                      aria-label={`Xóa câu ${idx + 1}`}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

/** One editable answer choice: radio marks it correct, input holds the text. */
function ChoiceRow({ index, value, checked, onSelect, onChange, onRemove }) {
  return (
    <div
      className={cx(
        'flex items-center gap-2.5 rounded-xl border p-1.5 pl-3 transition-colors',
        checked ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'
      )}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onSelect}
        className="w-4 h-4 shrink-0 accent-emerald-600"
        aria-label={`Đánh dấu phương án ${index + 1} là đáp án đúng`}
      />
      <span className="text-xs font-bold text-slate-400 w-3 shrink-0">{index + 1}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Phương án ${index + 1}`}
        className="flex-1 min-w-0 h-9 px-2 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Xóa phương án ${index + 1}`}
          className="grid place-items-center w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
        >
          <Icon.Close className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function ImportResultPanel({ result }) {
  if (result.error) {
    return (
      <Alert tone="danger" title="Nhập dữ liệu thất bại">
        {result.error}
      </Alert>
    )
  }
  return (
    <Alert tone="success" title={`Đã nhập ${result.imported} câu hỏi`}>
      {result.skipped > 0 && <span className="block">Bỏ qua {result.skipped} dòng trống.</span>}
      {result.errors?.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer font-medium text-amber-800">
            {result.errors.length} dòng có lỗi — xem chi tiết
          </summary>
          <pre className="mt-2 p-2.5 max-h-40 overflow-auto scroll-slim bg-white rounded-lg border border-emerald-200 text-xs text-slate-600 whitespace-pre-wrap">
            {result.errors.map((err) => `Dòng ${err.row}: ${err.message}`).join('\n')}
          </pre>
        </details>
      )}
    </Alert>
  )
}

/* ========================================================================== */
/* Departments                                                                */
/* ========================================================================== */

function DepartmentsTab({
  departments,
  newDepartment,
  setNewDepartment,
  onAdd,
  editingDeptId,
  editDeptName,
  setEditDeptName,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}) {
  return (
    <Card>
      <CardHeader
        icon={Icon.Building}
        title="Phòng ban"
        description="Người thi chọn phòng ban từ danh sách này trước khi làm bài."
        actions={<Badge>{departments.length} phòng ban</Badge>}
      />
      <CardBody className="pb-0">
        <div className="flex gap-2.5">
          <Input
            className="flex-1"
            value={newDepartment}
            onChange={(e) => setNewDepartment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAdd()}
            placeholder="Nhập tên phòng ban mới..."
          />
          <Button variant="primary" icon={Icon.Plus} onClick={onAdd}>
            Thêm
          </Button>
        </div>
      </CardBody>

      {departments.length === 0 ? (
        <EmptyState
          icon={Icon.Building}
          title="Chưa có phòng ban nào"
          description="Thêm phòng ban đầu tiên bằng ô nhập ở trên."
        />
      ) : (
        <ul className="mt-5 divide-y divide-slate-200 border-t border-slate-200">
          {departments.map((dept, idx) => (
            <li key={dept.id} className="px-5 sm:px-6 py-3 hover:bg-slate-50/70 transition-colors">
              {editingDeptId === dept.id ? (
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-slate-400 w-6 shrink-0 tnum">{idx + 1}</span>
                  <Input
                    className="flex-1"
                    size="sm"
                    value={editDeptName}
                    autoFocus
                    onChange={(e) => setEditDeptName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSave()
                      if (e.key === 'Escape') onCancelEdit()
                    }}
                  />
                  <Button variant="primary" size="sm" icon={Icon.Check} onClick={onSave}>
                    Lưu
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onCancelEdit}>
                    Hủy
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-slate-400 w-6 shrink-0 tnum">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-slate-800 truncate">{dept.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Icon.Pencil}
                      onClick={() => onStartEdit(dept)}
                      aria-label={`Sửa ${dept.name}`}
                    />
                    <Button
                      variant="dangerGhost"
                      size="sm"
                      icon={Icon.Trash}
                      onClick={() => onDelete(dept)}
                      aria-label={`Xóa ${dept.name}`}
                    />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/* ========================================================================== */
/* Results                                                                    */
/* ========================================================================== */

function ResultsTab({
  results,
  exams,
  stats,
  filter,
  setFilter,
  onRefresh,
  onExport,
  onClearAll,
  onDelete,
  onViewAnswers,
}) {
  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard label="Tổng lượt thi" value={stats.count} icon={Icon.User} />
          <StatCard label="Tỷ lệ đúng trung bình" value={`${stats.avg}%`} icon={Icon.Chart} />
          <StatCard label="Cao nhất" value={`${stats.best}%`} icon={Icon.CheckCircle} tone="success" />
          <StatCard label="Thấp nhất" value={`${stats.worst}%`} icon={Icon.Alert} tone="warning" />
        </div>
      )}

      <Card>
        <CardHeader
          icon={Icon.Chart}
          title="Kết quả thi"
          description={`${results.length} lượt thi${filter ? ' (đang lọc theo bài thi)' : ''}`}
          actions={
            <>
              <div className="w-full sm:w-56">
                <Select value={filter} onChange={(e) => setFilter(e.target.value)} size="sm">
                  <option value="">Tất cả bài thi</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title}
                    </option>
                  ))}
                </Select>
              </div>
              <Button variant="secondary" size="sm" icon={Icon.Refresh} onClick={onRefresh}>
                Cập nhật
              </Button>
              <Button variant="primary" size="sm" icon={Icon.Download} onClick={onExport}>
                Xuất Excel
              </Button>
              {results.length > 0 && (
                <Button variant="dangerGhost" size="sm" icon={Icon.Trash} onClick={onClearAll}>
                  Xóa tất cả
                </Button>
              )}
            </>
          }
        />

        {results.length === 0 ? (
          <EmptyState
            icon={Icon.Inbox}
            title="Chưa có kết quả nào"
            description={
              filter
                ? 'Bài thi này chưa có lượt thi nào được ghi nhận.'
                : 'Kết quả sẽ xuất hiện ở đây ngay khi người thi nộp bài đầu tiên.'
            }
          />
        ) : (
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <Th className="text-left">Người thi</Th>
                  <Th className="text-left">Bài thi</Th>
                  <Th>Thời điểm</Th>
                  <Th>Thời gian làm</Th>
                  <Th>Kết quả</Th>
                  <Th>Chi tiết</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {results.map((result) => {
                  const percent = result.percent
                  const tone =
                    percent == null
                      ? 'neutral'
                      : percent >= 80
                        ? 'success'
                        : percent >= 50
                          ? 'warning'
                          : 'danger'
                  return (
                    <tr key={result.id} className="hover:bg-slate-50/70 transition-colors">
                      <Td className="text-left">
                        <p className="font-medium text-slate-900">{result.studentName}</p>
                        <p className="text-xs text-slate-500">{result.department || '—'}</p>
                      </Td>
                      <Td className="text-left text-slate-600 max-w-56">
                        <span className="block truncate" title={result.examTitle || ''}>
                          {result.examTitle || '—'}
                        </span>
                      </Td>
                      <Td className="text-slate-600 whitespace-nowrap">
                        <p>
                          {result.createdAt
                            ? new Date(result.createdAt).toLocaleDateString('vi-VN')
                            : '—'}
                        </p>
                        <p className="text-xs text-slate-400 tnum">
                          {formatTimeOfDay(result.startTime)} → {formatTimeOfDay(result.submitTime)}
                        </p>
                      </Td>
                      <Td className="text-slate-600 whitespace-nowrap tnum">
                        {formatDuration(result.timeSpent)}
                      </Td>
                      <Td className="whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-semibold text-slate-900 tnum">
                            {result.score}
                            <span className="text-slate-400">/{result.total ?? '—'}</span>
                          </span>
                          <Badge tone={tone}>{percent != null ? `${percent}%` : '—'}</Badge>
                        </div>
                      </Td>
                      <Td>
                        <Button variant="ghost" size="xs" onClick={() => onViewAnswers(result)}>
                          Xem
                        </Button>
                      </Td>
                      <Td>
                        <Button
                          variant="dangerGhost"
                          size="xs"
                          icon={Icon.Trash}
                          onClick={() => onDelete(result)}
                          aria-label={`Xóa kết quả của ${result.studentName}`}
                        />
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function Th({ className, children }) {
  return (
    <th
      className={cx(
        'px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap',
        className
      )}
    >
      {children}
    </th>
  )
}

function Td({ className, children }) {
  return <td className={cx('px-4 py-3 text-center align-middle', className)}>{children}</td>
}

function StatCard({ label, value, icon: IconCmp, tone = 'accent' }) {
  const tones = {
    accent: 'bg-accent-50 text-accent-600',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
  }
  return (
    <Card className="px-4 py-4 flex items-center gap-3.5">
      <span className={cx('grid place-items-center w-11 h-11 rounded-xl shrink-0', tones[tone])}>
        <IconCmp className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 truncate">{label}</p>
        <p className="text-xl font-bold text-slate-900 tnum">{value}</p>
      </div>
    </Card>
  )
}

function AnswersDetail({ result }) {
  if (!result) return null
  const entries = Object.entries(result.answers || {})
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">Lượt thi này không có câu trả lời nào được ghi nhận.</p>
  }
  return (
    <>
      <p className="text-xs text-slate-500 mb-3 leading-relaxed">
        Thứ tự phương án được xáo trộn riêng cho mỗi lượt thi, nên số phương án dưới đây chỉ phản ánh
        lựa chọn tại thời điểm làm bài.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {entries.map(([questionId, choiceIndex]) => (
          <div
            key={questionId}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            <span className="text-slate-500 truncate">Câu #{questionId}</span>
            <span className="font-semibold text-slate-900 tnum shrink-0">
              {Number(choiceIndex) + 1}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
