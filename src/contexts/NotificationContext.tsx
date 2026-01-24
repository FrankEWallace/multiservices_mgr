import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

// Notification types
export type NotificationType = "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Generate unique ID
const generateId = () => `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Local storage key
const STORAGE_KEY = "meilleur_notifications";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    // Load from localStorage on init
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((n: Notification) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
      }
    } catch {
      console.warn("Failed to load notifications from storage");
    }
    return [];
  });

  // Save to localStorage when notifications change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {
      console.warn("Failed to save notifications to storage");
    }
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
      const newNotification: Notification = {
        ...notification,
        id: generateId(),
        timestamp: new Date(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep max 50 notifications

      // Show toast based on type
      const toastOptions = {
        description: notification.message,
        action: notification.action
          ? {
              label: notification.action.label,
              onClick: notification.action.onClick,
            }
          : undefined,
      };

      switch (notification.type) {
        case "success":
          toast.success(notification.title, toastOptions);
          break;
        case "error":
          toast.error(notification.title, toastOptions);
          break;
        case "warning":
          toast.warning(notification.title, toastOptions);
          break;
        default:
          toast.info(notification.title, toastOptions);
      }
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}

// Helper hook for common notification patterns
export function useNotificationActions() {
  const { addNotification } = useNotifications();

  return {
    notifySuccess: (title: string, message: string) =>
      addNotification({ type: "success", title, message }),

    notifyError: (title: string, message: string) =>
      addNotification({ type: "error", title, message }),

    notifyWarning: (title: string, message: string) =>
      addNotification({ type: "warning", title, message }),

    notifyInfo: (title: string, message: string) =>
      addNotification({ type: "info", title, message }),

    // Business-specific notifications
    notifyPaymentReceived: (amount: number, from: string) =>
      addNotification({
        type: "success",
        title: "Payment Received",
        message: `$${amount.toLocaleString()} received from ${from}`,
      }),

    notifyDebtOverdue: (debtor: string, amount: number) =>
      addNotification({
        type: "warning",
        title: "Debt Overdue",
        message: `${debtor} has an overdue balance of $${amount.toLocaleString()}`,
      }),

    notifyGoalAchieved: (goalTitle: string) =>
      addNotification({
        type: "success",
        title: "Goal Achieved!",
        message: `Congratulations! You've achieved: ${goalTitle}`,
      }),

    notifyGoalBehind: (goalTitle: string, progress: number) =>
      addNotification({
        type: "warning",
        title: "Goal Behind Schedule",
        message: `${goalTitle} is at ${progress.toFixed(0)}% - action needed`,
      }),

    notifyDailyTargetMet: (serviceName: string) =>
      addNotification({
        type: "success",
        title: "Daily Target Met",
        message: `${serviceName} has reached its daily revenue target`,
      }),

    notifyLowPerformance: (serviceName: string, percentage: number) =>
      addNotification({
        type: "warning",
        title: "Low Performance Alert",
        message: `${serviceName} is performing at ${percentage.toFixed(0)}% of target`,
      }),
  };
}
