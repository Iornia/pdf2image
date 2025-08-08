# PDF → JPG 線上轉檔（純前端，GitHub Pages）

這是一個只用瀏覽器就能把 PDF 轉成 JPG 的小工具。所有轉換都在用戶端完成，**不會上傳檔案**。

## 本地開發
```bash
npm install
npm run dev
```

## 建置
```bash
npm run build
```

產出會在 `dist/`。

## 部署到 GitHub Pages（推薦：自動部署）

1. 新建一個 GitHub repo（例如 `pdf-to-jpg`）。
2. **編輯 `vite.config.js`**，把 `base: '/REPO_NAME/'` 改成你的 repo 名稱，例如：
   ```js
   base: '/pdf-to-jpg/'
   ```
3. 把專案推上 GitHub：
   ```bash
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/<你的帳號>/<你的repo>.git
   git push -u origin main
   ```
4. 這個專案已附好 GitHub Actions workflow：`.github/workflows/deploy.yml`
   - 進到 GitHub Repo → Settings → Pages
   - Source 選擇 **GitHub Actions**
   - 之後每次 push 到 `main`，都會自動 build & 發佈到 Pages。

完成後網址會是：`https://<你的帳號>.github.io/<你的repo>/`

## 其他
- 如需輸出 PNG 或 WebP，可改 `App.jsx` 內 `toBlob(..., 'image/jpeg', quality)` 與 `toDataURL(...)` 的格式。
- 若要支援非常大的 PDF 或批次轉檔，建議改為後端服務（Poppler / ImageMagick）。
