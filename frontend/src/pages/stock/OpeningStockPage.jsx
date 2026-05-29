import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { stockService, projectsService, sitesService, materialsService } from '../../services'
import { ArrowLeft, PackagePlus, Save, Upload, Download, CheckCircle, XCircle, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

const OpeningStockPage = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [projects, setProjects] = useState([])
  const [sites, setSites] = useState([])
  const [materials, setMaterials] = useState([])
  const [projectId, setProjectId] = useState('')
  const [siteId, setSiteId] = useState('')
  const [entries, setEntries] = useState({})  // { materialId: { quantity, rate } }
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [importResult, setImportResult] = useState(null)

  useEffect(() => {
    Promise.all([
      projectsService.getAll({ limit: 100 }),
      materialsService.getAll({ limit: 500 }),
    ]).then(([p, m]) => {
      setProjects(p.data.data || [])
      setMaterials(m.data.data || [])
    })
  }, [])

  useEffect(() => {
    if (projectId) {
      sitesService.getByProject(projectId).then(({ data }) => {
        setSites(data.data || [])
        setSiteId('')
      })
    } else {
      setSites([])
      setSiteId('')
    }
  }, [projectId])

  const handleChange = (materialId, field, value) => {
    setEntries((prev) => ({
      ...prev,
      [materialId]: { ...prev[materialId], [field]: value },
    }))
  }

  const filteredMaterials = materials.filter((m) =>
    m.materialName.toLowerCase().includes(search.toLowerCase()) ||
    m.category?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const filledCount = Object.values(entries).filter((e) => parseFloat(e?.quantity) > 0).length

  // ── Download Template ────────────────────────────────────
  const downloadTemplate = () => {
    const rows = [
      ['Material Name', 'Unit', 'Quantity', 'Rate (per unit)'],
      ...materials.map((m) => [m.materialName, m.unit, '', '']),
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 35 }, { wch: 10 }, { wch: 12 }, { wch: 16 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Opening Stock')
    XLSX.writeFile(wb, 'Opening_Stock_Template.xlsx')
    toast.success('Template downloaded')
  }

  // ── Parse uploaded CSV / Excel ───────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        if (rows.length < 2) return toast.error('File is empty or has no data rows')

        // Find header row
        let headerIdx = rows.findIndex((r) =>
          r.some((c) => String(c).toLowerCase().includes('material'))
        )
        if (headerIdx === -1) headerIdx = 0
        const headers = rows[headerIdx].map((h) => String(h).toLowerCase().trim())

        const nameCol = headers.findIndex((h) => h.includes('material'))
        const qtyCol  = headers.findIndex((h) => h.includes('qty') || h.includes('quantity'))
        const rateCol = headers.findIndex((h) => h.includes('rate') || h.includes('price'))

        if (nameCol === -1 || qtyCol === -1) {
          return toast.error('File must have "Material Name" and "Quantity" columns')
        }

        const dataRows = rows.slice(headerIdx + 1).filter((r) => r[nameCol])

        let matched = 0
        const unmatched = []
        const newEntries = { ...entries }

        dataRows.forEach((row) => {
          const name = String(row[nameCol]).trim().toLowerCase()
          const qty  = parseFloat(row[qtyCol])
          const rate = rateCol !== -1 ? parseFloat(row[rateCol]) || 0 : 0

          const mat = materials.find((m) => m.materialName.toLowerCase() === name)
          if (mat && qty > 0) {
            newEntries[mat.id] = { quantity: qty, rate }
            matched++
          } else if (!mat) {
            unmatched.push(String(row[nameCol]).trim())
          }
        })

        setEntries(newEntries)
        setImportResult({ matched, unmatched })

        if (matched > 0) toast.success(`${matched} material(s) imported from file`)
        if (unmatched.length > 0) toast.error(`${unmatched.length} material(s) not found in system`)
      } catch {
        toast.error('Failed to read file. Use the downloaded template.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!projectId && !siteId) return toast.error('Select at least a project or site')
    const items = Object.entries(entries)
      .filter(([, v]) => parseFloat(v?.quantity) > 0)
      .map(([materialId, v]) => ({
        materialId,
        quantity: parseFloat(v.quantity),
        rate: parseFloat(v.rate) || 0,
      }))

    if (items.length === 0) return toast.error('Enter quantity for at least one material')

    setSaving(true)
    try {
      const res = await stockService.addOpeningStock({ projectId: projectId || null, siteId: siteId || null, items })
      toast.success(`Opening stock set for ${res.data.data.count} material(s)`)
      navigate('/stock')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save opening stock')
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-5xl">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
            <ArrowLeft size={15} /> Back
          </button>
          <h1 className="page-title flex items-center gap-2">
            <PackagePlus size={24} /> Opening Stock Entry
          </h1>
          <p className="page-subtitle">
            Enter the current stock you already have on hand before starting transactions
          </p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving || filledCount === 0}
          className="btn-primary btn-lg"
        >
          <Save size={16} />
          {saving ? 'Saving...' : `Save Opening Stock (${filledCount} items)`}
        </button>
      </div>

      {/* Info Banner */}
      <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <strong>One-time setup:</strong> Enter the physical stock you currently have. Leave quantity blank (or 0) for materials you don't have. Rate is used for stock valuation.
      </div>

      {/* Location Select */}
      <div className="card mb-5">
        <div className="card-header"><h3 className="font-semibold text-gray-800">Select Location</h3></div>
        <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">Project *</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input">
              <option value="">Select project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Site / Block (optional)</label>
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="input" disabled={!projectId}>
              <option value="">All sites / Project level</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.siteName}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Import Card */}
      <div className="card mb-5">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-green-600" />
            <h3 className="font-semibold text-gray-800">Bulk Import via CSV / Excel</h3>
          </div>
        </div>
        <div className="card-body">
          <p className="text-sm text-gray-500 mb-4">
            Download the template → fill Quantity &amp; Rate for each material → upload the file. Material names must match exactly.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={downloadTemplate} className="btn-outline flex items-center gap-2">
              <Download size={15} />
              Download Template (.xlsx)
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="btn-primary flex items-center gap-2">
              <Upload size={15} />
              Upload File (.xlsx / .csv)
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* Import Result */}
          {importResult && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                <CheckCircle size={15} />
                {importResult.matched} material(s) matched and filled from file
              </div>
              {importResult.unmatched.length > 0 && (
                <div className="text-sm text-red-600">
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <XCircle size={15} />
                    {importResult.unmatched.length} not found — add them in Material Master first:
                  </div>
                  <div className="text-xs text-gray-500 ml-5">{importResult.unmatched.join(', ')}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Materials Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-800">
            Materials &nbsp;
            <span className="text-sm font-normal text-gray-400">({filledCount} filled)</span>
          </h3>
          <input
            type="text"
            placeholder="Search material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input py-1.5 w-52"
          />
        </div>
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Min Stock</th>
                <th className="w-36">Current Qty on Hand</th>
                <th className="w-36">Rate (₹) per Unit</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredMaterials.map((mat) => {
                const entry = entries[mat.id] || {}
                const hasQty = parseFloat(entry.quantity) > 0
                return (
                  <tr key={mat.id} className={hasQty ? 'bg-green-50' : 'hover:bg-gray-50'}>
                    <td className="font-medium">{mat.materialName}</td>
                    <td className="text-gray-500">{mat.category?.name}</td>
                    <td><span className="badge badge-gray">{mat.unit}</span></td>
                    <td className="text-gray-500">{mat.minimumStock} {mat.unit}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        placeholder="0"
                        value={entry.quantity || ''}
                        onChange={(e) => handleChange(mat.id, 'quantity', e.target.value)}
                        className={`input py-1.5 text-right font-semibold ${hasQty ? 'border-green-400 focus:ring-green-400' : ''}`}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={entry.rate || ''}
                        onChange={(e) => handleChange(mat.id, 'rate', e.target.value)}
                        className="input py-1.5 text-right"
                        disabled={!hasQty}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filledCount > 0 && (
          <div className="p-4 border-t bg-green-50 flex items-center justify-between">
            <p className="text-sm text-green-700 font-medium">
              {filledCount} material{filledCount !== 1 ? 's' : ''} with opening stock ready to save
            </p>
            <button onClick={handleSubmit} disabled={saving} className="btn-success flex items-center gap-2">
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Opening Stock'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default OpeningStockPage
