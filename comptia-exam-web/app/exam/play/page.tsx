'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ExamPlay() {
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [showAns, setShowAns] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isDark, setIsDark] = useState(true);
  
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<any>(null); 

  // --- LOGIC ĐỒNG BỘ DARK MODE ---
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDarkMode = savedTheme !== 'light';
    setIsDark(isDarkMode);
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };
  // ---------------------------------

  useEffect(() => {
    const cfg = JSON.parse(localStorage.getItem('examConfig') || '{}');
    if (!cfg.nickname) {
        router.push('/exam/setup');
        return;
    }
    setConfig(cfg);
    setTimeLeft(cfg.timePerQ);

    fetch('/api/exam/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domainConfig: cfg.domainConfig })
    }).then(res => res.json()).then(res => setQuestions(res.data));
  }, [router]);

  useEffect(() => {
    if (!config?.nickname || questions.length === 0 || examResult) return;
    const sendHeartbeat = () => {
      fetch('/api/exam/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname: config.nickname, current_q: idx + 1, total_q: questions.length, is_peeking: showAns }) }).catch(() => {});
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 5000);
    return () => clearInterval(interval);
  }, [idx, showAns, config, questions.length, examResult]);

  useEffect(() => {
    if (examResult) return; 
    if (timeLeft <= 0 && questions.length > 0) {
      handleNext();
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, questions, examResult]);

  const handleSubmitExam = async () => {
    setIsSubmitting(true);
    const answersArray = Object.keys(userAnswers).map(qId => ({ questionId: Number(qId), selected: userAnswers[Number(qId)] }));
    try {
      const res = await fetch('/api/exam/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname: config.nickname, userAnswers: answersArray }) });
      const data = await res.json();
      if (data.success) setExamResult(data);
      else alert("Có lỗi khi nộp bài: " + data.error);
    } catch (error) { alert("Lỗi kết nối máy chủ!"); }
    setIsSubmitting(false);
  };

  const handleNext = () => {
    if (idx < questions.length - 1) { setIdx(idx + 1); setTimeLeft(config?.timePerQ || 60); setShowAns(false); } 
    else { handleSubmitExam(); }
  };

  const handleSelectOption = (letter: string) => { setUserAnswers({ ...userAnswers, [questions[idx].id]: letter }); };

  if (questions.length === 0) return <div className="min-h-screen flex justify-center items-center font-extrabold text-2xl w-full">⏳ Đang trộn đề thi từ MySQL...</div>;

  if (examResult) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors duration-300 p-6 flex flex-col items-center w-full">
        <div className="bg-white dark:bg-gray-900 w-full max-w-5xl p-8 rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-gray-800">
          <h1 className="text-4xl font-black text-center text-blue-600 dark:text-blue-400 mb-2">🎉 HOÀN THÀNH BÀI THI</h1>
          <p className="text-center text-xl font-bold text-gray-700 dark:text-gray-300 mb-8">Thí sinh: {config.nickname}</p>
          
          <div className="flex justify-center gap-8 mb-10">
            <div className="bg-blue-50 dark:bg-blue-900/40 p-6 rounded-2xl border-2 border-blue-200 dark:border-blue-800 text-center w-48">
              <div className="text-gray-600 dark:text-gray-400 font-bold mb-2">Tổng điểm</div>
              <div className="text-5xl font-black text-blue-600 dark:text-blue-400">{examResult.score}<span className="text-2xl text-gray-400">/10</span></div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/40 p-6 rounded-2xl border-2 border-green-200 dark:border-green-800 text-center w-48">
              <div className="text-gray-600 dark:text-gray-400 font-bold mb-2">Số câu đúng</div>
              <div className="text-5xl font-black text-green-600 dark:text-green-400">{examResult.correct_q}<span className="text-2xl text-gray-400">/{examResult.total_q}</span></div>
            </div>
          </div>

          <h2 className="text-2xl font-bold border-b-2 border-gray-200 dark:border-gray-800 pb-3 mb-6 text-gray-800 dark:text-white">Chi tiết bài làm:</h2>
          
          <div className="space-y-6">
            {examResult.details.map((detail: any, i: number) => (
              <div key={i} className={`p-6 rounded-xl border-2 ${detail.is_correct ? 'bg-green-50/50 dark:bg-green-900/10 border-green-300 dark:border-green-800' : 'bg-red-50/50 dark:bg-red-900/10 border-red-300 dark:border-red-800'}`}>
                <div className="text-base mb-4 text-gray-800 dark:text-gray-200 antialiased leading-relaxed">
                  <span className="font-bold text-gray-900 dark:text-white">Câu {i + 1}: </span> 
                  <span className="font-medium whitespace-pre-wrap">{detail.q_text}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4 font-bold">
                  <div className={`p-3 rounded-lg border-2 ${detail.user_answer ? (detail.is_correct ? 'bg-green-100 text-green-800 border-green-400' : 'bg-red-100 text-red-800 border-red-400') : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                    Bạn chọn: {detail.user_answer || 'Không chọn'}
                  </div>
                  <div className="p-3 rounded-lg border-2 bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700">
                    Đáp án đúng: {detail.correct_answer}
                  </div>
                </div>

                {!detail.is_correct && detail.exp_vi && (
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed antialiased">
                    <span className="font-bold text-yellow-700 dark:text-yellow-500">💡 Giải thích: </span>
                    {detail.exp_vi}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <button onClick={() => router.push('/exam/setup')} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-lg hover:bg-blue-700 transition shadow-lg">🔄 Thi lại từ đầu</button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  const optionsArr = q.options ? q.options.split('\n') : [];
  const currentSelected = userAnswers[q.id] || null; 

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors duration-300 p-6 flex flex-col items-center w-full font-sans">
      <div className="w-full max-w-4xl flex justify-between items-center mb-6">
         <button onClick={() => router.push('/exam/setup')} className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl font-bold border-2 border-gray-300 dark:border-gray-700 hover:bg-gray-300 transition">
           ⬅ Hủy bài thi
         </button>
         <button onClick={toggleTheme} className="px-5 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 rounded-full font-extrabold shadow-md transition">
          {isDark ? '☀️ Sáng' : '🌙 Tối'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl p-8 rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-center border-b-2 border-gray-200 dark:border-gray-800 pb-4 mb-6">
          <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
            Thí sinh: <span className="text-blue-600 dark:text-blue-400 font-black">{config?.nickname}</span>
          </div>
          <div className="text-lg font-black text-gray-800 dark:text-gray-200">
            Câu hỏi: <span className="text-indigo-600 dark:text-indigo-400">{idx + 1} / {questions.length}</span>
          </div>
          <div className={`text-3xl font-black ${timeLeft < 10 ? 'text-red-600 animate-pulse' : 'text-green-600 dark:text-green-400'}`}>⏱ {timeLeft}s</div>
        </div>

        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-700 mb-4 inline-block">
            {q.domain || "Chưa phân loại"}
          </span>
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-wrap antialiased">
            {q.q_text}
          </h2>
        </div>

        <div className="space-y-4 mb-8">
          {optionsArr.map((opt: string, i: number) => {
            const letter = opt.trim().substring(0, 1).toUpperCase();
            const isCorrect = letter === (q.answer || '').trim().toUpperCase();
            let btnClass = "w-full text-left p-4 rounded-xl border-2 transition font-medium text-base whitespace-pre-wrap flex items-start antialiased leading-relaxed ";

            if (showAns) {
                if (isCorrect) btnClass += "bg-green-100 dark:bg-green-950/60 border-green-500 text-green-900 dark:text-green-200";
                else if (currentSelected === letter) btnClass += "bg-red-100 dark:bg-red-950/60 border-red-500 text-red-900 dark:text-red-200";
                else btnClass += "border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-500 opacity-60";
            } else {
                if (currentSelected === letter) btnClass += "bg-blue-100 dark:bg-blue-950/70 border-blue-600 text-blue-900 dark:text-blue-200 ring-2 ring-blue-400 font-bold";
                else btnClass += "border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800";
            }
            return <button key={i} disabled={showAns || isSubmitting} onClick={() => handleSelectOption(letter)} className={btnClass}>{opt}</button>
          })}
        </div>

        {showAns && (
            <div className="p-6 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-700/80 mb-6 rounded-xl text-gray-900 dark:text-gray-100 text-base shadow-inner whitespace-pre-wrap antialiased leading-relaxed">
                <span className="font-black text-amber-800 dark:text-amber-400 block mb-3 text-lg border-b border-amber-200 dark:border-amber-800 pb-2">💡 Giải thích chi tiết (Đáp án đúng: {q.answer})</span>
                <div className="font-medium space-y-4">
                  <div className="text-gray-800 dark:text-gray-200">{q.exp_vi || "Chưa có nội dung dịch giải thích tiếng Việt."}</div>
                </div>
            </div>
        )}

        <div className="flex justify-between mt-6 pt-6 border-t-2 border-gray-200 dark:border-gray-800">
          <button onClick={() => setShowAns(!showAns)} disabled={isSubmitting} className="bg-purple-100 text-purple-800 border-2 border-purple-400 px-6 py-3 rounded-xl font-bold text-base hover:bg-purple-200 transition shadow">
            {showAns ? '🙈 Ẩn đáp án' : '👀 Nhìn trộm đáp án'}
          </button>
          <button onClick={handleNext} disabled={isSubmitting} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-lg hover:bg-blue-700 transition shadow-lg flex items-center gap-2">
            {isSubmitting ? "⏳ Đang nộp bài..." : (idx === questions.length - 1 ? "Hoàn thành bài thi ✅" : "Câu Tiếp Theo ➔")}
          </button>
        </div>
      </div>
    </div>
  );
}