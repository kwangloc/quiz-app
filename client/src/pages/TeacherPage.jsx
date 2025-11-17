import { useEffect, useState } from 'react'
import Header from '../components/Header'

export default function TeacherPage({ setMode }){
  const [questions, setQuestions] = useState([])
  const [results, setResults] = useState([])
  const [activeTab, setActiveTab] = useState('questions')
  const [timeLimit, setTimeLimit] = useState('')
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
    // initial load; server might still be starting in prod, so try questions immediately
    loadQuestions()
    loadResults()
    // load time limit
    fetch('http://localhost:3001/api/settings/time-limit').then(r=>r.json()).then(d=>{
      if (d && typeof d.minutes !== 'undefined' && d.minutes !== null) setTimeLimit(String(d.minutes))
    }).catch(()=>{})
  }, [])

  useEffect(() => {
    if (activeTab === 'results') {
      loadResults()
    }
  }, [activeTab])

  function addChoice(){ setChoices(prev => [...prev, '']) }
  function setChoice(i, val){ setChoices(prev => prev.map((c,idx)=> idx===i?val:c)) }

  async function addQuestion(){
    if (!text.trim()) return alert('Question text is required')
    await fetch('http://localhost:3001/api/questions', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ text, choices, correct })
    })
    // Refresh questions list
    const res = await fetch('http://localhost:3001/api/questions')
    setQuestions(await res.json())
    setText(''); setChoices(['','','','']); setCorrect('0')
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
    // Refresh questions list
    const res = await fetch('http://localhost:3001/api/questions')
    setQuestions(await res.json())
    setEditingId(null)
    setEditText(''); setEditChoices(['','']); setEditCorrect('0')
  }

  async function deleteQuestion(id) {
    if (!confirm('Xác nhận xóa câu hỏi này?')) return
    await fetch(`http://localhost:3001/api/questions/${id}`, { method: 'DELETE' })
    // Refresh questions list
    const res = await fetch('http://localhost:3001/api/questions')
    setQuestions(await res.json())
  }

  function setEditChoice(i, val) { setEditChoices(prev => prev.map((c,idx)=> idx===i?val:c)) }
  function addEditChoice() { setEditChoices(prev => [...prev, '']) }

  async function deleteResult(id) {
    if (!confirm('Xác nhận xóa kết quả này?')) return
    await fetch(`http://localhost:3001/api/results/${id}`, { method: 'DELETE' })
    // Refresh results list
    const res = await fetch('http://localhost:3001/api/results')
    setResults(await res.json())
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentMode="teacher" setMode={setMode} isFixed={true} />

      <div className="pt-20 p-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">Bảng điều khiển</h2>
      
          {/* Tab Navigation */}
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

          {/* Questions Tab */}
          {activeTab === 'questions' && (
        <>
          {/* Time limit controls */}
          <section className="mb-6 bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">Thiết lập thời gian làm bài</h3>
            <div className="flex items-center gap-3 flex-wrap">
              <input type="number" min="0" className="w-32 p-2 border rounded" value={timeLimit} onChange={e=>setTimeLimit(e.target.value)} placeholder="Phút" />
              <button onClick={saveTimeLimit} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Lưu</button>
              <span className="text-sm text-gray-500">Đặt 0 để không giới hạn</span>
            </div>
          </section>
          <section className="mb-6 bg-white p-6 rounded-lg shadow">
            <button 
              onClick={() => setShowAddQuestion(!showAddQuestion)}
              className="w-full flex justify-between items-center text-xl font-semibold mb-4 hover:text-blue-600 transition"
            >
              <span>Thêm câu hỏi</span>
              <span className="text-xl">{showAddQuestion ? '▼' : '▶'}</span>
            </button>
            
            {showAddQuestion && (
              <>
                <input className="w-full mb-2 p-2 border rounded" value={text} onChange={e=>setText(e.target.value)} placeholder="Nhập câu hỏi" />
                <div className="mb-2">
                  {choices.map((c,i)=>(
                    <input key={i} className="w-full mb-1 p-2 border rounded" value={c} onChange={e=>setChoice(i,e.target.value)} placeholder={`Lựa chọn ${i+1}`} />
                  ))}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {/* <button className="px-3 py-1 border rounded mr-2 hover:bg-gray-100" onClick={addChoice}>Thêm lựa chọn</button> */}
                    <select className="px-2 py-1 border rounded" value={correct} onChange={e=>setCorrect(e.target.value)}>
                      {choices.map((_,i)=>(<option key={i} value={i}>{'Đáp án đúng: '+(i+1)}</option>))}
                    </select>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={addQuestion}>Lưu câu hỏi</button>
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">Danh sách câu hỏi</h3>
            <ul className="space-y-2">
              {questions.map(q=>(
                <li key={q.id} className="p-3 border rounded hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{q.text}</div>
                      <div className="text-sm mt-2 text-gray-600">
                        {q.choices.map((c,i)=> <div key={i} className="ml-4">• {c}</div>)}
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

          {/* Edit Question Modal */}
          {editingId !== null && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h2 className="text-xl font-semibold mb-4">Edit Question</h2>
                <input className="w-full mb-2 p-2 border rounded" value={editText} onChange={e=>setEditText(e.target.value)} placeholder="Nhập câu hỏi" />
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

      {/* Results Tab */}
      {activeTab === 'results' && (
        <section className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Kết quả thi</h2>
            <div className="flex gap-2">
              <button className="px-4 py-2 border rounded hover:bg-gray-100" onClick={loadResults}>Cập nhật</button>
              <button className="px-4 py-2 border rounded hover:bg-gray-100" onClick={exportResults}>Xuất kết quả (Excel)</button>
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
