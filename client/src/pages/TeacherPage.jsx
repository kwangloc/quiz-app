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
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

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
    fetch('http://localhost:3001/api/settings/passing-threshold').then(r=>r.json()).then(d=>{
      if (d && typeof d.percent !== 'undefined' && d.percent !== null) setPassingThreshold(String(d.percent))
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

  async function handleImportExcel(){
    if (!importFile) return alert('Vui lòng chọn file Excel')
    setImporting(true)
    setImportResult(null)
    
    const formData = new FormData()
    formData.append('file', importFile)
    
    try {
      const res = await fetch('http://localhost:3001/api/questions/import', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      
      if (!res.ok) {
        setImportResult({ error: data.error || 'Import failed' })
      } else {
        setImportResult(data)
        setImportFile(null)
        // Refresh questions list after import
        setTimeout(() => loadQuestions(), 200)
      }
    } catch (e) {
      setImportResult({ error: `Network error: ${e.message}` })
    } finally {
      setImporting(false)
    }
  }

  async function clearAllQuestions(){
    if (!confirm('Bạn có chắc chắn muốn xóa TẤT CẢ câu hỏi? Hành động này không thể hoàn tác.')) return
    try {
      await fetch('http://localhost:3001/api/questions/clear-all', { method: 'POST' })
      loadQuestions()
      alert('Đã xóa tất cả câu hỏi')
    } catch (e) {
      alert('Lỗi khi xóa câu hỏi: ' + e.message)
    }
  }

  async function clearAllResults(){
    if (!confirm('Bạn có chắc chắn muốn xóa TẤT CẢ kết quả? Hành động này không thể hoàn tác.')) return
    try {
      await fetch('http://localhost:3001/api/results/clear-all', { method: 'POST' })
      loadResults()
      alert('Đã xóa tất cả kết quả')
    } catch (e) {
      alert('Lỗi khi xóa kết quả: ' + e.message)
    }
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
          <section className="mb-6 p-6 rounded-lg shadow-lg border-2 border-blue-200">
            <h3 className="text-2xl font-bold mb-4 text-blue-900 ">Thiết lập bài thi</h3>
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
          <section className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow-lg border-2 border-blue-200">
            <h3 className="text-2xl font-bold mb-6 text-blue-900 flex items-center gap-2">
              Thêm câu hỏi
            </h3>
            
            {/* Two column layout */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Excel Import Section */}
              <div className="bg-white p-5 rounded-lg border border-green-200 shadow">
                <h4 className="text-lg font-semibold text-green-700 mb-4 flex items-center gap-2">
                  <span className="text-2xl">📊</span> Nhập từ Excel
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chọn file Excel (.xlsx)</label>
                    <input 
                      type="file" 
                      accept=".xlsx,.xls"
                      onChange={e => setImportFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded">Định dạng: Cột A = Câu hỏi, Cột B-E = Đáp án, Cột F = Đáp án đúng (1-4)</p>
                  </div>
                  <button 
                    onClick={handleImportExcel} 
                    disabled={!importFile || importing}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-semibold transition"
                  >
                    {importing ? '⏳ Đang nhập...' : '📤 Nhập từ Excel'}
                  </button>
                  
                  {importResult && (
                    <div className={`p-3 rounded-lg text-sm border-l-4 ${importResult.error ? 'bg-red-50 text-red-700 border-red-400' : 'bg-green-50 text-green-700 border-green-400'}`}>
                      {importResult.error ? (
                        <div>
                          <p className="font-semibold">❌ Lỗi: {importResult.error}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold">✅ Nhập thành công!</p>
                          <p className="text-sm mt-1">📌 Thêm: {importResult.imported} câu hỏi</p>
                          {importResult.skipped > 0 && <p className="text-sm">⊘ Bỏ qua: {importResult.skipped} dòng trống</p>}
                          {importResult.errors.length > 0 && (
                            <details className="mt-2 cursor-pointer">
                              <summary className="font-medium">⚠️ Lỗi ({importResult.errors.length} dòng)</summary>
                              <pre className="text-xs overflow-auto max-h-40 p-2 mt-2 bg-white rounded border">
                                {importResult.errors.map((err, i) => `Dòng ${err.row}: ${err.message}`).join('\n')}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Add Section */}
              <div className="bg-white p-5 rounded-lg border border-blue-200 shadow">
                <h4 className="text-lg font-semibold text-blue-700 mb-4 flex items-center gap-2">
                  <span className="text-2xl">✏️</span> Thêm thủ công
                </h4>
                
                <div className="space-y-3">
                  <input 
                    className="w-full p-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 text-sm" 
                    value={text} 
                    onChange={e=>setText(e.target.value)} 
                    placeholder="Nhập câu hỏi..." 
                  />
                  <div className="space-y-2">
                    {choices.map((c,i)=>(
                      <input 
                        key={i} 
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 text-sm" 
                        value={c} 
                        onChange={e=>setChoice(i,e.target.value)} 
                        placeholder={`Lựa chọn ${i+1}`} 
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <select className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 text-sm" value={correct} onChange={e=>setCorrect(e.target.value)}>
                      {choices.map((_,i)=>(<option key={i} value={i}>{'Đáp án: '+(i+1)}</option>))}
                    </select>
                    <button 
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition whitespace-nowrap" 
                      onClick={addQuestion}
                    >
                      💾 Lưu
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6 p-6 rounded-lg shadow-lg border-2 border-blue-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold mb-6 text-blue-900 flex items-center gap-2">
              Danh sách câu hỏi
            </h3>
              <button 
                onClick={clearAllQuestions}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Xóa tất cả
              </button>
            </div>
            <ul className="space-y-2">
              {questions.map(q=>(
                <li key={q.id} className="p-3 border rounded hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{q.text}</div>
                      <div className="text-sm mt-2 text-gray-600">
                        {q.choices.map((c,i)=> (
                          <div key={i} className={`ml-4 ${String(i) === String(q.correct) ? 'font-semibold text-green-500 rounded' : ''}`}>
                           • {c} {String(i) === String(q.correct) ? '✓' : ''}
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

          {/* Edit Question Modal */}
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

      {/* Results Tab */}
      {activeTab === 'results' && (
        <section className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Kết quả thi</h2>
            <div className="flex gap-2">
              <button className="px-4 py-2 border rounded hover:bg-gray-100" onClick={loadResults}>Cập nhật</button>
              <button className="px-4 py-2 border rounded hover:bg-gray-100" onClick={exportResults}>Xuất kết quả (Excel)</button>
              <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium" onClick={clearAllResults}>Xóa tất cả</button>
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
