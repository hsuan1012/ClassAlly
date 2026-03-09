import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// 🌟 修正點 1：變數名稱改為 NEXT_PUBLIC_GEMINI_API_KEY，與你的 .env 完全對齊
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY as string);

export async function POST(req: Request) {
  try {
    // 1. 接收前端傳來的資料
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: '請提供提示詞 (prompt)' }, { status: 400 });
    }

    // 2. 指定使用的模型 (gemini-2.5-flash 是目前速度與成本最平衡的主力模型)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // 3. 呼叫 Gemini 產生內容
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // 4. 將結果回傳給前端
    return NextResponse.json({ text: responseText });

  } catch (error: any) {
    console.error('Gemini API Error:', error);
    
    // 🌟 修正點 2：把真正的錯誤原因 (error.message) 傳到前端，以後就算壞掉也能秒懂原因
    return NextResponse.json(
      { error: error.message || '生成回覆時發生錯誤，請稍後再試。' },
      { status: 500 }
    );
  }
}