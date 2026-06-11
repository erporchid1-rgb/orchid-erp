import { useRef, useState, useEffect } from 'react'
import { X, PenLine, Upload, Trash2, Check } from 'lucide-react'

const SignatureModal = ({ open, title, onConfirm, onClose, loading }) => {
  const canvasRef  = useRef(null)
  const [tab, setTab]         = useState('draw')  // 'draw' | 'upload'
  const [drawing, setDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [uploadPreview, setUploadPreview] = useState(null)

  // Reset when opened
  useEffect(() => {
    if (open) {
      setTab('draw')
      setHasDrawn(false)
      setUploadPreview(null)
      setTimeout(() => clearCanvas(), 50)
    }
  }, [open])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  // Mouse events
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    }
  }

  const startDraw = (e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    setDrawing(true)
  }

  const draw = (e) => {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasDrawn(true)
  }

  const stopDraw = (e) => {
    e.preventDefault()
    setDrawing(false)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setUploadPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleConfirm = () => {
    let sigData = null
    if (tab === 'draw') {
      if (!hasDrawn) return
      sigData = canvasRef.current.toDataURL('image/png')
    } else {
      if (!uploadPreview) return
      sigData = uploadPreview
    }
    onConfirm(sigData)
  }

  const canSubmit = tab === 'draw' ? hasDrawn : !!uploadPreview

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <PenLine size={18} className="text-primary-700" />
            <p className="font-bold text-gray-800">{title || 'Sign NFA'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab('draw')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              tab === 'draw'
                ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <PenLine size={14} /> Draw Signature
          </button>
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              tab === 'upload'
                ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Upload size={14} /> Upload Image
          </button>
        </div>

        <div className="p-5">
          {/* Draw tab */}
          {tab === 'draw' && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Sign in the box below using your mouse or touchscreen</p>
              <div className="rounded-xl border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50 relative"
                style={{ cursor: 'crosshair' }}>
                <canvas
                  ref={canvasRef}
                  width={420}
                  height={160}
                  className="w-full block touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-gray-300 text-sm font-medium">Sign here...</p>
                  </div>
                )}
              </div>
              <button onClick={clearCanvas}
                className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors">
                <Trash2 size={12} /> Clear
              </button>
            </div>
          )}

          {/* Upload tab */}
          {tab === 'upload' && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Upload a signature image (PNG, JPG) or a scanned signed document</p>
              {uploadPreview ? (
                <div className="rounded-xl border-2 border-green-200 bg-green-50 p-3 text-center relative">
                  <img src={uploadPreview} alt="Signature" className="max-h-32 mx-auto object-contain" />
                  <button onClick={() => setUploadPreview(null)}
                    className="absolute top-2 right-2 p-1 rounded-lg bg-white shadow text-red-500 hover:bg-red-50">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 h-32 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
                  <Upload size={24} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">Click to upload signature image</p>
                  <p className="text-xs text-gray-300 mt-1">PNG, JPG, PDF scans accepted</p>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
                </label>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit || loading}
            className="flex-1 py-2.5 rounded-xl bg-primary-700 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Check size={14} /> Confirm Signature</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SignatureModal
