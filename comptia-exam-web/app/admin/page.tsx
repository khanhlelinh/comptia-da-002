'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

// ... (Khai báo DOMAINS và INITIAL_FORM giữ nguyên)
const DOMAINS = ["Data concepts and environments", "Data acquisition and preparation", "Data analysis", "Visualization and reporting", "Data governance"];
const INITIAL_FORM = { id: null, q_num: '', q_text: '', options: '', answer: '', domain: '', exp_en: '', exp_vi: '' };

export default function AdminDashboard() {
  // Tabs State
  const [activeTab, setActiveTab] = useState<'questions' | 'history'>('questions');
  
  // State Quản lý Câu hỏi
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>(INITIAL_FORM);
  const [sortConfig, setSortConfig] = useState<{ key: string | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  // State Lịch sử & Giám thị
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [histories, setHistories] = useState<any[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<any>(null); // Popup chi tiết bài thi

  // Fetch Questions
  const fetchQuestions = () => {
    setIsLoading(true);
    fetch('/api/questions').then(res => res.json()).then(data => {
      if (data.success) setQuestions(data.data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  };

  // Fetch Histories
  const fetchHistories = () => {
    fetch('/api/exam/submit').then(res => res.json()).then(data => {
      if (data.success) setHistories(data.data);
    });
  };

  useEffect(() => {
    if (activeTab === 'questions') fetchQuestions();
    if (activeTab === 'history') fetchHistories();
  }, [activeTab]);

  // Giám thị Real-time
  useEffect(() => {
    if (activeTab !== 'questions') return; // Tạm tắt giám thị nếu không ở tab quản lý để nhẹ trang
    const fetchActiveUsers = () => {
      fetch('/api/exam/progress').then(res => res.json()).then(data => { if (data.success) setActiveUsers(data.data); }).catch(() => {});
    };
    fetchActiveUsers();
    const interval = setInterval(fetchActiveUsers, 3000);
    return () => clearInterval(interval);
  }, [activeTab]);


  // =====================
  // LOGIC SẮP XẾP CÂU HỎI
  // =====================
  const sortedQuestions = useMemo(() => {
    let sortableItems = [...questions];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = sortConfig.key === 'id' ? (a.q_num || a.id) : a[sortConfig.key!];
        let bValue = sortConfig.key === 'id' ? (b.q_num || b.id) : b[sortConfig.key!];
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();
        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [questions, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };
  const getSortIcon = (key: string) => sortConfig.key !== key ? <span className="text-gray-300 ml-1">↕</span> : (sortConfig.direction === 'asc' ? <span className="text-blue-600 ml-1 font-black">▲</span> : <span className="text-blue-600 ml-1 font-black">▼</span>);

  // =====================
  // THAO TÁC CÂU HỎI
  // =====================
  const handleDelete = async (id: number) => {
    if (!confirm('⚠️ Bạn có chắc chắn muốn xóa câu hỏi này không?')) return;
    try {
      const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchQuestions();
      else alert('❌ Lỗi: ' + data.error);
    } catch (err) { alert('❌ Lỗi kết nối!'); }
  };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = isEditing ? `/api/questions/${formData.id}` : '/api/questions';
    try {
      const res = await fetch(url, { method: isEditing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (data.success) { setIsModalOpen(false); fetchQuestions(); }
      else alert('❌ Lỗi: ' + data.error);
    } catch (err) { alert('❌ Lỗi lưu dữ liệu!'); }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        
        {/* Header & Tabs */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <div className="flex items-center gap-6">
            <h1 className="text-3xl font-extrabold text-gray-800">⚙️ Admin Control</h1>
            
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setActiveTab('questions')} className={`px-4 py-2 font-bold rounded-md transition ${activeTab === 'questions' ? 'bg-white text-blue-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}>
                📚 Quản lý Câu hỏi
              </button>
              <button onClick={() => setActiveTab('history')} className={`px-4 py-2 font-bold rounded-md transition ${activeTab === 'history' ? 'bg-white text-blue-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}>
                📜 Lịch sử Thi
              </button>
            </div>
          </div>

          <Link href="/exam/setup" className="px-4 py-2 bg-purple-100 text-purple-700 font-bold rounded-xl hover:bg-purple-200 transition">
            🎓 Đi tới trang Thi thử
          </Link>
        </div>

        {/* =======================================================
            TAB 1: QUẢN LÝ CÂU HỎI (Có giám thị)
            ======================================================= */}
        {activeTab === 'questions' && (
          <>
            {/* Giám thị */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  📡 Phòng thi trực tuyến <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                </h2>
                <button onClick={() => { setFormData(INITIAL_FORM); setIsEditing(false); setIsModalOpen(true); }} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm">+ Thêm câu hỏi mới</button>
              </div>
              
              {activeUsers.length === 0 ? (
                <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-500 font-medium text-sm text-center">Hiện chưa có học viên nào thi.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {activeUsers.map(user => (
                    <div key={user.nickname} className={`p-4 rounded-xl border-2 transition-all ${user.is_peeking ? 'bg-red-50 border-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]' : 'bg-blue-50 border-blue-200'}`}>
                      <div className="font-extrabold text-gray-900 truncate" title={user.nickname}>👤 {user.nickname}</div>
                      <div className="mt-2 text-sm font-bold text-gray-700">📍 Câu: <span className="text-blue-600">{user.current_q} / {user.total_q}</span></div>
                      <div className="mt-1 text-xs font-bold">Trạng thái: {user.is_peeking ? <span className="text-red-600 animate-pulse">👀 Đang nhìn trộm!</span> : <span className="text-green-600">✍️ Đang làm bài</span>}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bảng câu hỏi */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-[60vh] overflow-y-auto shadow-sm">
              <table className="w-full text-sm text-left text-gray-600">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 z-10 shadow-sm select-none">
                  <tr>
                    <th onClick={() => requestSort('id')} className="px-4 py-4 w-16 cursor-pointer hover:bg-gray-200 transition group"><div className="flex items-center">ID {getSortIcon('id')}</div></th>
                    <th onClick={() => requestSort('q_text')} className="px-4 py-4 w-1/3 cursor-pointer hover:bg-gray-200 transition group"><div className="flex items-center">NỘI DUNG {getSortIcon('q_text')}</div></th>
                    <th className="px-4 py-4 w-20 text-center">Đáp án</th>
                    <th className="px-4 py-4 w-48">Phân loại</th>
                    <th className="px-4 py-4 text-center w-32">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? <tr><td colSpan={5} className="text-center py-8 font-bold">Đang tải dữ liệu...</td></tr> : 
                   sortedQuestions.length === 0 ? <tr><td colSpan={5} className="text-center py-8 font-bold text-red-500">Chưa có dữ liệu</td></tr> : 
                   sortedQuestions.map((q) => (
                    <tr key={q.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-900">{q.q_num || q.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 line-clamp-2">{q.q_text?.substring(0, 100)}...</td>
                      <td className="px-4 py-3 font-extrabold text-green-600 text-center">{q.answer}</td>
                      <td className="px-4 py-3">{q.domain ? <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">{q.domain}</span> : <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full">Chưa phân loại</span>}</td>
                      <td className="px-4 py-3 text-center space-x-2">
                        <button onClick={() => {setFormData({...q}); setIsEditing(true); setIsModalOpen(true);}} className="text-white bg-amber-500 hover:bg-amber-600 font-bold rounded-lg text-xs px-3 py-2">Sửa</button>
                        <button onClick={() => handleDelete(q.id)} className="text-white bg-red-600 hover:bg-red-700 font-bold rounded-lg text-xs px-3 py-2">Xóa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* =======================================================
            TAB 2: LỊCH SỬ THI
            ======================================================= */}
        {activeTab === 'history' && (
          <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-[75vh] overflow-y-auto shadow-sm">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 shadow-sm">
                <tr>
                  <th className="px-4 py-4">Học viên</th>
                  <th className="px-4 py-4 text-center">Điểm số</th>
                  <th className="px-4 py-4 text-center">Đúng / Tổng</th>
                  <th className="px-4 py-4">Thời gian nộp</th>
                  <th className="px-4 py-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {histories.length === 0 ? <tr><td colSpan={5} className="text-center py-8 font-bold">Chưa có ai thi hoàn thành.</td></tr> : 
                 histories.map((h) => (
                  <tr key={h.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-4 py-4 font-bold text-gray-900 text-base">👤 {h.nickname}</td>
                    <td className="px-4 py-4 text-center font-black text-blue-600 text-lg">{h.score}</td>
                    <td className="px-4 py-4 text-center font-bold text-green-600">{h.correct_q} / {h.total_q}</td>
                    <td className="px-4 py-4 font-medium">{new Date(h.createdAt).toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-4 text-center">
                      <button onClick={() => setSelectedHistory(h)} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-900 transition text-xs">
                        👁 Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* POPUP CHI TIẾT LỊCH SỬ THI (Của Admin) */}
      {selectedHistory && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-2xl font-extrabold text-gray-800">Báo cáo bài thi: <span className="text-blue-600">{selectedHistory.nickname}</span></h2>
              <button onClick={() => setSelectedHistory(null)} className="text-gray-400 hover:text-red-600 font-bold text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-white space-y-4">
              <div className="flex gap-4 mb-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg"><strong>Điểm:</strong> {selectedHistory.score}/10</div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg"><strong>Số câu đúng:</strong> {selectedHistory.correct_q}/{selectedHistory.total_q}</div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg"><strong>Nộp lúc:</strong> {new Date(selectedHistory.createdAt).toLocaleString('vi-VN')}</div>
              </div>

              {JSON.parse(selectedHistory.details).map((detail: any, i: number) => (
                <div key={i} className={`p-4 rounded-xl border-2 ${detail.is_correct ? 'bg-green-50/50 border-green-300' : 'bg-red-50/50 border-red-300'}`}>
                  <div className="font-bold mb-2">Câu {i + 1}: {detail.q_text}</div>
                  <div className="text-sm font-semibold mb-1">Thí sinh chọn: <span className={detail.is_correct ? 'text-green-700' : 'text-red-700'}>{detail.user_answer || '(Trống)'}</span></div>
                  <div className="text-sm font-semibold text-blue-700">Đáp án chuẩn: {detail.correct_answer}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA CÂU HỎI BỊ ẨN ĐI ĐỂ TỐI ƯU ĐỘ DÀI CODE, CODE MODAL NÀY BẠN GIỮ NGUYÊN NHƯ FILE TRƯỚC ĐÓ NHÉ! */}
      {/* ... (Đoạn code Modal Thêm/Sửa câu hỏi y hệt như cũ) ... */}

    </div>
  );
}