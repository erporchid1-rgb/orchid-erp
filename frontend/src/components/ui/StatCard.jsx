import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', trend, trendValue, onClick }) => {
  const colorMap = {
    blue: { bg: 'bg-blue-50', icon: 'bg-blue-600', text: 'text-blue-600' },
    green: { bg: 'bg-green-50', icon: 'bg-green-600', text: 'text-green-600' },
    amber: { bg: 'bg-amber-50', icon: 'bg-amber-500', text: 'text-amber-600' },
    red: { bg: 'bg-red-50', icon: 'bg-red-600', text: 'text-red-600' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-600', text: 'text-purple-600' },
    indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-600', text: 'text-indigo-600' },
  }
  const c = colorMap[color] || colorMap.blue

  return (
    <div
      className={`stat-card ${onClick ? 'cursor-pointer hover:shadow-card-hover' : ''} transition-shadow`}
      onClick={onClick}
    >
      <div className={`w-12 h-12 rounded-xl ${c.icon} flex items-center justify-center shrink-0`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        {trendValue !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
            {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : <Minus size={12} />}
            {trendValue}
          </div>
        )}
      </div>
    </div>
  )
}

export default StatCard
