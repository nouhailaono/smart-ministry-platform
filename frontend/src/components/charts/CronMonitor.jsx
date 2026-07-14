// components/finance/CronMonitor.jsx
import { useEffect, useState } from 'react';
import { FiRefreshCw, FiCheckCircle, FiAlertCircle, FiClock } from 'react-icons/fi';

export default function CronMonitor({ budgets, onAlert, autoCreateBudget }) {
  const [lastCheck, setLastCheck] = useState(null);
  const [monitoring, setMonitoring] = useState(true);
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState({ total: 0, critical: 0, warning: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      checkBudgets();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [budgets]);

  const checkBudgets = async () => {
    setLastCheck(new Date());
    
    // Analyze budgets
    const critical = budgets.filter(b => {
      const percent = b.totalBudget > 0 ? (b.spent / b.totalBudget) * 100 : 0;
      return percent >= 100;
    });

    const warnings = budgets.filter(b => {
      const percent = b.totalBudget > 0 ? (b.spent / b.totalBudget) * 100 : 0;
      return percent >= 80 && percent < 100;
    });

    setStats({
      total: budgets.length,
      critical: critical.length,
      warning: warnings.length,
    });

    // Generate alerts for critical issues
    critical.forEach(b => {
      const percent = b.totalBudget > 0 ? (b.spent / b.totalBudget) * 100 : 0;
      onAlert(
        `🚨 ${b.Project?.title || 'Project'}: Budget overspent by ${(percent - 100).toFixed(1)}%`,
        'error'
      );
    });

    // Generate warnings
    warnings.forEach(b => {
      const percent = b.totalBudget > 0 ? (b.spent / b.totalBudget) * 100 : 0;
      onAlert(
        `⚠️ ${b.Project?.title || 'Project'}: Budget at ${percent.toFixed(1)}% usage`,
        'warning'
      );
    });

    setIssues([...critical, ...warnings]);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FiRefreshCw className={`text-emerald-600 ${monitoring ? 'animate-spin' : ''}`} />
          <h3 className="font-black flex items-center gap-2">
            <FiClock /> Cron Monitoring
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            Last check: {lastCheck ? lastCheck.toLocaleTimeString() : 'Never'}
          </span>
          <span className={`w-2 h-2 rounded-full ${monitoring ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium">
            {monitoring ? 'Active' : 'Stopped'}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="p-3 bg-slate-50 rounded-xl">
          <p className="text-sm text-slate-500">Total Budgets</p>
          <p className="text-xl font-black">{stats.total}</p>
        </div>
        <div className="p-3 bg-green-50 rounded-xl">
          <p className="text-sm text-slate-500">Healthy</p>
          <p className="text-xl font-black text-green-600">
            {stats.total - stats.critical - stats.warning}
          </p>
        </div>
        <div className="p-3 bg-yellow-50 rounded-xl">
          <p className="text-sm text-slate-500">Warnings</p>
          <p className="text-xl font-black text-yellow-600">{stats.warning}</p>
        </div>
        <div className="p-3 bg-red-50 rounded-xl">
          <p className="text-sm text-slate-500">Critical</p>
          <p className="text-xl font-black text-red-600">{stats.critical}</p>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
          <p className="text-sm font-medium text-yellow-800 flex items-center gap-2">
            <FiAlertCircle /> Issues Detected
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {issues.slice(0, 5).map((issue, index) => (
              <span 
                key={index} 
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  issue.spent > issue.totalBudget 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {issue.Project?.title || 'Project'} 
                ({issue.totalBudget > 0 ? ((issue.spent/issue.totalBudget)*100).toFixed(0) : 0}%)
              </span>
            ))}
            {issues.length > 5 && (
              <span className="px-3 py-1 bg-slate-100 rounded-full text-xs">
                +{issues.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <span>Auto-budget creation: {autoCreateBudget ? 'Enabled' : 'Disabled'}</span>
        <span>Monitoring interval: 60s</span>
      </div>
    </div>
  );
}