import { useEffect, useState } from 'react'
import Header from '../components/Header'

export default function TeacherPage({ setMode }){
  const [questions, setQuestions] = useState([])
  const [results, setResults] = useState([])
  const [activeTab, setActiveTab] = useState('questions')
  const [timeLimit, setTimeLimit] = useState('')
  const [passingThreshold, setPassingThreshold] = useState('')
  const [text, setText] = useState('')
  const [choices, setChoices] = useState(['','','',''])
  const [correct, setCorrect] = useState('0')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editChoices, setEditChoices] = useState(['',''])
  const [editCorrect, setEditCorrect] = useState('0')
  const [showAddQuestion, setShowAddQuestion] = useState(false)

  async function loadQuestions() {
    try {
      const r = await fetch('http://localhost:3001/api/questions')
      const data = await r.json()
      setQuestions(data)
    } catch (e) {
      console.error('Error fetching questions:', e)
    }
  }

  async function loadResults() {
    try {
      const r = await fetch('http://localhost:3001/api/results')
      const data = await r.json()
      setResults(data)
    } catch (e) {
      console.error('Error fetching results:', e)
    }
  }

  useEffect(() => {
    loadQuestions()
    loadResults()
    fetch('http://localhost:3001/api/settings/time-limit').then(r=>r.json()).then(d=>{
      if (d && typeof d.minutes !== 'undefined' && d.minutes !== null) setTimeLimit(String(d.minutes))
    }).catch(()=>{})
    fetch('http://localhost:3001/api/settings/passing-threshold').then(r=>r.json()).then(d=>{
      if (d && typeof d.percent !== 'undefined' && d.percent !== null) setPassingThreshold(String(d.percent))
    }).catch(()=>{})
  }, [])

  useEffect(() => {
    if (activeTab === 'results') {
      loadResults()
    }
  }, [activeTab])

  function setChoice(i, val){ setChoices(prev => prev.map((c,idx)=> idx===i?val:c)) }

  async function addQuestion(){
    if (!text.trim()) return alert('Question text is required')
    try {
      const res = await fetch('http://localhost:3001/api/questions', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ text, choices, correct })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      loadQuestions()
      setText(''); setChoices(['','','','']); setCorrect('0')
    } catch (e) {
      console.error('Error adding question:', e)
      alert('Failed to add question: ' + e.message)
    }
  }

  async function handleImportExcel(e) {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('http://localhost:3001/api/questions/import', {
        method: 'POST',
        body: formData
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.success) {
        alert(`Đã nhập thành công ${data.count} câu hỏi`)
        loadQuestions()
      } else {
        alert('Lỗi nhập file: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error(err)
      alert('Lỗi nhập file: ' + err.message)
    }
    e.target.value = null
  }

  async function clearAllQuestions() {
    if (!confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa TẤT CẢ câu hỏi? Hành động này không thể hoàn tác.')) return
    if (!confirm('Xác nhận lần 2: Xóa toàn bộ câu hỏi?')) return
    await fetch('http://localhost:3001/api/questions/clear-all', { method: 'DELETE' })
    loadQuestions()
  }

  async function clearAllResults() {
    if (!confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa TẤT CẢ kết quả thi? Hành động này không thể hoàn tác.')) return
    if (!confirm('Xác nhận lần 2: Xóa toàn bộ kết quả?')) return
    await fetch('http://localhost:3001/api/results/clear-all', { method: 'DELETE' })
    loadResults()
  }

  function startEdit(q) {
    setEditingId(q.id)
    setEditText(q.text)
    setEditChoices(q.choices)
    setEditCorrect(String(q.correct))
  }

  async function saveEdit() {
    if (!editText.trim()) return alert('Question text is required')
    await fetch(`http://localhost:3001/api/questions/${editingId}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ text: editText, choices: editChoices, correct: editCorrect })
    })
    loadQuestions()
    setEditingId(null)
    setEditText(''); setEditChoices(['','']); setEditCorrect('0')
  }

  async function deleteQuestion(id) {
    if (!confirm('Xác nhận xóa câu hỏi này?')) return
    await fetch(`http://localhost:3001/api/questions/${id}`, { method: 'DELETE' })
    loadQuestions()
  }

  function setEditChoice(i, val) { setEditChoices(prev => prev.map((c,idx)=> idx===i?val:c)) }
  function addEditChoice() { setEditChoices(prev => [...prev, '']) }

  async function deleteResult(id) {
    if (!confirm('Xác nhận xóa kết quả này?')) return
    await fetch(`http://localhost:3001/api/results/${id}`, { method: 'DELETE' })
    loadResults()
  }

  async function exportResults(){
    const a = document.createElement('a')
    a.href = 'http://localhost:3001/api/results/export'
    a.click()
  }

  async function saveTimeLimit(){
    const m = Number(timeLimit)
    if (isNaN(m) || m < 0) return alert('Thời gian phải là số phút không âm')
    await fetch('http://localhost:3001/api/settings/time-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes: Math.floor(m) })
    })
    alert('Đã lưu thời gian làm bài')
  }

  async function savePassingThreshold(){
    const p = Number(passingThreshold)
    if (isNaN(p) || p < 0 || p > 100) return alert('Ngưỡng đạt phải từ 0 đến 100')
    await fetch('http://localhost:3001/api/settings/passing-threshold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ percent: Math.floor(p) })
    })
    alert('Đã lưu ngưỡng điểm đạt')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentMode="teacher" setMode={setMode} isFixed={true} />

      <div className="pt-20 p-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">Bảng điều khiển</h2>
      
          <div className="flex gap-4 mb-6 border-b">
            <button 
              onClick={() => setActiveTab('questions')}
              className={`px-4 py-2 font-medium ${activeTab === 'questions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            >
              Quản lý câu hỏi
            </button>
            <button 
              onClick={() => setActiveTab('results')}
              className={`px-4 py-2 font-medium ${activeTab === 'results' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            >
              Xem kết quả
            </button>
          </div>

          {activeTab === 'questions' && (
        <>
          <section className="mb-6 bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">Thiết lập bài thi</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1">Thời gian làm bài (phút)</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" className="w-28 p-2 border rounded" value={timeLimit} onChange={e=>setTimeLimit(e.target.value)} placeholder="Phút" />
                  <button onClick={saveTimeLimit} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Lưu</button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Đặt 0 nếu không giới hạn thời gian</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ngưỡng điểm đạt (%)</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="100" className="w-28 p-2 border rounded" value={passingThreshold} onChange={e=>setPassingThreshold(e.target.value)} placeholder="%" />
                  <button onClick={savePassingThreshold} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Lưu</button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Ví dụ: nhập 80 để yêu cầu 80% số câu đúng</p>
              </div>
            </div>
          </section>

          <section className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg shadow border border-blue-100">
            <button 
              onClick={() => setShowAddQuestion(!showAddQuestion)}
              className="w-full flex justify-between items-center text-xl font-semibold mb-2 hover:text-blue-600 transition"
            >
              <span>Thêm / Nhập câu hỏi</span>
              <span className="text-xl">{showAddQuestion ? '▼' : '▶'}</span>
            </button>
            
            {showAddQuestion && (
              <div className="mt-4 space-y-6">
                <div className="bg-white p-4 rounded border">
                  <h4 className="font-medium mb-2 text-gray-700">Nhập từ Excel</h4>
                  <div className="flex items-center gap-4">
                    <input 
                      type="file" 
                      accept=".xlsx, .xls" 
                      onChange={handleImportExcel}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <div className="text-xs text-gray-500">
                      Cột 1: Câu hỏi, Cột 2-5: Đáp án A-D, Cột 6: Đáp án đúng (A/B/C/D)
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded border">
                  <h4 className="font-medium mb-2 text-gray-700">Thêm thủ công</h4>
                  <input className="w-full mb-2 p-2 border-2 border-blue-200 rounded focus:border-blue-500 outline-none" value={text} onChange={e=>setText(e.target.value)} placeholder="Nhập nội dung câu hỏi..." />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    {choices.map((c,i)=>(
                      <input key={i} className="w-full p-2 border rounded" value={c} onChange={e=>setChoice(i,e.target.value)} placeholder={`Lựa chọn ${String.fromCharCode(65+i)}`} />
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <select className="px-3 py-2 border rounded bg-white" value={correct} onChange={e=>setCorrect(e.target.value)}>
                      {choices.map((_,i)=>(<option key={i} value={i}>{'Đáp án đúng: ' + String.fromCharCode(65+i)}</option>))}
                    </select>
                    <button className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium" onClick={addQuestion}>Thêm câu hỏi</button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Danh sách câu hỏi ({questions.length})</h3>
              <button 
                onClick={clearAllQuestions}
                className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm font-medium"
              >
                Xóa tất cả câu hỏi
              </button>
            </div>
            <ul className="space-y-2">
              {questions.map(q=>(
                <li key={q.id} className="p-3 border rounded hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{q.text}</div>
                      <div className="text-sm mt-2 text-gray-600 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                        {q.choices.map((c,i)=> (
                          <div key={i} className={`${String(i) === String(q.correct) ? 'text-green-600 font-medium' : ''}`}>
                            {String.fromCharCode(65+i)}. {c} {String(i) === String(q.correct) && '✓'}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4 flex-shrink-0">
                      <button 
                        onClick={() => startEdit(q)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        Sửa
                      </button>
                      <button 
                        onClick={() => deleteQuestion(q.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {editingId !== null && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h2 className="text-xl font-semibold mb-4">Sửa câu hỏi</h2>
                <input className="w-full mb-2 p-2 border-3 border-blue-600 rounded" value={editText} onChange={e=>setEditText(e.target.value)} placeholder="Nhập câu hỏi" />
                <div className="mb-2">
                  {editChoices.map((c,i)=>(
                    <input key={i} className="w-full mb-1 p-2 border rounded" value={c} onChange={e=>setEditChoice(i,e.target.value)} placeholder={`Choice ${i+1}`} />
                  ))}
                  <div className="mt-2">
                    <button className="px-3 py-1 border rounded mr-2 hover:bg-gray-100" onClick={addEditChoice}>Add choice</button>
                    <select className="px-2 py-1 border rounded" value={editCorrect} onChange={e=>setEditCorrect(e.target.value)}>
                      {editChoices.map((_,i)=>(<option key={i} value={i}>{'Correct: '+(i+1)}</option>))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button className="px-4 py-2 border rounded hover:bg-gray-100" onClick={() => setEditingId(null)}>Cancel</button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={saveEdit}>Save</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'results' && (
        <section className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Kết quả thi</h2>
            <div className="flex gap-2">
              <button className="px-4 py-2 border rounded hover:bg-gray-100" onClick={loadResults}>Cập nhật</button>
              <button className="px-4 py-2 border rounded hover:bg-gray-100" onClick={exportResults}>Xuất kết quả (Excel)</button>
              <button 
                onClick={clearAllResults}
                className="px-4 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 font-medium"
              >
                Xóa tất cả
              </button>
            </div>
          </div>
          {results.length === 0 ? (
            <p className="text-gray-500">Chưa có kết quả nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="px-4 py-3 font-semibold text-gray-700">Tên</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Điểm</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Thời gian bắt đầu</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Thời gian nộp</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Thời gian làm</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Câu trả lời</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(result => (
                    <tr key={result.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800">{result.studentName}</td>
                      <td className="px-4 py-3 font-medium text-blue-600">{result.score}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{result.startTime ? new Date(result.startTime).toLocaleString() : 'N/A'}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{result.submitTime ? new Date(result.submitTime).toLocaleString() : 'N/A'}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono">
                        {result.timeSpent !== null && result.timeSpent !== undefined ? `${Math.floor(result.timeSpent / 60)}m ${result.timeSpent % 60}s` : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <details className="cursor-pointer">
                          <summary className="text-blue-600 hover:underline">Xem</summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-48">
                            {JSON.stringify(result.answers, null, 2)}
                          </pre>
                        </details>
                      </td>
                      <td className="px-4 py-3">
                        <button 
                          onClick={() => deleteResult(result.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
      </div>
    </div>
  )
}
