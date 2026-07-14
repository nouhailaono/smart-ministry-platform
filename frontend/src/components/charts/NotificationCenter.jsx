// components/finance/NotificationCenter.jsx
import { FiBell, FiX, FiCheck, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

export default function NotificationCenter({ 
  notifications, 
  onMarkRead, 
  onClearAll,
  show,
  setShow 
}) {
  const unreadCount = notifications.filter(n => !n.read).length;

  const getTypeStyles = (type) => {
    switch(type) {
      case 'success': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'success': return <FiCheckCircle className="text-emerald-600" />;
      case 'error': return <FiAlertCircle className="text-red-600" />;
      case 'warning': return <FiAlertCircle className="text-yellow-600" />;
      default: return <FiBell className="text-blue-600" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShow(!show)}
        className="relative p-2 rounded-xl hover:bg-slate-100 transition"
      >
        <FiBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {show && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border z-50 max-h-[500px] flex flex-col">
          <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
            <h3 className="font-bold flex items-center gap-2">
              <FiBell /> Notifications
            </h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button 
                  onClick={() => notifications.filter(n => !n.read).forEach(n => onMarkRead(n.id))}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Mark all read
                </button>
              )}
              <button 
                onClick={onClearAll}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Clear all
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <FiBell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`p-4 border-b hover:bg-slate-50 transition cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => onMarkRead(notification.id)}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${getTypeStyles(notification.type)}`}>
                        {getIcon(notification.type)}
                        {notification.type.toUpperCase()}
                      </div>
                      <p className="text-sm mt-1">{notification.message}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {!notification.read && (
                      <FiCheck className="text-blue-600 w-4 h-4 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}