import React, { ReactNode, useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X, XCircle } from 'lucide-react';

type NotificationType = 'success' | 'info' | 'warning' | 'error';

interface NotificationProps {
  type: NotificationType;
  title?: string;
  message: string;
  icon?: ReactNode;
  duration?: number; // in ms, 0 = stay until closed
  floating?: boolean; // fixed position
  onClose?: () => void;
}

const Notification = ({
  type,
  title,
  message,
  icon,
  duration = 5000, // default 5 seconds
  floating = false,
  onClose
}: NotificationProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) setTimeout(onClose, 300); // Allow animation to complete
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) setTimeout(onClose, 300); // Allow animation to complete
  };

  if (!isVisible) return null;

  // Default icons based on type
  const defaultIcon = {
    success: <CheckCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />
  };

  const classes = [
    'notification',
    `notification-${type}`,
    floating ? 'notification-floating' : '',
  ].join(' ');

  return (
    <div className={classes}>
      <div className="notification-icon">
        {icon || defaultIcon[type]}
      </div>
      <div className="notification-content">
        {title && <div className="font-medium">{title}</div>}
        <div className="text-sm">{message}</div>
      </div>
      <div className="notification-close" onClick={handleClose}>
        <X className="w-4 h-4" />
      </div>
    </div>
  );
};

export default Notification;