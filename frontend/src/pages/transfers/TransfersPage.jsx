import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { transfersService } from '../../services'
import DataTable from '../../components/ui/DataTable'
import { formatDate, getStatusBadge } from '../../utils/helpers'
import { Plus, ArrowRightLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const TransfersPage = () => {
  const { isStoreManager } = useAuth()
  const [data, setData] = useState({ transfers: [], total: 0, page: 1 })
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await transfersService.getAll({ page, limit: 20 })
      setData({ transfers: res.data.data, total: res.data.pagination.total, page })
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData(1) }, [])

  const columns = [
    { header: 'Transfer No.', key: 'transferNumber', render: (v) => <span className="font-mono font-medium">{v}</span> },
    { header: 'From', key: 'fromSite', render: (v, row) => <div><p className="text-xs font-medium">{v?.siteName || row.fromProject?.projectName || '—'}</p></div> },
    { header: 'To', key: 'toSite', render: (v, row) => <div><p className="text-xs font-medium">{v?.siteName || row.toProject?.projectName || '—'}</p></div> },
    { header: 'Date', key: 'transferDate', render: (v) => formatDate(v) },
    { header: 'Items', key: 'items', render: (v) => <span className="badge-blue">{v?.length || 0}</span> },
    { header: 'By', key: 'createdBy', render: (v) => v?.name || '—' },
    { header: 'Status', key: 'status', render: (v) => <span className={getStatusBadge(v)}>{v}</span> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><ArrowRightLeft size={24} /> Stock Transfers</h1>
          <p className="page-subtitle">Transfer materials between sites and projects</p>
        </div>
        {isStoreManager() && <Link to="/transfers/new" className="btn-primary"><Plus size={16} /> New Transfer</Link>}
      </div>

      <DataTable columns={columns} data={data.transfers} total={data.total} page={data.page} loading={loading}
        onPageChange={(p) => fetchData(p)} />
    </div>
  )
}

export default TransfersPage
