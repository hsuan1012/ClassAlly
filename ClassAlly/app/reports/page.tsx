'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area
} from 'recharts';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Loader2, MessageSquare, User, ArrowRight, Search, 
  Calendar, Activity, Sparkles, FileSpreadsheet, BrainCircuit, Lightbulb, Wand2 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- 1. 型別定義 ---
interface ChatMessage {
  id: string; isUser: boolean; content: string; timestamp: string;
}

interface LearningAnalytics {
  id: string; student_id: string; lesson_id: string;
  time_spent_seconds: number; accuracy_rate: number;
  wrong_types: string[]; ai_interaction_count: number;
  ai_chat_history: ChatMessage[]; created_at: string;
}

// --- 2. Styles Injection (保持新野獸派風格) ---
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .neo-bg-pattern { background-color: #fcfcfc; background-image: radial-gradient(#000 1px, transparent 1px); background-size: 24px 24px; }
    .neo-container { border: 3px solid #000; background: #fff; box-shadow: 6px 6px 0px 0px #000; border-radius: 8px; }
    .neo-input { border: 2px solid #000; background: #fff; box-shadow: 3px 3px 0px 0px rgba(0,0,0,0.1); transition: all 0.2s; border-radius: 6px; }
    .neo-input:focus { box-shadow: 4px 4px 0px 0px #000; outline: none; transform: translate(-1px, -1px); }
    .neo-btn { border: 2px solid #000; box-shadow: 4px 4px 0px 0px #000; font-weight: 700; transition: all 0.1s; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
    .neo-btn:hover { transform: translate(-1px, -1px); box-shadow: 5px 5px 0px 0px #000; }
    .neo-btn:active { transform: translate(2px, 2px); box-shadow: 0px 0px 0px 0px #000; }
    .neo-excel-btn { background-color: #6ee7b7; color: #000; border: 2px solid #000; border-radius: 8px; box-shadow: 4px 4px 0px 0px #000; font-weight: 800; font-size: 0.875rem; padding: 0 1.25rem; height: 2.5rem; display: flex; align-items: center; gap: 0.5rem; transition: all 0.1s; }
    .neo-scrollbar::-webkit-scrollbar { height: 12px; width: 12px; background: #fff; border: 2px solid #000; }
    .neo-scrollbar::-webkit-scrollbar-thumb { background-color: #000; border: 2px solid #fff; border-radius: 99px; }
  `;
  document.head.appendChild(style);
}

// --- 3. 主頁面組件 ---
export default function ReportsPage() {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [analytics, setAnalytics] = useState<LearningAnalytics[]>([]);
  const [lessonsMap, setLessonsMap] = useState<Record<string, string>>({}); 
  const [totalLessonsCount, setTotalLessonsCount] = useState(0); 
  const [loading, setLoading] = useState(false);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentChatHistory, setCurrentChatHistory] = useState<ChatMessage[]>([]);
  const [currentLessonName, setCurrentLessonName] = useState("");

  const [aiAdvice, setAiAdvice] = useState<string>("");
  const [isAdviceLoading, setIsAdviceLoading] = useState(false);

  useEffect(() => {
    const initPage = async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        const client = typeof supabase === 'function' ? supabase() : supabase;
        const { data: lessonsData } = await client.from('lessons').select('id, title');
        if (lessonsData) {
          const lMap: Record<string, string> = {};
          lessonsData.forEach((l: any) => lMap[l.id] = l.title);
          setLessonsMap(lMap);
          setTotalLessonsCount(lessonsData.length);
        }
        const { data: studentData } = await client.from('learning_analytics').select('student_id').order('student_id');
        if (studentData && studentData.length > 0) {
          const uniqueIds = Array.from(new Set(studentData.map(d => String(d.student_id))));
          setStudents(uniqueIds.map(id => ({ id: String(id), name: String(id) })));
        }
      } catch (error) { console.error('Error:', error); }
    };
    initPage();
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;
    const fetchAnalytics = async () => {
      setLoading(true);
      setAiAdvice(""); 
      try {
        const { supabase } = await import('../../lib/supabase');
        const client = typeof supabase === 'function' ? supabase() : supabase;
        const { data } = await client.from('learning_analytics').select('*').eq('student_id', selectedStudent).order('created_at', { ascending: true });
        if (data) setAnalytics(data as LearningAnalytics[]);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchAnalytics();
  }, [selectedStudent]);

  // 🌟 修改點：將原本寫死的邏輯換成真實呼叫 Gemini API
  const handleGenerateAdvice = async () => {
    if (!selectedStudent || analytics.length === 0) return;
    
    setIsAdviceLoading(true);
    setAiAdvice(""); 

    try {
      // 1. 萃取與計算數據 (保留原本精確的計算方式)
      const avgAccuracy = analytics.reduce((acc, cur) => acc + (cur.accuracy_rate || 0), 0) / analytics.length * 100;
      
      let totalAI = 0;
      analytics.forEach((item, idx) => {
        const prevCount = idx > 0 ? analytics[idx - 1].ai_interaction_count || 0 : 0;
        const currentCount = item.ai_interaction_count || 0;
        let rawAddedCount = currentCount - prevCount;
        let realInteractionCount = Math.floor(rawAddedCount / 2);
        
        if (realInteractionCount < 0) {
          realInteractionCount = (item.ai_chat_history || []).filter(msg => msg.isUser).length;
        }
        totalAI += realInteractionCount;
      });
      
      const latestAccMap = new Map();
      analytics.forEach(item => {
        const acc = item.accuracy_rate || 0;
        const percentage = acc <= 1 ? acc * 100 : acc;
        latestAccMap.set(item.lesson_id, percentage);
      });

      const strugglingLessons: string[] = [];
      latestAccMap.forEach((percentage, lessonId) => {
        if (percentage < 35 && lessonsMap[lessonId]) {
          strugglingLessons.push(lessonsMap[lessonId]);
        }
      });

      let validCompletedCount = 0;
      latestAccMap.forEach((_, lessonId) => {
        if (lessonsMap[lessonId]) {
          validCompletedCount++;
        }
      });
      const compRate = totalLessonsCount > 0 ? (validCompletedCount / totalLessonsCount) * 100 : 0;

      // 2. 構建專屬於該學生的 Prompt
      const strugglingText = strugglingLessons.length > 0 
        ? strugglingLessons.join('、') 
        : '無明顯落後科目 (皆表現優異)';

      const prompt = `
        你是一位專業的資訊課教師顧問。請根據以下「單一學生」的 Excel 學習數據，撰寫一份簡潔、專業的 Markdown 格式教學診斷報告。

        ⚠️【重要格式規定】：
        請直接從「#### 1️⃣ 學習現況分析」開始輸出，絕對不要加上「學生學號/姓名」、「日期」、「前言」等開頭，也不要產生任何佔位符號。
        
        【學生學習數據】：
        - 學生學號/姓名：${selectedStudent}
        - 課程完成率：${compRate.toFixed(1)}% (${validCompletedCount} / ${totalLessonsCount} 單元)
        - 平均正確率：${avgAccuracy.toFixed(1)}%
        - 向 AI 助教求助總次數：${totalAI} 次
        - 表現最弱（答錯較多次）的單元：${strugglingText}

        【請嚴格依照以下三個標題輸出報告】：
        #### 1️⃣ 學習現況分析
        (根據該生的完成率與平均正確率，給予整體的學習狀態評價)
        #### 2️⃣ AI 助教互動狀態
        (分析該生求助次數與學習成效的關聯，判斷是過度依賴 AI 還是善用工具，並給出建議)
        #### 3️⃣ 教師下一步行動建議
        (針對該生卡關的單元給予老師具體的輔導建議；若無卡關則給予進階挑戰的建議)
      `;

      // 3. 呼叫後端 API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '呼叫 API 發生錯誤');
      }

      // 4. 將回傳的真實診斷結果更新到畫面上
      setAiAdvice(data.text);

    } catch (error: any) {
      console.error("生成報告失敗:", error);
      setAiAdvice(`❌ 報告生成發生錯誤：${error.message} \n請稍後再試。`);
    } finally {
      setIsAdviceLoading(false);
    }
  };

  // 1. 建立一個 Map，利用 lesson_id 作為 Key。
  const latestAnalyticsMap = new Map<string, LearningAnalytics>();
  analytics.forEach(item => {
    latestAnalyticsMap.set(item.lesson_id, item);
  });

  // 2. 轉換為圖表格式，同時加入「過濾未知課程」的邏輯
  const barChartData = Array.from(latestAnalyticsMap.values())
    .filter(item => lessonsMap[item.lesson_id])
    .map(item => ({
      name: lessonsMap[item.lesson_id],
      minutes: Number((item.time_spent_seconds / 60).toFixed(1)),
      accuracy: (item.accuracy_rate || 0) * 100 
    }));

  const timelineDataMap = new Map<string, { date: string, totalMinutes: number, lessons: string[] }>();
  analytics.forEach(item => {
    const date = new Date(item.created_at).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
    const mins = Number((item.time_spent_seconds / 60).toFixed(1));
    if (timelineDataMap.has(date)) {
      const existing = timelineDataMap.get(date)!;
      existing.totalMinutes = Number((existing.totalMinutes + mins).toFixed(1));
      const lessonTitle = lessonsMap[item.lesson_id] || "未知課程";
      if (!existing.lessons.includes(lessonTitle)) existing.lessons.push(lessonTitle);
    } else {
      timelineDataMap.set(date, { date, totalMinutes: mins, lessons: [lessonsMap[item.lesson_id] || "未知課程"] });
    }
  });
  const timelineData = Array.from(timelineDataMap.values());

  const formatDurationSimple = (totalS: number) => {
    if (totalS <= 0) return "0s";
    const h = Math.floor(totalS / 3600);
    const m = Math.floor((totalS % 3600) / 60);
    const s = totalS % 60;
    return `${h > 0 ? h + 'h' : ''}${m > 0 ? m + 'm' : ''}${s}s`;
  };

  const totalSeconds = analytics.reduce((acc, cur) => acc + (cur.time_spent_seconds || 0), 0);
  const completionRate = totalLessonsCount > 0 ? (barChartData.length / totalLessonsCount) * 100 : 0;

  const exportToExcel = () => {
    if (!selectedStudent || analytics.length === 0) return;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(barChartData.map(item => ({ "課程": item.name, "時間(分)": item.minutes })));
    XLSX.utils.book_append_sheet(wb, ws, "學習報告");
    XLSX.writeFile(wb, `${selectedStudent}_Report.xlsx`);
  };

  if (loading && analytics.length === 0) {
    return <div className="flex h-screen items-center justify-center neo-bg-pattern"><Loader2 className="animate-spin h-12 w-12 text-black" /></div>;
  }

  return (
    <div className="w-full space-y-10 p-6 md:p-10 neo-bg-pattern min-h-screen text-slate-900">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-2 border-black pb-6 bg-white p-6 neo-container">
        <h1 className="text-3xl font-black text-black tracking-tight flex items-center gap-2">
          <Activity className="h-8 w-8 text-black" />
          <span className="bg-yellow-300 px-2 border-2 border-black shadow-[4px_4px_0px_0px_#000] -rotate-1">
            {selectedStudent ? `${selectedStudent} 的報告` : '請選擇學生'}
          </span>
        </h1>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black font-bold" />
            <input type="text" placeholder="搜尋學號..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="neo-input pl-10 pr-4 py-2 w-full md:w-64 text-sm font-bold" />
          </div>
          <div className="neo-input px-3 py-2 bg-white flex-grow md:flex-grow-0">
            <select value={selectedStudent || ''} onChange={(e) => setSelectedStudent(e.target.value)} className="bg-transparent text-sm font-bold focus:outline-none w-full">
              <option value="" disabled>選擇學生...</option>
              {students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <Button onClick={exportToExcel} className="neo-excel-btn">
             <FileSpreadsheet className="w-4 h-4" /> 匯出至 EXCEL
          </Button>
        </div>
      </div>

      {!selectedStudent ? (
        <div className="flex flex-col items-center justify-center py-40">
           <div className="neo-container p-10 bg-white text-center animate-bounce">
              <Search className="h-16 w-16 mx-auto mb-4 text-black" />
              <p className="text-xl font-black text-black uppercase">請在上方選擇學生以查看數據</p>
           </div>
        </div>
      ) : (
        <>
          {/* AI 智慧建議 */}
          <div className="neo-container bg-blue-50 p-6 relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-black p-2 rounded-lg text-white shadow-[3px_3px_0px_0px_#3b82f6]"><BrainCircuit className="h-6 w-6" /></div>
                <div>
                  <h2 className="text-xl font-black uppercase text-black">AI 智慧教學洞察：個別學生</h2>
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-tighter">由 Gemini 即時診斷單一學生學習成效</p>
                </div>
              </div>
              <Button onClick={handleGenerateAdvice} disabled={isAdviceLoading} className="neo-btn bg-black text-white px-6 py-2 flex items-center gap-2">
                {isAdviceLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                {aiAdvice ? '重新生成建議' : '開始 AI 智慧診斷'}
              </Button>
            </div>
            {aiAdvice ? (
              <div className="bg-white border-2 border-black p-6 rounded-xl shadow-[4px_4px_0px_0px_#000] animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="prose prose-sm max-w-none text-black">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiAdvice}</ReactMarkdown>
                </div>
              </div>
            ) : isAdviceLoading ? (
              <div className="bg-white border-2 border-black p-12 rounded-xl text-center">
                <p className="text-sm font-black uppercase animate-pulse">Gemini 正在深入分析該學生的學習行為...</p>
              </div>
            ) : (
              <div className="bg-white/50 border-2 border-black border-dashed p-10 rounded-xl text-center">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                <p className="text-sm font-bold text-gray-500 italic">點擊按鈕，讓系統為該生提供個性化教學建議...</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <SummaryBox label="總學習時間" value={formatDurationSimple(totalSeconds)} sub={`累計：${barChartData.length} 單元`} color="bg-purple-200" icon={<Activity className="h-6 w-6" />} />
            <SummaryBox label="完成率" value={`${completionRate.toFixed(1)}%`} sub={`${barChartData.length} / ${totalLessonsCount}`} color="bg-blue-200" icon={<Sparkles className="h-6 w-6" />} />
            <SummaryBox label="最近活動" value={analytics.length > 0 ? new Date(analytics[analytics.length-1].created_at).toLocaleDateString() : 'N/A'} sub="學習活動記錄" color="bg-yellow-200" icon={<Calendar className="h-6 w-6" />} />
          </div>

          {/* 第二層：歷程流程圖 */}
          <div className="neo-container bg-white p-6 overflow-hidden">
             <div className="flex items-center gap-2 mb-6 border-b-2 border-black pb-2">
                <h2 className="text-xl font-black uppercase">學習歷程路徑</h2>
             </div>
             
             <div className="flex items-start gap-8 overflow-x-auto pb-6 px-2 neo-scrollbar">
              {analytics.map((item, idx) => {
                
                // 🛡️ 安全防呆處理：正確率
                const acc = item.accuracy_rate || 0;
                const displayAcc = acc <= 1 ? (acc * 100).toFixed(0) : acc.toFixed(0);

                // 1. 先算出這單元新增了幾筆對話紀錄 (扣除前一關的累加)
                const prevCount = idx > 0 ? analytics[idx - 1].ai_interaction_count || 0 : 0;
                const currentCount = item.ai_interaction_count || 0;
                let rawAddedCount = currentCount - prevCount;
                
                // 2. 🌟 關鍵修正：除以 2，還原成「真正的提問次數」
                let realInteractionCount = Math.floor(rawAddedCount / 2);
                
                // 3. 終極防呆：如果減出來變負數，直接去數聊天室陣列裡有幾句「學生的話」
                if (realInteractionCount < 0) {
                  realInteractionCount = (item.ai_chat_history || []).filter(msg => msg.isUser).length;
                }

                return (
                  <div key={idx} className="flex items-center gap-4 shrink-0 group">
                    <div className="flex flex-col gap-3 items-center w-64">
                      
                      <div className="w-full py-1 bg-black text-white text-center text-xs font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]">
                         {formatDurationSimple(item.time_spent_seconds)}
                      </div>
                      
                      <div className="w-full p-4 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] rounded-lg text-center min-h-[100px] flex flex-col justify-center transition-transform group-hover:-translate-y-1 group-hover:shadow-[6px_6px_0px_0px_#000]">
                        <div className="font-black text-lg text-black border-b-2 border-black/10 pb-1 mb-1">單元 {idx + 1}</div>
                        <div className="text-sm font-bold text-gray-700 leading-tight">{lessonsMap[item.lesson_id] || "單元任務"}</div>
                      </div>

                      <div className="w-full py-1 bg-green-200 border-2 border-black text-center font-black text-black text-sm shadow-[2px_2px_0px_0px_#000]">
                         正確率：{displayAcc}%
                      </div>

                      <button 
                        onClick={() => { setCurrentChatHistory(item.ai_chat_history || []); setCurrentLessonName(lessonsMap[item.lesson_id] || "未知課程"); setIsChatOpen(true); }}
                        className="w-full py-2 bg-yellow-300 hover:bg-yellow-400 border-2 border-black text-black text-xs font-bold shadow-[2px_2px_0px_0px_#000] active:translate-y-[2px] active:shadow-none transition-all"
                      >
                        <MessageSquare className="w-3 h-3 inline mr-1" />
                        詢問 AI 次數 ({realInteractionCount})
                      </button>
                      
                    </div>
                    {idx < analytics.length - 1 && <div className="h-1 w-8 bg-black"></div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 🌟 修改點：移除 lg:grid-cols-2，改為全畫幅垂直排列 */}
          <div className="grid grid-cols-1 gap-8">
            <div className="neo-container p-6 bg-white h-[400px]"> {/* 可適度增加高度讓圖表更美觀 */}
              <h2 className="text-lg font-black mb-4 border-b-2 border-black inline-block uppercase">課程時間分佈</h2>
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{fontSize: 10, fontWeight: 'bold'}} 
                    interval={0} // 🌟 解決你提到的名稱有時會消失的問題
                  />
                  <YAxis />
                  <Tooltip contentStyle={{ border: '2px solid #000' }} />
                  <Bar dataKey="minutes" radius={[4, 4, 0, 0]} barSize={60} stroke="#000" strokeWidth={2}>
                    {barChartData.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? '#a78bfa' : '#c4b5fd'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="neo-container p-6 bg-white h-[400px]">
              <h2 className="text-lg font-black mb-4 border-b-2 border-black inline-block uppercase">活動時間軸</h2>
              <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis />
                  <Tooltip content={<CustomTimelineTooltip />} />
                  <Area type="monotone" dataKey="totalMinutes" stroke="#000" strokeWidth={3} fill="#3b82f6" fillOpacity={0.2} dot={{ r: 4, fill: '#000' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* AI 對話彈窗 */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden border-3 border-black shadow-[8px_8px_0px_0px_#000]">
          
          {/* 🌟 核心修正：這段隱藏的 Header 是消除錯誤的唯一解 */}
          <DialogHeader className="sr-only">
            <DialogTitle>對話紀錄回放</DialogTitle>
            <DialogDescription>顯示學生與 AI 助教的歷史對話內容</DialogDescription>
          </DialogHeader>

          {/* 你原本亮眼的黃色 Header 設計 (保留不變) */}
          <div className="bg-yellow-300 border-b-2 border-black p-4 flex justify-between items-center shrink-0">
            <h2 className="text-lg font-black text-black uppercase flex items-center gap-2">
              <MessageSquare className="fill-black h-5 w-5" /> 
              對話紀錄回放
            </h2>
          </div>

          {/* 對話內容區域 */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6 neo-bg-pattern neo-scrollbar">
            {currentChatHistory.length > 0 ? (
              currentChatHistory.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.isUser ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] font-black uppercase mb-1 px-2 bg-white border border-black inline-block shadow-[2px_2px_0px_0px_#000]">
                    {msg.isUser ? 'Student' : 'AI Tutor'}
                  </span>
                  <div className={`max-w-[85%] p-3 border-2 border-black shadow-[4px_4px_0px_0px_#000] text-sm font-medium ${msg.isUser ? 'bg-blue-200' : 'bg-white'}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 font-bold italic">
                此單元無 AI 互動紀錄
              </div>
            )}
          </div>

          <div className="bg-white p-4 border-t-2 border-black shrink-0">
            <Button 
              onClick={() => setIsChatOpen(false)} 
              className="neo-btn bg-red-400 hover:bg-red-500 text-black w-full"
            >
              關閉視窗 CLOSE
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- 4. 輔助子組件 (必須在 ReportsPage 之外) ---

function SummaryBox({ label, value, sub, color, icon }: { label: string; value: string; sub?: string, color: string, icon: React.ReactNode }) {
  return (
    <div className={`neo-container p-6 relative overflow-hidden ${color}`}>
      <div className="flex justify-between items-start mb-2">
         <div className="text-xs font-black uppercase tracking-wider border-b-2 border-black pb-1">{label}</div>
         <div className="opacity-30">{icon}</div>
      </div>
      <div className="text-4xl font-black text-black mb-2 tracking-tighter">{value}</div>
      {sub && <div className="text-[10px] font-bold bg-white/50 inline-block px-2 py-1 border border-black rounded-sm">{sub}</div>}
    </div>
  );
}

const CustomTimelineTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_#000]">
        <p className="text-sm font-black text-black mb-2 border-b-2 border-black pb-1">{data.date} 紀錄</p>
        <div className="space-y-1">
          {data.lessons.map((l: string, i: number) => <div key={i} className="text-xs">• {l}</div>)}
          <div className="mt-2 pt-1 border-t border-black/10 text-xs font-black">總計：{data.totalMinutes} 分鐘</div>
        </div>
      </div>
    );
  }
  return null;
};