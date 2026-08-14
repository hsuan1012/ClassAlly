# ClassAlly：管理端與學習歷程分析平台

《ClassAlly》是專為《Excel AI Ally》數位遊戲化學習系統打造的核心管理後台，主要服務對象為教師與系統管理員。本平台不僅能即時追蹤學生的學習動態、彈性設計課程模組，更結合 AI 智慧診斷技術，深度分析學生的操作紀錄與對話文本，為動態調整教學策略與個人化學習輔導提供精準的數據支持。

## 核心管理功能

- **學習歷程數據追蹤**
  - 即時看板：動態監控學生的闖關進度、作答成功率與平均停留時間，掌握即時教學現況。
  - 群體分析：自動彙整全班錯誤分佈與常見邏輯斷點，為教師提供補救教學與課程優化的數據決策支援。
  - 個體分析：視覺化單一學生的學習軌跡與 AI 互動歷程，精確診斷個人學習瓶頸與知識誤區。
  - AI 智慧診斷：精準輔助教師動態調整教學策略與提供個人化輔助
- **課程管理與設計**
  - 模組化設計：可自由編輯關卡內容、教學文本與練習題。
  - 進度門檻設定：自定義關卡難度。
- **AI 互動監控系統**
  - 內容審查：完整記錄學生與 AI 學習助教的問答對話，分析學生的提問習慣。
  - 次數與效率統計：追蹤 AI 學習助教的調用頻率，評估「鷹架」介入的時機與成效。

## 系統畫面

| 登入頁面 | 課程管理 |
| :---: | :---: |
| <img src="https://github.com/user-attachments/assets/597b70e4-7c7d-4acc-b3d9-2200903182aa" width="400" alt="登入頁面" /><br><hr>在這裡輸入登入頁面的說明文字 | <img src="https://github.com/user-attachments/assets/085d776e-421d-4416-9a8f-05d90931c439" width="400" alt="課程管理" /><br><hr>在這裡輸入課程管理的說明文字 |
| 整合遊戲化獎勵機制 | Excel 操作介面轉化為可互動的點選區塊 |

| 群體分析 | 個體分析 |
| :---: | :---: |
| <img src="https://github.com/user-attachments/assets/668b7f6b-8327-4bff-9186-d15973244974" width="400" alt="群體分析" /><br><hr>在這裡輸入群體分析的說明文字 | <img src="https://github.com/user-attachments/assets/f4fd47e7-51df-409d-9e2c-eb7a8ad344c6" width="400" alt="個體分析" /><br><hr>在這裡輸入個體分析的說明文字 |
| 整合遊戲化獎勵機制 | Excel 操作介面轉化為可互動的點選區塊 |

## 技術

- **執行環境：** Node.js
- **資料庫：** Supabase 
- **分析工具：** Recharts
- **AI 串接：** Google Gemini API
- **部署平台：** Vercel

## 檔案結構 



```text
ClassAlly/
├── src/app/            # Next.js App Router 路由 
├── app/                
├── components/         # 專案核心 UI 組件 
├── contexts/           # React 全域狀態管理 
├── docs/               # 專案相關開發文件、研究論文與說明文件
├── hooks/              # 自定義 React Hooks 
├── lib/                # 核心服務整合 (Gemini API 串接、Supabase 管理端 API)
├── types/              # 數據 Schema 與 TypeScript 型別定義
├── utils/              # 數據演算與格式化工具函式
├── public/             # 靜態資源檔案 
└── scripts/            # 自動化腳本或數據處理工具
```

## 本地端運行指南

### 1. 複製專案
```bash
git clone [https://github.com/hsuan1012/excel-ai-ally-admin.git](https://github.com/hsuan1012/excel-ai-ally-admin.git)
cd excel-ai-ally-admin
```

### 2. 安裝依賴套件
```bash
npm install
```

### 3. 環境變數設定
請在 `.env.local` 中配置具備 Service Role 或 Admin 權限的 Key，以確保能讀取完整學習數據。

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_admin_key
```

### 4. 啟動伺服器
```bash
npm run dev
```
