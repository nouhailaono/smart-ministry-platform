// components/finance/BudgetAlert.jsx
import { FiAlertTriangle, FiAlertCircle, FiInfo } from 'react-icons/fi';

export default function BudgetAlert({ alert }) {
  const getStyles = () => {
    switch(alert.severity) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800';
      case 'warning': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default: return 'bg-blue-100 border-blue-300 text-blue-800';
    }
  };

  const getIcon = () => {
    switch(alert.severity) {
      case 'critical': return <FiAlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" />;
      case 'warning': return <FiAlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" />;
      default: return <FiInfo className="text-blue-600 flex-shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className={`p-3 rounded-xl border flex items-start gap-3 ${getStyles()}`}>
      {getIcon()}
      <div className="flex-1">
        <p className="font-medium text-sm">{alert.projectName}</p>
        <p className="text-sm">{alert.message}</p>
        <p className="text-xs opacity-75 mt-0.5">
          {new Date(alert.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
}