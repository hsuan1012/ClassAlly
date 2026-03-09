// app/lib/gemini.ts

// 1. 讀取金鑰 (從環境變數抓取)
const apiKey = (process.env.NEXT_PUBLIC_GEMINI_API_KEY || '').trim();

/**
 * 核心引擎：直接呼叫 Google Gemini 2.0 Flash API
 */
export async function getChatResponse(prompt: string) {
  if (!apiKey) throw new Error("缺少 API Key，請檢查 Vercel 環境變數設定");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Google API 拒絕原因:", data);
      throw new Error(data.error?.message || "API 請求失敗");
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error: any) {
    console.error('Gemini 呼叫失敗:', error);
    throw error;
  }
}

/**
 * 2. 學習分析功能 (讓 Vercel 點名通過)
 */
export const generateDetailedLearningAnalysis = async (data: any) => {
  // 這裡你可以選擇回傳空殼，或是直接調用上面的真引擎
  console.log("正在進行真 AI 分析...", data);
  const prompt = `請分析以下學生的學習數據並提供建議：${JSON.stringify(data)}`;
  return await getChatResponse(prompt); 
};

/**
 * 3. 測驗產生功能 (讓 Vercel 點名通過)
 */
export const generateQuiz = async (data: any) => {
  console.log("正在準備產生測驗...");
  // 目前先回傳空陣列，確保不報錯，以後可以接 getChatResponse
  return [];
};