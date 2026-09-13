import { useEffect, useState } from "react";
import Header from "../components/Header";

export default function TeacherPage({ setMode }) {
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);
  const [examForm, setExamForm] = useState({ title: "", timeLimitMinutes: "0", passingThreshold: "80", numQuestions: "", departmentIds: [] });
  const [resultsExamFilter, setResultsExamFilter] = useState("");
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [newDepartment, setNewDepartment] = useState("");
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [editDeptName, setEditDeptName] = useState("");
  const [activeTab, setActiveTab] = useState("exams");
  const [text, setText] = useState("");
  const [choices, setChoices] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState("0");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editChoices, setEditChoices] = useState(["", ""]);
  const [editCorrect, setEditCorrect] = useState("0");
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  function showNotification(message, type = "success") {
    setNotification({ message, type });
  }

  async function loadExams() {
    try {
      const r = await fetch("http://localhost:3001/api/exams");
      const data = await r.json();
      setExams(data);
    } catch (e) {
      console.error("Error fetching exams:", e);
    }
  }

  async function loadQuestions(examId) {
    if (!examId) return setQuestions([]);
    try {
      const r = await fetch(`http://localhost:3001/api/questions?examId=${examId}`);
      const data = await r.json();
      setQuestions(data);
    } catch (e) {
      console.error("Error fetching questions:", e);
    }
  }

  async function loadResults(examId) {
    try {
      const url = examId
        ? `http://localhost:3001/api/results?examId=${examId}`
        : "http://localhost:3001/api/results";
      const r = await fetch(url);
      const data = await r.json();
      setResults(data);
    } catch (e) {
      console.error("Error fetching results:", e);
    }
  }

  async function loadDepartments() {
    try {
      const r = await fetch("http://localhost:3001/api/departments");
      const data = await r.json();
      setDepartments(data);
    } catch (e) {
      console.error("Error fetching departments:", e);
    }
  }

  useEffect(() => {
    loadExams();
    loadResults();
    loadDepartments();
  }, []);

  useEffect(() => {
    loadQuestions(selectedExamId);
  }, [selectedExamId]);

  useEffect(() => {
    if (activeTab === "results") {
      loadResults(resultsExamFilter || null);
    }
  }, [activeTab, resultsExamFilter]);

  function addChoice() {
    setChoices((prev) => [...prev, ""]);
  }
  function setChoice(i, val) {
    setChoices((prev) => prev.map((c, idx) => (idx === i ? val : c)));
  }

  async function addQuestion() {
    if (!selectedExamId)
      return showNotification("Vui lòng chọn bài thi trước", "error");
    if (!text.trim())
      return showNotification("Nội dung câu hỏi là bắt buộc", "error");
    await fetch("http://localhost:3001/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, choices, correct, examId: selectedExamId }),
    });
    await loadQuestions(selectedExamId);
    setText("");
    setChoices(["", "", "", ""]);
    setCorrect("0");
    showNotification("Đã thêm câu hỏi");
  }

  function startEdit(q) {
    setEditingId(q.id);
    setEditText(q.text);
    setEditChoices(q.choices);
    setEditCorrect(String(q.correct));
  }

  async function saveEdit() {
    if (!editText.trim())
      return showNotification("Nội dung câu hỏi là bắt buộc", "error");
    await fetch(`http://localhost:3001/api/questions/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: editText,
        choices: editChoices,
        correct: editCorrect,
      }),
    });
    await loadQuestions(selectedExamId);
    setEditingId(null);
    setEditText("");
    setEditChoices(["", ""]);
    setEditCorrect("0");
    showNotification("Đã cập nhật câu hỏi");
  }

  async function deleteQuestion(id) {
    if (!confirm("Xác nhận xóa câu hỏi này?")) return;
    await fetch(`http://localhost:3001/api/questions/${id}`, {
      method: "DELETE",
    });
    await loadQuestions(selectedExamId);
  }

  function setEditChoice(i, val) {
    setEditChoices((prev) => prev.map((c, idx) => (idx === i ? val : c)));
  }
  function addEditChoice() {
    setEditChoices((prev) => [...prev, ""]);
  }

  async function deleteResult(id) {
    if (!confirm("Xác nhận xóa kết quả này?")) return;
    await fetch(`http://localhost:3001/api/results/${id}`, {
      method: "DELETE",
    });
    await loadResults(resultsExamFilter || null);
  }

  async function exportResults() {
    const a = document.createElement("a");
    a.href = resultsExamFilter
      ? `http://localhost:3001/api/results/export?examId=${resultsExamFilter}`
      : "http://localhost:3001/api/results/export";
    a.click();
  }

  function openCreateExam() {
    setEditingExamId(null);
    setExamForm({ title: "", timeLimitMinutes: "0", passingThreshold: "80", numQuestions: "", departmentIds: [] });
    setExamModalOpen(true);
  }

  function openEditExam(exam) {
    setEditingExamId(exam.id);
    setExamForm({
      title: exam.title,
      timeLimitMinutes: String(exam.timeLimitMinutes ?? 0),
      passingThreshold: String(exam.passingThreshold ?? 80),
      numQuestions: exam.numQuestions != null ? String(exam.numQuestions) : "",
      departmentIds: exam.departmentIds || [],
    });
    setExamModalOpen(true);
  }

  function toggleExamDepartment(deptId) {
    setExamForm((f) => ({
      ...f,
      departmentIds: f.departmentIds.includes(deptId)
        ? f.departmentIds.filter((id) => id !== deptId)
        : [...f.departmentIds, deptId],
    }));
  }

  function setAllExamDepartments(all) {
    setExamForm((f) => ({ ...f, departmentIds: all ? departments.map((d) => d.id) : [] }));
  }

  async function saveExam() {
    if (!examForm.title.trim())
      return showNotification("Tiêu đề bài thi là bắt buộc", "error");
    const t = Number(examForm.timeLimitMinutes);
    if (isNaN(t) || t < 0)
      return showNotification("Thời gian làm bài phải là số phút không âm", "error");
    const p = Number(examForm.passingThreshold);
    if (isNaN(p) || p < 0 || p > 100)
      return showNotification("Ngưỡng đạt phải từ 0 đến 100", "error");
    let n = null;
    if (examForm.numQuestions !== "") {
      n = Number(examForm.numQuestions);
      if (isNaN(n) || n < 1)
        return showNotification("Số câu hỏi phải là số dương", "error");
    }
    const body = JSON.stringify({
      title: examForm.title.trim(),
      timeLimitMinutes: Math.floor(t),
      passingThreshold: Math.floor(p),
      numQuestions: n,
      departmentIds: examForm.departmentIds,
    });
    const url = editingExamId
      ? `http://localhost:3001/api/exams/${editingExamId}`
      : "http://localhost:3001/api/exams";
    const method = editingExamId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return showNotification(data.error || "Không thể lưu bài thi", "error");
    }
    setExamModalOpen(false);
    await loadExams();
    showNotification(editingExamId ? "Đã cập nhật bài thi" : "Đã tạo bài thi mới");
  }

  async function deleteExam(exam) {
    if (
      !confirm(
        `Xóa bài thi "${exam.title}"? Toàn bộ câu hỏi của bài thi này sẽ bị xóa. Hành động này không thể hoàn tác.`,
      )
    )
      return;
    await fetch(`http://localhost:3001/api/exams/${exam.id}`, { method: "DELETE" });
    if (selectedExamId === exam.id) setSelectedExamId(null);
    await loadExams();
    showNotification("Đã xóa bài thi");
  }

  async function addDepartment() {
    const name = newDepartment.trim();
    if (!name) return showNotification("Tên phòng ban là bắt buộc", "error");
    const res = await fetch("http://localhost:3001/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return showNotification(data.error || "Không thể thêm phòng ban", "error");
    }
    setNewDepartment("");
    await loadDepartments();
    showNotification("Đã thêm phòng ban");
  }

  function startEditDepartment(dept) {
    setEditingDeptId(dept.id);
    setEditDeptName(dept.name);
  }

  async function saveDepartment() {
    const name = editDeptName.trim();
    if (!name) return showNotification("Tên phòng ban là bắt buộc", "error");
    const res = await fetch(`http://localhost:3001/api/departments/${editingDeptId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return showNotification(data.error || "Không thể cập nhật phòng ban", "error");
    }
    setEditingDeptId(null);
    setEditDeptName("");
    await loadDepartments();
    // Exam rows embed department names, so they go stale on a rename
    await loadExams();
    showNotification("Đã cập nhật phòng ban");
  }

  async function deleteDepartment(dept) {
    if (
      !confirm(
        `Xóa phòng ban "${dept.name}"? Kết quả thi đã lưu vẫn giữ nguyên tên phòng ban cũ.`,
      )
    )
      return;
    await fetch(`http://localhost:3001/api/departments/${dept.id}`, { method: "DELETE" });
    if (editingDeptId === dept.id) setEditingDeptId(null);
    await loadDepartments();
    // Deleting a department drops its exam assignments server-side
    await loadExams();
    showNotification("Đã xóa phòng ban");
  }

  function manageExamQuestions(examId) {
    setSelectedExamId(examId);
    setActiveTab("questions");
  }

  async function handleImportExcel() {
    if (!selectedExamId)
      return showNotification("Vui lòng chọn bài thi trước", "error");
    if (!importFile)
      return showNotification("Vui lòng chọn file Excel", "error");
    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", importFile);
    formData.append("examId", selectedExamId);

    try {
      const res = await fetch("http://localhost:3001/api/questions/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setImportResult({ error: data.error || "Import failed" });
      } else {
        setImportResult(data);
        setImportFile(null);
        // Refresh questions list after import
        setTimeout(() => loadQuestions(selectedExamId), 200);
      }
    } catch (e) {
      setImportResult({ error: `Network error: ${e.message}` });
    } finally {
      setImporting(false);
    }
  }

  async function clearAllQuestions() {
    if (!selectedExamId) return;
    if (
      !confirm(
        "Bạn có chắc chắn muốn xóa TẤT CẢ câu hỏi của bài thi này? Hành động này không thể hoàn tác.",
      )
    )
      return;
    try {
      await fetch("http://localhost:3001/api/questions/clear-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: selectedExamId }),
      });
      loadQuestions(selectedExamId);
      showNotification("Đã xóa tất cả câu hỏi");
    } catch (e) {
      showNotification("Lỗi khi xóa câu hỏi: " + e.message, "error");
    }
  }

  async function clearAllResults() {
    const scopeLabel = resultsExamFilter ? "kết quả của bài thi đang lọc" : "TẤT CẢ kết quả";
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa ${scopeLabel}? Hành động này không thể hoàn tác.`,
      )
    )
      return;
    try {
      await fetch("http://localhost:3001/api/results/clear-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultsExamFilter ? { examId: resultsExamFilter } : {}),
      });
      loadResults(resultsExamFilter || null);
      showNotification("Đã xóa kết quả");
    } catch (e) {
      showNotification("Lỗi khi xóa kết quả: " + e.message, "error");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentMode="teacher" setMode={setMode} isFixed={true} />

      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-24 right-6 z-50 px-6 py-3 rounded-lg shadow-xl border-l-4 transition-all transform translate-y-0 opacity-100 ${
            notification.type === "error"
              ? "bg-red-100 border-red-500 text-red-800"
              : "bg-green-100 border-green-500 text-green-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {notification.type === "error" ? "⚠️" : "✅"}
            </span>
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      <div className="pt-20 p-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">
            Bảng điều khiển
          </h2>

          {/* Tab Navigation */}
          <div className="flex gap-4 mb-6 border-b">
            <button
              onClick={() => setActiveTab("exams")}
              className={`px-4 py-2 font-medium ${activeTab === "exams" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
            >
              Bài thi
            </button>
            <button
              onClick={() => setActiveTab("questions")}
              className={`px-4 py-2 font-medium ${activeTab === "questions" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
            >
              Quản lý câu hỏi
            </button>
            <button
              onClick={() => setActiveTab("departments")}
              className={`px-4 py-2 font-medium ${activeTab === "departments" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
            >
              Phòng ban
            </button>
            <button
              onClick={() => setActiveTab("results")}
              className={`px-4 py-2 font-medium ${activeTab === "results" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
            >
              Xem kết quả
            </button>
          </div>

          {/* Exams Tab */}
          {activeTab === "exams" && (
            <section className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-blue-900">Danh sách bài thi</h3>
                <button
                  onClick={openCreateExam}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
                >
                  + Tạo bài thi mới
                </button>
              </div>
              {exams.length === 0 ? (
                <p className="text-gray-500">Chưa có bài thi nào. Bấm "Tạo bài thi mới" để bắt đầu.</p>
              ) : (
                <div className="space-y-3">
                  {exams.map((exam) => (
                    <div
                      key={exam.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 flex justify-between items-center flex-wrap gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-800 text-lg">{exam.title}</div>
                        <div className="text-sm text-gray-500 mt-1 flex gap-4 flex-wrap">
                          <span>{exam.questionCount ?? 0} câu hỏi</span>
                          <span>{exam.timeLimitMinutes > 0 ? `${exam.timeLimitMinutes} phút` : "Không giới hạn thời gian"}</span>
                          <span>Ngưỡng đạt: {exam.passingThreshold}%</span>
                          <span>{exam.numQuestions ? `Rút ${exam.numQuestions} câu/lượt` : "Dùng tất cả câu hỏi"}</span>
                        </div>
                        <div className="mt-2">
                          {(exam.departmentNames || []).length === 0 ? (
                            <span className="text-sm text-amber-600">
                              ⚠️ Chưa giao cho phòng ban nào — người thi sẽ không thấy bài thi này
                            </span>
                          ) : (
                            <div className="flex gap-1.5 flex-wrap">
                              <span className="text-sm text-gray-500 mr-1">Phòng ban:</span>
                              {exam.departmentNames.map((n) => (
                                <span
                                  key={n}
                                  className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs"
                                >
                                  {n}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => manageExamQuestions(exam.id)}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                        >
                          Quản lý câu hỏi
                        </button>
                        <button
                          onClick={() => openEditExam(exam)}
                          className="px-3 py-1.5 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => deleteExam(exam)}
                          className="px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Questions Tab */}
          {activeTab === "questions" && (
            <>
              {!selectedExamId ? (
                <section className="bg-white p-6 rounded-lg shadow text-center">
                  <p className="text-gray-500 mb-4">Vui lòng chọn một bài thi để quản lý câu hỏi.</p>
                  <button
                    onClick={() => setActiveTab("exams")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
                  >
                    Đi tới danh sách bài thi
                  </button>
                </section>
              ) : (
                <>
                  <section className="mb-6 p-4 rounded-lg shadow border-2 border-blue-200 flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-gray-600">Đang quản lý câu hỏi cho bài thi:</span>
                    <select
                      className="px-3 py-2 border rounded-lg font-semibold text-blue-900"
                      value={selectedExamId}
                      onChange={(e) => setSelectedExamId(Number(e.target.value))}
                    >
                      {exams.map((exam) => (
                        <option key={exam.id} value={exam.id}>
                          {exam.title}
                        </option>
                      ))}
                    </select>
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Chọn file Excel (.xlsx)
                            </label>
                            <input
                              type="file"
                              accept=".xlsx,.xls"
                              onChange={(e) =>
                                setImportFile(e.target.files?.[0] || null)
                              }
                              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                            />
                            <p className="text-base text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                              <span className="font-bold">Cách định dạng file:</span><br />
                              <span className="font-bold">Cột A</span> = Câu hỏi, <span className="font-bold">Cột B-E</span> = 4 đáp án, <span className="font-bold">Cột F</span> =
                              Đáp án đúng (1-4)
                            </p>
                          </div>
                          <button
                            onClick={handleImportExcel}
                            disabled={!importFile || importing}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-semibold transition"
                          >
                            {importing ? "⏳ Đang nhập..." : "📤 Nhập từ Excel"}
                          </button>

                          {importResult && (
                            <div
                              className={`p-3 rounded-lg text-sm border-l-4 ${importResult.error ? "bg-red-50 text-red-700 border-red-400" : "bg-green-50 text-green-700 border-green-400"}`}
                            >
                              {importResult.error ? (
                                <div>
                                  <p className="font-semibold">
                                    ❌ Lỗi: {importResult.error}
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <p className="font-semibold">
                                    ✅ Nhập thành công!
                                  </p>
                                  <p className="text-sm mt-1">
                                    📌 Thêm: {importResult.imported} câu hỏi
                                  </p>
                                  {importResult.skipped > 0 && (
                                    <p className="text-sm">
                                      ⊘ Bỏ qua: {importResult.skipped} dòng trống
                                    </p>
                                  )}
                                  {importResult.errors.length > 0 && (
                                    <details className="mt-2 cursor-pointer">
                                      <summary className="font-medium">
                                        ⚠️ Lỗi ({importResult.errors.length} dòng)
                                      </summary>
                                      <pre className="text-xs overflow-auto max-h-40 p-2 mt-2 bg-white rounded border">
                                        {importResult.errors
                                          .map(
                                            (err, i) =>
                                              `Dòng ${err.row}: ${err.message}`,
                                          )
                                          .join("\n")}
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
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Nhập câu hỏi..."
                          />
                          <div className="space-y-2">
                            {choices.map((c, i) => (
                              <input
                                key={i}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 text-sm"
                                value={c}
                                onChange={(e) => setChoice(i, e.target.value)}
                                placeholder={`Lựa chọn ${i + 1}`}
                              />
                            ))}
                          </div>
                          <div className="flex gap-2 items-center">
                            <select
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 text-sm"
                              value={correct}
                              onChange={(e) => setCorrect(e.target.value)}
                            >
                              {choices.map((_, i) => (
                                <option key={i} value={i}>
                                  {"Đáp án: " + (i + 1)}
                                </option>
                              ))}
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
                    <h3 className="text-3xl font-bold mb-6 text-blue-900 flex gap-2 justify-center">
                      Danh sách câu hỏi
                    </h3>
                    <div className="flex justify-between items-center mb-4">
                      <span className="py-1 font-bold text-gray-700 rounded text-2xl">
                        Tổng số câu hỏi: <span className="text-red-700">{questions.length}</span>
                      </span>
                      <button
                        onClick={clearAllQuestions}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Xóa tất cả
                      </button>
                    </div>
                    <ul className="space-y-2">
                      {questions.map((q, idx) => (
                        <li
                          key={q.id}
                          className="p-3 border rounded hover:bg-gray-50"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-gray-800 flex items-start gap-2">
                                <span className="text-gray-500 font-semibold">{idx + 1}.</span>
                                <span>{q.text}</span>
                              </div>
                              <div className="text-sm mt-2 text-gray-600">
                                {q.choices.map((c, i) => (
                                  <div
                                    key={i}
                                    className={`ml-4 ${String(i) === String(q.correct) ? "font-semibold text-green-500 rounded" : ""}`}
                                  >
                                    • {c}{" "}
                                    {String(i) === String(q.correct) ? "✓" : ""}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4 flex-shrink-0">
                              <button
                                onClick={() => startEdit(q)}
                                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
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
                    <div className="fixed inset-0 bg-blue-200 bg-opacity-50 flex items-center justify-center p-4 z-50">
                      <div className="bg-white rounded-lg p-6 w-full max-w-4xl">
                        <h2 className="text-2xl font-bold mb-4 justify-center flex">Sửa câu hỏi</h2>
                        <div className="mb-1 text-xl font-semibold">Câu hỏi:</div>
                        <input
                          className="w-full mb-2 p-2 border rounded"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          placeholder="Nhập câu hỏi"
                        />
                        <div className="mb-1 text-xl font-semibold">Các lựa chọn:</div>
                        <div className="mb-2">
                          {editChoices.map((c, i) => (
                            <input
                              key={i}
                              className="w-full mb-1 p-2 border rounded"
                              value={c}
                              onChange={(e) => setEditChoice(i, e.target.value)}
                              placeholder={`Choice ${i + 1}`}
                            />
                          ))}
                          <div className="mt-2">
                            <button
                              className="px-3 py-1 border rounded mr-2 hover:bg-gray-100"
                              onClick={addEditChoice}
                            >
                              Thêm lựa chọn
                            </button>
                            <select
                              className="px-2 py-1 border rounded"
                              value={editCorrect}
                              onChange={(e) => setEditCorrect(e.target.value)}
                            >
                              {editChoices.map((_, i) => (
                                <option key={i} value={i}>
                                  {"Đáp án đúng: " + (i + 1)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            className="px-4 py-2 border rounded hover:bg-gray-100"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            onClick={saveEdit}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Departments Tab */}
          {activeTab === "departments" && (
            <section className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-2xl font-bold text-blue-900">Danh sách phòng ban</h3>
                <span className="text-sm text-gray-500">
                  Tổng số: <span className="font-semibold text-gray-700">{departments.length}</span>
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Người thi sẽ chọn phòng ban từ danh sách này trước khi bắt đầu làm bài.
              </p>

              <div className="flex gap-2 mb-6">
                <input
                  className="flex-1 p-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDepartment()}
                  placeholder="Nhập tên phòng ban mới..."
                />
                <button
                  onClick={addDepartment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold whitespace-nowrap"
                >
                  + Thêm phòng ban
                </button>
              </div>

              {departments.length === 0 ? (
                <p className="text-gray-500">Chưa có phòng ban nào.</p>
              ) : (
                <ul className="space-y-2">
                  {departments.map((dept, idx) => (
                    <li key={dept.id} className="p-3 border rounded hover:bg-gray-50">
                      {editingDeptId === dept.id ? (
                        <div className="flex gap-2 items-center">
                          <span className="text-gray-500 font-semibold">{idx + 1}.</span>
                          <input
                            className="flex-1 p-2 border rounded"
                            value={editDeptName}
                            autoFocus
                            onChange={(e) => setEditDeptName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveDepartment();
                              if (e.key === "Escape") setEditingDeptId(null);
                            }}
                          />
                          <button
                            onClick={saveDepartment}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Lưu
                          </button>
                          <button
                            onClick={() => setEditingDeptId(null)}
                            className="px-3 py-1 border rounded text-sm hover:bg-gray-100"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center gap-3">
                          <div className="font-medium text-gray-800 flex items-start gap-2">
                            <span className="text-gray-500 font-semibold">{idx + 1}.</span>
                            <span>{dept.name}</span>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => startEditDepartment(dept)}
                              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => deleteDepartment(dept)}
                              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Results Tab */}
          {activeTab === "results" && (
            <section className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">Kết quả thi</h2>
                  <select
                    className="px-3 py-2 border rounded-lg text-sm"
                    value={resultsExamFilter}
                    onChange={(e) => setResultsExamFilter(e.target.value)}
                  >
                    <option value="">Tất cả bài thi</option>
                    {exams.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                    onClick={() => loadResults(resultsExamFilter || null)}
                  >
                    Cập nhật
                  </button>
                  <button
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                    onClick={exportResults}
                  >
                    Xuất kết quả (Excel)
                  </button>
                  <button
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                    onClick={clearAllResults}
                  >
                    Xóa tất cả
                  </button>
                </div>
              </div>
              {results.length === 0 ? (
                <p className="text-gray-500">Chưa có kết quả nào.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b text-center">
                        <th className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                          Tên
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                          Phòng ban
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                          Bài thi
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                          Ngày
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                          Thời gian bắt đầu
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                          Thời gian nộp
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                          Thời gian làm
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                          Số câu đúng
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                          Tổng số câu
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                          Tỷ lệ đúng
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                          Câu trả lời
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result) => (
                        <tr
                          key={result.id}
                          className="border-b hover:bg-gray-50 text-center"
                        >
                          <td className="px-3 py-2.5 text-gray-800">
                            {result.studentName}
                          </td>
                          <td className="px-3 py-2.5 text-gray-600">
                            {result.department || "N/A"}
                          </td>
                          <td className="px-3 py-2.5 text-gray-600">
                            {result.examTitle || "N/A"}
                          </td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                            {result.createdAt
                              ? new Date(result.createdAt).toLocaleDateString()
                              : "N/A"}
                          </td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                            {result.startTime
                              ? new Date(result.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
                              : "N/A"}
                          </td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                            {result.submitTime
                              ? new Date(result.submitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
                              : "N/A"}
                          </td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                            {result.timeSpent !== null &&
                            result.timeSpent !== undefined
                              ? `${Math.floor(result.timeSpent / 60)} phút ${result.timeSpent % 60} giây`
                              : "N/A"}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-blue-600">
                            {result.score}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-blue-600">
                            {result.total || 'N/A'}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-blue-600">
                            {result.percent != null
                              ? result.percent + "%"
                              : "N/A"}
                          </td>
                          <td className="px-3 py-2.5 text-gray-600">
                            <details className="cursor-pointer">
                              <summary className="text-blue-600 hover:underline">
                                Xem
                              </summary>
                              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-48 text-left">
                                {JSON.stringify(result.answers, null, 2)}
                              </pre>
                            </details>
                          </td>
                          <td className="px-3 py-2.5">
                            <button
                              onClick={() => deleteResult(result.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
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

          {/* Exam Create/Edit Modal */}
          {examModalOpen && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4">
                  {editingExamId ? "Sửa bài thi" : "Tạo bài thi mới"}
                </h2>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Tiêu đề bài thi</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={examForm.title}
                    onChange={(e) => setExamForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Nhập tiêu đề bài thi"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Thời gian làm bài (phút)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full p-2 border rounded"
                      value={examForm.timeLimitMinutes}
                      onChange={(e) => setExamForm((f) => ({ ...f, timeLimitMinutes: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Đặt 0 nếu không giới hạn thời gian</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Ngưỡng điểm đạt (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-full p-2 border rounded"
                      value={examForm.passingThreshold}
                      onChange={(e) => setExamForm((f) => ({ ...f, passingThreshold: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Số câu hỏi rút ngẫu nhiên mỗi lượt thi</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full p-2 border rounded"
                    value={examForm.numQuestions}
                    onChange={(e) => setExamForm((f) => ({ ...f, numQuestions: e.target.value }))}
                    placeholder="Để trống = dùng tất cả câu hỏi"
                  />
                  <p className="text-xs text-gray-500 mt-1">Để trống nếu muốn dùng toàn bộ ngân hàng câu hỏi mỗi lượt thi</p>
                </div>
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium">
                      Giao cho phòng ban{" "}
                      <span className="text-gray-500 font-normal">({examForm.departmentIds.length} đã chọn)</span>
                    </label>
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setAllExamDepartments(true)}
                        className="text-blue-600 hover:underline"
                      >
                        Chọn tất cả
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => setAllExamDepartments(false)}
                        className="text-blue-600 hover:underline"
                      >
                        Bỏ chọn tất cả
                      </button>
                    </div>
                  </div>
                  {departments.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Chưa có phòng ban nào. Hãy thêm ở tab "Phòng ban" trước.
                    </p>
                  ) : (
                    <div className="border rounded max-h-52 overflow-y-auto p-2 space-y-1">
                      {departments.map((dept) => (
                        <label
                          key={dept.id}
                          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4"
                            checked={examForm.departmentIds.includes(dept.id)}
                            onChange={() => toggleExamDepartment(dept.id)}
                          />
                          <span>{dept.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {examForm.departmentIds.length === 0 && departments.length > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Chưa chọn phòng ban nào — người thi sẽ không thấy bài thi này.
                    </p>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                    onClick={() => setExamModalOpen(false)}
                  >
                    Hủy
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={saveExam}
                  >
                    Lưu
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
