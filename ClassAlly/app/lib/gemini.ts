// lib/gemini.ts

// 這是為了讓 Vercel 點名時能找到這個功能，先給它一個空殼
export const generateDetailedLearningAnalysis = async (data: any) => {
  console.log("正在分析數據:", data);
  return "AI 分析報告產生中，請稍候...";
};

// 如果之後 quiz 功能也要搬回來，也可以順便補上這個
export const generateQuiz = async (data: any) => {
  console.log("正在產生測驗:", data);
  return [];
};