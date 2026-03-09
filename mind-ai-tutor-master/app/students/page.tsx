'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PageHeader } from '@/components/layout/PageHeader';
import { StudentStats } from '@/components/students/StudentStats';
import { StudentFilters } from '@/components/students/StudentFilters';
import { StudentsTable } from '@/components/students/StudentsTable';
import { Button } from '@/components/ui/button';
// 👇 1. 新增 AI 功能需要的 Icon 與 Markdown 套件
import { Loader2, Sparkles, Users, FileSpreadsheet, BrainCircuit, Wand2, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import type { Student } from '../types/student';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useTranslation } from '@/utils/translations';

// ✅ 修正 SSR 樣式注入
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .neo-bg-pattern { background-color: #fcfcfc; background-image: radial-gradient(#000 1px, transparent 1px); background-size: 24px 24px; }
    .neo-container { border: 3px solid #000; background: #fff; box-shadow: 6px 6px 0px 0px #000; border-radius: 8px; }
    .neo-btn { border: 2px solid #000; box-shadow: 4px 4px 0px 0px #000; font-weight: 700; border-radius: 6px; text-transform: uppercase; }
  `;
  document.head.appendChild(style);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"all" | "active">("all");
  const { toast } = useToast();
  const { language } = useLanguage();
  const { t } = useTranslation(language);

  // 👇 2. 新增：控制全班 AI 報告的狀態
  const [classAiAdvice, setClassAiAdvice] = useState<string>("");
  const [isAdviceLoading, setIsAdviceLoading] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoading(true);
      try {
        const { count: totalLessonsCount } = await supabase.from('lessons').select('*', { count: 'exact', head: true });
        const totalLessons = totalLessonsCount || 30;
        
        const { data: studentList, error: studentError } = await supabase.from('students').select('*').order('last_active_at', { ascending: false });
        if (studentError) throw studentError;
        
        const { data: records, error: recordError } = await supabase.from('learning_records').select('student_id, lesson_id');
        if (recordError) throw recordError;

        const formattedStudents: Student[] = (studentList || []).map((s) => {
          const myRecords = records?.filter(r => r.student_id === s.student_id) || [];
          const lessonsCompleted = new Set(myRecords.map(r => r.lesson_id)).size;
          const progress = Math.round((lessonsCompleted / totalLessons) * 100);
          
          return {
            id: s.student_id,
            name: s.name || s.student_id,
            email: s.student_id, 
            enrolled: s.last_active_at || s.created_at || new Date().toISOString(),
            progress: progress,
            lessonsCompleted: lessonsCompleted,
            totalLessons: totalLessons,
            status: progress === 0 ? 'Not Started' : (progress >= 100 ? 'Completed' : 'In Progress'),
          };
        });
        setStudents(formattedStudents);
      } catch (error: any) {
        console.error(error);
        toast({ title: 'Error', description: '資料載入失敗', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudents();
  }, [toast]);

  // 👇 3. 新增：處理與 Gemini API 溝通的邏輯
  const handleGenerateClassAdvice = async () => {
    setIsAdviceLoading(true);
    setClassAiAdvice("");
    
    try {
      // 1. 抓取所有課程清單 (建立 Mapping)
      const { data: lessonsData } = await supabase.from('lessons').select('id, title');
      const lessonsMap: Record<string, string> = {};
      lessonsData?.forEach(l => { lessonsMap[l.id] = l.title; });

      // 2. 抓取全班的學習分析紀錄
      const { data: analyticsData } = await supabase.from('learning_analytics').select('lesson_id, accuracy_rate, ai_interaction_count');
      
      if (!analyticsData || analyticsData.length === 0) {
        setClassAiAdvice("目前全班尚未產生足夠的學習數據，無法進行分析。請等待學生進行挑戰題後再試。");
        setIsAdviceLoading(false);
        return;
      }

      // 3. 數據聚合 (依照課程分組計算平均正確率與總 AI 求助次數)
      const lessonStats: Record<string, { totalAcc: number; count: number; totalAI: number }> = {};
      
      analyticsData.forEach(record => {
        if (!lessonStats[record.lesson_id]) {
          lessonStats[record.lesson_id] = { totalAcc: 0, count: 0, totalAI: 0 };
        }
        const acc = record.accuracy_rate <= 1 ? record.accuracy_rate * 100 : record.accuracy_rate;
        lessonStats[record.lesson_id].totalAcc += acc;
        lessonStats[record.lesson_id].count += 1;
        lessonStats[record.lesson_id].totalAI += Math.max(0, Math.floor((record.ai_interaction_count || 0) / 2));
      });

      // 4. 找出「正確率最低的單元」與「AI求助最頻繁的單元」
      let lowestAccLesson = { id: "", avgAcc: 100 };
      let highestAILesson = { id: "", totalAI: -1 };

      Object.entries(lessonStats).forEach(([lessonId, stats]) => {
        const avgAcc = stats.totalAcc / stats.count;
        if (avgAcc < lowestAccLesson.avgAcc) {
          lowestAccLesson = { id: lessonId, avgAcc };
        }
        if (stats.totalAI > highestAILesson.totalAI) {
          highestAILesson = { id: lessonId, totalAI: stats.totalAI };
        }
      });

      const hardestLessonName = lessonsMap[lowestAccLesson.id] || "未知單元";
      const highestAILessonName = lessonsMap[highestAILesson.id] || "無求助紀錄";

      // 5. 計算全班平均進度
      const avgClassProgress = students.length > 0 
        ? students.reduce((acc, cur) => acc + (cur as any).progress, 0) / students.length 
        : 0;

      
      // 6. 準備給 Gemini 的 Prompt (加入嚴格的格式限制)
      const prompt = `
        你是一位專業的資訊課教師顧問。請根據以下「全班 Excel 學習數據」，撰寫一份簡潔、專業的 Markdown 格式教學診斷報告。
        
        ⚠️【重要格式規定】：
        請直接從「#### 1️⃣ 全班整體進度概述」開始輸出，絕對不要加上「顧問教師姓名」、「日期」、「前言」等開頭，也不要產生任何佔位符號。

        【全班數據】：
        - 全班平均進度：${avgClassProgress.toFixed(1)}%
        - 表現最弱的單元：${hardestLessonName} (平均正確率僅 ${lowestAccLesson.avgAcc.toFixed(1)}%)
        - 學生最常向 AI 求助的單元：${highestAILessonName} (共求助 ${highestAILesson.totalAI} 次)

        【請嚴格依照以下三個標題輸出報告】：
        #### 1️⃣ 全班整體進度概述
        (根據平均進度給予評價與建議)
        #### 2️⃣ 教材難易度警示
        (針對最弱單元分析是否太難，給予老師備課建議)
        #### 3️⃣ 學生求助熱區分析
        (分析最多人求助的單元，判斷 AI 是否有發揮作用，或是需要老師親自介入)
      `;


      // 7. 發送請求給自己寫的後端 API
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

      // 8. 將 Gemini 的回覆存入 State
      setClassAiAdvice(data.text);

    } catch (error) {
      console.error(error);
      setClassAiAdvice("❌ 產生報告時發生錯誤，請檢查 API 金鑰或網路連線狀態。");
    } finally {
      setIsAdviceLoading(false);
    }
  };

  const exportToExcel = () => {
    try {
      if (students.length === 0) return;
      const data = students.map(s => ({
        '姓名': s.name,      
        '學號': s.id,        
        '狀態': s.status,
        '進度': `${s.progress}%`
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
      XLSX.writeFile(workbook, "學生學習報表.xlsx");
      toast({ title: "匯出成功" });
    } catch (e) {
      toast({ title: "匯出失敗", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 neo-bg-pattern min-h-screen p-4 md:p-8">
      <PageHeader
        heading={t('students')}
        text={t('manage_students')}
        actions={
          <Button onClick={exportToExcel} className="neo-btn bg-green-400 text-black px-6 h-10 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {t('export_to_excel')}
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-20">
          <Loader2 className="animate-spin h-10 w-10 mb-4" />
          <p className="text-xl font-bold font-mono">LOADING...</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* 👇 4. 新增：全班 AI 智慧診斷卡片區塊 */}
          <div className="neo-container bg-[#F3E8FF] p-6 relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-600 p-2 rounded-lg text-white shadow-[3px_3px_0px_0px_#000]">
                  <BrainCircuit className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase text-black">AI 智慧教學洞察：整體學生</h2>
                  <p className="text-xs font-bold text-purple-800 uppercase tracking-tighter">由 Gemini 即時診斷難易度與學習熱點</p>
                </div>
              </div>
              <Button 
                onClick={handleGenerateClassAdvice} 
                disabled={isAdviceLoading} 
                className="neo-btn bg-black text-white px-6 py-2 flex items-center gap-2 hover:bg-gray-800"
              >
                {isAdviceLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Wand2 className="h-4 w-4 text-yellow-300" />}
                {classAiAdvice ? '重新生成洞察' : '掃描全班數據'}
              </Button>
            </div>

            {classAiAdvice ? (
              <div className="bg-white border-2 border-black p-6 rounded-xl shadow-[4px_4px_0px_0px_#000] animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="prose prose-sm max-w-none text-black">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{classAiAdvice}</ReactMarkdown>
                </div>
              </div>
            ) : isAdviceLoading ? (
              <div className="bg-white border-2 border-black p-12 rounded-xl text-center shadow-[4px_4px_0px_0px_#000]">
                <p className="text-sm font-black uppercase text-purple-700 animate-pulse">Gemini 正在分析全班數據，請稍候...</p>
              </div>
            ) : (
              <div className="bg-white/60 border-2 border-black border-dashed p-8 rounded-xl text-center">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <p className="text-sm font-bold text-gray-700">點擊按鈕，讓系統為您偵測全班共同的卡關痛點與教材難度回饋。</p>
              </div>
            )}
          </div>
          {/* 👆 AI 診斷卡片區塊結束 */}

          <section className="neo-container p-6 bg-yellow-50 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="h-32 w-32" /></div>
             <StudentStats students={students} />
          </section>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
               <div className="neo-container px-4 py-2 bg-white inline-block">
                 <StudentFilters selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
               </div>
               <div className="hidden md:flex items-center gap-2 font-bold text-sm bg-black text-white px-3 py-1 rounded-sm">
                 <Users className="h-4 w-4" /> TOTAL: {students.length}
               </div>
            </div>

            <div className="neo-container bg-white overflow-hidden p-1">
               <div className="h-3 w-full bg-black border-b-2 border-black mb-1"></div>
               <StudentsTable students={students} selectedTab={selectedTab} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}