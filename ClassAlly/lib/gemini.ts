// src/lib/gemini.ts

// 1. 讀取金鑰
const apiKey = (process.env.NEXT_PUBLIC_GEMINI_API_KEY || '').trim();

export async function getChatResponse(prompt: string) {
  if (!apiKey) throw new Error("缺少 API Key，請檢查 .env.local");

  // 🚀 世紀大破案：Google 已經淘汰舊模型！
  // 對於新金鑰，我們必須使用最新的「gemini-2.0-flash」
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const data = await response.json();

    // 如果 Google 回傳錯誤，直接把真實原因印出來
    if (!response.ok) {
      console.error("Google API 原始拒絕原因:", data);
      throw new Error(data.error?.message || "API 請求失敗");
    }

    // 成功！解析回傳的文字
    const text = data.candidates[0].content.parts[0].text;
    return text;

  } catch (error: any) {
    console.error('Gemini 直接呼叫錯誤:', error);
    throw error;
  }
}