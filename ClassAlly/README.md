# Excel AI Ally：管理端與學習歷程分析平台 (Admin Dashboard)

這是 Excel AI Ally 的核心管理後台，專門為教師與系統管理員設計。透過本平台，可以即時監控學生的學習動態、設計彈性的課程模組，並透過分析 AI 互動數據來優化教學內容。

## 核心管理功能

- **學習歷程數據追蹤**
  - 即時看板：動態監控全體學生的闖關進度、作答成功率與平均停留時間，掌握即時教學現況。
  - 群體分析：自動彙整全班錯誤分佈與常見邏輯斷點，為教師提供補救教學與課程優化的數據決策支援。
  - 個體分析：視覺化單一學生的學習軌跡與 AI 互動歷程，精確診斷個人學習瓶頸與知識誤區。
- **課程管理與設計**
  - 模組化設計：可自由編輯關卡內容、教學文本與練習題。
  - 進度門檻設定：自定義關卡難度。
- **AI 互動監控系統**
  - 內容審查：完整記錄學生與 AI 助教的問答對話，分析學生的提問習慣。
  - 次數與效率統計：追蹤 AI 助教的調用頻率，評估「鷹架」介入的時機與成效。

## 技術

- **框架：** Next.js (App Router), React
- **資料庫：** Supabase (PostgreSQL / Real-time Database)
- **分析工具：** Recharts
- **AI 串接：** Google Gemini API

## 檔案結構 



```text
ClassAlly/
├── app/                # Next.js App Router 路由 (包含管理端頁面與學習路徑)
│   ├── admin/
│   │   ├── dashboard/  # 核心數據概覽看板
│   │   ├── students/   # 學生名單與個人歷程分析
│   │   ├── courses/    # 課程內容編輯器
│   │   └── ai-logs/    # AI 互動紀錄查詢
├── components/         # 專案核心 UI 組件
│   ├── charts/         # 數據視覺化圖表 (使用 Recharts)
│   ├── editor/         # 課程編輯器相關元件
│   └── tables/         # 高階數據過濾與顯示表格
├── contexts/           # React 全域狀態管理 (管理權限與學習狀態)
├── hooks/              # 自定義 React Hooks 
├── lib/                # 核心服務整合 (Gemini API 串接、Supabase 管理端 API)
├── types/              # 數據 Schema 與權限型別定義
└── utils/              # 數據演算與格式化工具函式
```

## 💻 本地端運行指南

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