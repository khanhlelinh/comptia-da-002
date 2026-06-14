'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const DOMAINS = [
  "Data concepts and environments",
  "Data acquisition and preparation",
  "Data analysis",
  "Visualization and reporting",
  "Data governance"
];

export default function ExamSetup() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [timePerQ, setTimePerQ] = useState(60);
  const [isDark, setIsDark] = useState(true); // Mặc định là Tối
  
  const [domainConfig, setDomainConfig] = useState<Record<string, number>>({});
  const [domainMax, setDomainMax] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  // --- LOGIC ĐỒNG BỘ DARK MODE ---
  useEffect(() => {
    // Khi trang vừa load, đọc trạng thái cũ từ localStorage
    const savedTheme = localStorage.getItem('theme');
    const isDarkMode = savedTheme !== 'light'; 
    setIsDark(isDarkMode);
    
    // Ép class CSS ngay lập tức để đồng bộ
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark'); // Lưu lại lựa chọn
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };
  // ---------------------------------

  useEffect(() => {
    fetch('/api/questions')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const counts: Record<string, number> = {};
          DOMAINS.forEach(d => counts[d] = 0);
          data.data.forEach((q: any) => { if (q.domain && counts[q.domain] !== undefined) counts[q.domain]++; });
          setDomainMax(counts);

          const savedConfigStr = localStorage.getItem('examConfig');
          let savedDomainConfig: Record<string, number> = {};
          if (savedConfigStr) {
            try {
              const parsed = JSON.parse(savedConfigStr);
              if (parsed.nickname) setNickname(parsed.nickname);
              if (parsed.timePerQ) setTimePerQ(parsed.timePerQ);
              if (parsed.domainConfig) savedDomainConfig = parsed.domainConfig;
            } catch (e) { console.error(e); }
          }

          const initialConfig: Record<string, number> = {};
          DOMAINS.forEach(d => {
            const savedVal = savedDomainConfig[d];
            const desiredVal = savedVal !== undefined ? savedVal : 5; 
            initialConfig[d] = Math.min(desiredVal, counts[d] || 0);
          });
          setDomainConfig(initialConfig);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleStart = () => {
    if (!nickname.trim()) return alert('Vui lòng nhập Nickname!');
    const totalQuestions = Object.values(domainConfig).reduce((a, b) => a + b, 0);
    if (totalQuestions === 0) return alert('Vui lòng chọn ít nhất 1 câu hỏi để thi!');
    localStorage.setItem('examConfig', JSON.stringify({ nickname, timePerQ, domainConfig }));
    router.push('/exam/play');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 
      transition-colors duration-300 flex items-center justify-center p-6 w-full">
      
      <div className="absolute top-6 right-6">
        {/* Nút gọi hàm toggleTheme mới */}
        <button 
          onClick={toggleTheme} 
          className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 rounded-full font-bold shadow-md hover:scale-105 transition"
        >
          {isDark ? '☀️ Chế độ Sáng' : '🌙 Chế độ Tối'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-extrabold mb-8 text-center text-blue-600 dark:text-blue-400">🎓 Cấu hình bài thi</h1>
        
        <label className="block mb-2 font-bold text-gray-800 dark:text-gray-200">Nickname của bạn:</label>
        <input className="w-full border-2 border-gray-400 dark:border-gray-600 p-3 rounded-lg mb-6 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-medium placeholder-gray-500 dark:placeholder-gray-400" placeholder="Ví dụ: hoangnd..." value={nickname} onChange={(e) => setNickname(e.target.value)} />
        
        <label className="block mb-2 font-bold text-gray-800 dark:text-gray-200">Thời gian mỗi câu: <span className="text-red-600 dark:text-red-400">{timePerQ}s</span></label>
        <input type="range" min="10" max="120" step="10" value={timePerQ} onChange={(e) => setTimePerQ(Number(e.target.value))} className="w-full mb-8 accent-blue-600 cursor-pointer" />

        <div className="mb-4">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white border-b-2 border-gray-200 dark:border-gray-700 pb-2 mb-6">Số lượng câu hỏi theo chủ đề (Kéo thanh trượt):</h3>
          {isLoading ? (
            <div className="text-center text-gray-500 dark:text-gray-400 font-medium py-4">Đang tải dữ liệu câu hỏi từ Database...</div>
          ) : (
            DOMAINS.map(d => (
              <div key={d} className="flex justify-between items-center mb-5 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-2/5 pr-4 leading-tight">{d}</span>
                <input type="range" min="0" max={domainMax[d] || 0} value={domainConfig[d] || 0} onChange={(e) => setDomainConfig({...domainConfig, [d]: Number(e.target.value)})} className="w-2/5 accent-blue-600 cursor-pointer" disabled={(domainMax[d] || 0) === 0} />
                <div className="w-1/5 text-right">
                  <span className="font-extrabold text-blue-600 dark:text-blue-400 text-lg">{domainConfig[d] || 0}</span>
                  <span className="text-gray-500 dark:text-gray-400 font-medium text-sm"> / {domainMax[d] || 0}</span>
                </div>
              </div>
            ))
          )}
        </div>
        
        <button onClick={handleStart} className="w-full bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-xl mt-4 font-extrabold text-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition shadow-lg">BẮT ĐẦU THI 🚀</button>
      </div>
    </div>
  );
}