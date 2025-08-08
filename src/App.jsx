import React, { useEffect, useRef, useState, useCallback } from 'react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

function parsePageSpec(spec, pageCount) {
  if (!spec || spec.trim() === '') return Array.from({ length: pageCount }, (_, i) => i + 1)
  const wanted = new Set()
  for (const part of spec.split(',')) {
    const p = part.trim()
    if (!p) continue
    if (p.includes('-')) {
      const [a, b] = p.split('-').map(x => parseInt(x.trim(), 10))
      const start = Math.max(1, Math.min(a, b))
      const end = Math.min(pageCount, Math.max(a, b))
      for (let i = start; i <= end; i++) wanted.add(i)
    } else {
      const n = parseInt(p, 10)
      if (n >= 1 && n <= pageCount) wanted.add(n)
    }
  }
  return [...wanted].sort((x, y) => x - y)
}

export default function App() {
  const [file, setFile] = useState(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [scale, setScale] = useState(2)
  const [quality, setQuality] = useState(0.92)
  const [pageSpec, setPageSpec] = useState('')
  const [bg, setBg] = useState('#ffffff')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')

  const fileInputRef = useRef(null)

  const reset = () => {
    setFile(null); setPdfDoc(null); setPageCount(0); setPreview(''); setError(''); setProgress(0); setBusy(false)
  }

  const handleFileObj = async (f) => {
    reset()
    if (!f || !f.name.toLowerCase().endsWith('.pdf')) { setError('請選擇 PDF 檔案'); return }
    setFile(f)
    try {
      const data = new Uint8Array(await f.arrayBuffer())
      const doc = await pdfjsLib.getDocument({ data }).promise
      setPdfDoc(doc)
      setPageCount(doc.numPages)
    } catch (e) {
      console.error(e)
      setError('無法讀取 PDF，請確認檔案是否損壞')
    }
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    const f = e.dataTransfer?.files?.[0]
    if (f) handleFileObj(f)
  }, [])

  const onFilePick = (e) => {
    const f = e.target.files?.[0]
    if (f) handleFileObj(f)
  }

  useEffect(() => {
    const renderPreview = async () => {
      if (!pdfDoc) return
      try {
        const page = await pdfDoc.getPage(1)
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        await page.render({ canvasContext: ctx, viewport }).promise
        setPreview(canvas.toDataURL('image/jpeg', quality))
      } catch (e) {
        console.error(e); setError('預覽失敗')
      }
    }
    renderPreview()
  }, [pdfDoc, scale, quality, bg])

  const convertAll = async () => {
    if (!pdfDoc) return
    setBusy(true); setProgress(0); setError('')
    try {
      const pages = parsePageSpec(pageSpec, pageCount)
      const zip = new JSZip()
      const baseName = (file?.name || 'document.pdf').replace(/\.pdf$/i, '')
      for (let i = 0; i < pages.length; i++) {
        const pNum = pages[i]
        const page = await pdfDoc.getPage(pNum)
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        await page.render({ canvasContext: ctx, viewport }).promise
        const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
        const buf = await blob.arrayBuffer()
        zip.file(`${baseName}_p${String(pNum).padStart(3,'0')}.jpg`, buf)
        setProgress(Math.round(((i + 1) / pages.length) * 100))
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      saveAs(zipBlob, `${baseName}_jpg.zip`)
    } catch (e) {
      console.error(e); setError('轉檔時發生錯誤')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container">
      <h1>PDF → JPG 線上轉檔</h1>
      <p className="caption">私密、免安裝、轉檔全在你的瀏覽器完成（不上傳檔案）。</p>

      <div className="card">
        <div
          className="drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept="application/pdf" hidden onChange={onFilePick} />
          {file ? <div>已選擇：{file.name}</div> : <div>拖曳 PDF 到此，或點擊選擇檔案</div>}
        </div>

        <div className="controls">
          <div>
            <label>解析度倍率（清晰度） {scale.toFixed(2)}×</label>
            <input type="range" min="0.75" max="4" step="0.25" value={scale}
              onChange={(e)=>setScale(parseFloat(e.target.value))} />
          </div>
          <div>
            <label>JPG 品質 {Math.round(quality*100)}%</label>
            <input type="range" min="0.5" max="1" step="0.01" value={quality}
              onChange={(e)=>setQuality(parseFloat(e.target.value))} />
          </div>
          <div>
            <label>頁碼（留空=全部，如 1,3,5-8）</label>
            <input type="text" placeholder="例如：1-3, 5, 8" value={pageSpec} onChange={(e)=>setPageSpec(e.target.value)} />
          </div>
          <div>
            <label>背景色（避免透明→黑底）</label>
            <input type="color" value={bg} onChange={(e)=>setBg(e.target.value)} />
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:16}}>
          <button className="btn secondary" onClick={reset} disabled={!file || busy}>清除</button>
          <button className="btn" onClick={convertAll} disabled={!pdfDoc || busy}>{busy ? '轉換中…' : '轉換並下載 ZIP'}</button>
        </div>

        {busy && (
          <div style={{marginTop:12}}>
            <div className="progress"><div className="bar" style={{width:`${progress}%`}}/></div>
            <div className="hint" style={{textAlign:'right'}}>{progress}%</div>
          </div>
        )}

        {error && <div className="hint" style={{color:'#ff8a8a', marginTop:8}}>{error}</div>}
      </div>

      <div className="row" style={{marginTop:16}}>
        <div className="card">
          <div className="hint">預覽（第 1 頁）</div>
          {preview ? <img className="preview" src={preview} alt="preview" /> : <div className="hint">尚未選擇 PDF 或正在載入…</div>}
        </div>
        <div className="card">
          <h3 style={{marginTop:0}}>小提示</h3>
          <ul className="hint">
            <li>轉檔全在本機完成，檔案不會上傳到伺服器。</li>
            <li>倍率越高越清晰但更耗時；一般 2×～3× 足夠。</li>
            <li>若 PDF 有透明背景，建議設定白色或自訂背景色避免黑底。</li>
            <li>大量頁面或超高解析度會比較久，請耐心等候。</li>
            <li>想輸出 PNG？可把程式內 toDataURL('image/jpeg') 改成 'image/png'。</li>
          </ul>
        </div>
      </div>

      <footer>© {new Date().getFullYear()} PDF→JPG. Built with PDF.js（無伺服器上傳）。</footer>
    </div>
  )
}
