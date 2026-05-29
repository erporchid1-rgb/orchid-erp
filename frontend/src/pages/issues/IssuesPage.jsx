import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { issuesService } from '../../services'
import DataTable from '../../components/ui/DataTable'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import FilterBar, { FilterSelect } from '../../components/ui/FilterBar'
import { formatDate, getStatusBadge } from '../../utils/helpers'
import { Plus, ArrowDownToLine, CheckCircle, XCircle, Eye } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' }, { value: 'ISSUED', label: 'Issued' },
  { value: 'APPROVED', label: 'Approved' }, { value: 'REJECTED', label: 'Rejected' },
]

const IssuesPage = () => {
  const { canApprove } = useAuth()
  const [data, setData] = useState({ issues: [], total: 0, page: 1 })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '' })
  const [actionItem, setActionItem] = useState(null)
  const [actionType, setActionType] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await issuesService.getAll({ page, limit: 20, ...filters })
      setData({ issues: res.data.data, total: res.data.pagination.total, page })
    } catch { toast.error('Failed to load issues') }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { fetchData(1) }, [filters])

  const handleApprove = async () => {
    setSaving(true)
    try {
      await issuesService.approve(actionItem.id)
      toast.success('Issue approved — stock deducted')
      setActionItem(null)
      fetchData(data.page)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleReject = async () => {
    setSaving(true)
    try {
      await issuesService.reject(actionItem.id, 'Rejected by manager')
      toast.success('Issue rejected')
      setActionItem(null)
      fetchData(data.page)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const columns = [
    { header: 'Issue No.', key: 'issueNumber', render: (v) => <span className="font-mono text-sm font-medium">{v}</span> },
    { header: 'Project/Site', key: 'project', render: (v, row) => <div><p className="text-xs font-medium">{v?.projectName || '—'}</p><p className="text-xs text-gray-500">{row.site?.siteName || ''}</p></div> },
    { header: 'Issued To', key: 'issuedTo', render: (v) => <span className="font-medium">{v}</span> },
    { header: 'Issued By', key: 'issuedBy', render: (v) => v?.name || '—' },
    { header: 'Date', key: 'issueDate', render: (v) => formatDate(v) },
    { header: 'Items', key: 'items', render: (v) => <span className="badge-blue">{v?.length || 0}</span> },
    { header: 'Status', key: 'status', render: (v) => <span className={getStatusBadge(v)}>{v}</span> },
    {
      header: 'Actions', key: 'id', render: (_, row) => (
        <div className="flex items-center gap-1">
          {canApprove() && row.status === 'PENDING' && (
            <>
              <button onClick={() => { setActionItem(row); setActionType('approve') }} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50" title="Approve"><CheckCircle size={15} /></button>
              <button onClick={() => { setActionItem(row); setActionType('reject') }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" title="Reject"><XCircle size={15} /></button>
            </>
          )}
        </div>
      )
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><ArrowDownToLine size={24} /> Material Issues</h1>
          <p className="page-subtitle">Track material issued to sites and engineers</p>
        </div>
        <Link to="/issues/new" className="btn-primary"><Plus size={16} /> New Issue</Link>
      </div>

      <FilterBar filters={filters} onClear={() => setFilters({ status: '' })}>
        <FilterSelect label="Status" value={filters.status} onChange={(v) => setFilters({ status: v })} options={STATUS_OPTIONS} />
      </FilterBar>

      <DataTable columns={columns} data={data.issues} total={data.total} page={data.page} loading={loading}
        onPageChange={(p) => fetchData(p)} />

      <ConfirmDialog
        isOpen={!!actionItem && actionType === 'approve'}
        onClose={() => setActionItem(null)}
        onConfirm={handleApprove}
        loading={saving}
        title="Approve Issue"
        message={`Approve issue "${actionItem?.issueNumber}"? Stock will be deducted from inventory.`}
        variant="primary"
      />
      <ConfirmDialog
        isOpen={!!actionItem && actionType === 'reject'}
        onClose={() => setActionItem(null)}
        onConfirm={handleReject}
        loading={saving}
        title="Reject Issue"
        message={`Reject issue "${actionItem?.issueNumber}"?`}
      />
    </div>
  )
}

export default IssuesPage
