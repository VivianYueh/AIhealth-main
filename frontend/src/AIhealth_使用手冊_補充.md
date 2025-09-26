---

## 8. 專案程式架構與說明


### 8.1 主要目錄結構與說明

```
frontend/src/
├── App.jsx, App.css           # 應用主架構、全域樣式
├── main.jsx                   # React 應用啟動點
├── api.js                     # 與 Firebase 互動的 API（帳號、表單、任務、檔案上傳等）
├── firebase/
│   └── config.js              # Firebase 設定與初始化
├── components/                # 共用 React 元件（如表單、圖表、導覽列等）
│   ├── NavBar.jsx             # 導覽列
│   ├── Footer.jsx             # 頁尾
│   └── ...
├── pages/                     # 各角色主要頁面
│   ├── Patient.jsx            # 病患端主頁（任務、表單、影音上傳）
│   ├── Doctor.jsx             # 醫師端主頁（任務、表單派發、審核）
│   ├── Therapist.jsx          # 治療師端主頁（任務、表單、異常通報）
│   ├── HospitalAdmin.jsx      # 醫院管理員（帳號、表單管理）
│   ├── SystemAdmin.jsx        # 系統管理員（帳號管理）
│   ├── ...                    # 其他如 Family, Caregiver, Register, Login 等
├── hooks/                     # React 自訂 hooks
│   ├── useAnimatedNumber.js   # 數字動畫效果
│   └── useScrollSpy.js        # 捲動偵測
├── locales/                   # 多語系翻譯檔
│   ├── zh/translation.json    # 中文
│   ├── en/translation.json    # 英文
│   └── ...
├── utils/                     # 工具函式
│   └── setData.jsx            # 資料處理輔助
└── assets/                    # 靜態資源（圖片、SVG等）
```

### 8.2 主要程式檔案與資料夾解釋

- `App.jsx`：
	- 設定全域路由（react-router-dom），根據登入狀態與角色導向不同頁面。
	- 載入全域樣式、i18n（多語系）、主題等。

- `main.jsx`：
	- React 應用進入點，將 App 元件掛載到 DOM。

- `api.js`：
	- 封裝所有與 Firebase 的互動（Firestore 資料存取、Storage 檔案上傳、Auth 註冊/刪除/登入、加解密等）。
	- 主要函式：register、deleteUser、getFormsByCreatorRole、uploadMedia、decryptIdentity、hashIdentity ...

- `firebase/config.js`：
	- 設定 Firebase 專案金鑰、初始化 app，供全站 API 使用。

- `components/`：
	- 放置可重複使用的 UI 元件，如導覽列、頁尾、輪播、圖表、Modal、表單欄位等。

- `pages/`：
	- 每個角色一個主頁（如 Patient.jsx、Doctor.jsx ...），負責該角色所有主要功能與 UI。
	- 例如 Patient.jsx 會顯示病患收到的任務、表單、上傳影音，Doctor.jsx 可派發/審核表單。

- `hooks/`：
	- 放置自訂 React hooks，提升元件重用性與狀態管理便利性。

- `locales/`：
	- 多語系翻譯檔，結構為語言資料夾/translation.json。
	- 介面所有文字皆可國際化。

- `utils/`：
	- 放置輔助函式，如資料格式轉換、欄位驗證等。

- `assets/`：
	- 放置圖片、SVG、影片等靜態資源。

---

## 9. 環境安裝與執行

### 9.1 安裝 Node.js 與 npm
請先安裝 [Node.js LTS 版本](https://nodejs.org/zh-tw/download/)。安裝後於終端機輸入：
```
node -v
npm -v
```
確認版本號顯示。

### 9.2 安裝專案依賴
於 `frontend` 目錄下執行：
```
npm install
```

### 9.3 設定 Firebase
- 請於 `src/firebase/config.js` 填入專案對應的 Firebase 設定。
- 需於 Firebase 控制台建立 Authentication、Firestore、Storage。

### 9.4 啟動前端開發伺服器
於 `frontend` 目錄下執行：
```
npm run dev
```
預設會於 http://localhost:5173 開啟。

### 9.5 打包正式版
```
npm run build
```
產生的靜態檔案於 `dist/` 目錄。

---

## 10. 其他注意事項
- 請確保 `.env` 或 `firebase/config.js` 機密資訊勿外流。
- 若遇到安裝、啟動錯誤，請檢查 Node.js 版本與依賴安裝狀態。
- 若需後端 API 或權限設定，請聯絡專案管理員。

---

> 本手冊包含程式結構、安裝與執行說明，請依照步驟操作。
