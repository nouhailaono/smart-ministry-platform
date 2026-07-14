// components/finance/ProgressBar.jsx
export default function ProgressBar({ value, max, showLabel = true }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isOverspent = value > max;

  return (
    <div className="w-full">
      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${
            isOverspent ? 'bg-red-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs mt-1">
          <span className="text-slate-500">0</span>
          <span className={isOverspent ? 'text-red-600 font-medium' : 'text-emerald-600'}>
            {percentage.toFixed(0)}%
          </span>
          <span className="text-slate-500">{max}</span>
        </div>
      )}
    </div>
  );
}