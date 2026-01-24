import { useState } from "react";
import { useNotifications, Notification } from "@/contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, CheckCheck, Trash2, X, Info, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const iconMap = {
  info: <Info className="w-4 h-4 text-blue-500" />,
  success: <CheckCircle2 className="w-4 h-4 text-success" />,
  warning: <AlertTriangle className="w-4 h-4 text-warning" />,
  error: <AlertCircle className="w-4 h-4 text-danger" />,
};

function NotificationItem({
  notification,
  onRead,
  onRemove,
}: {
  notification: Notification;
  onRead: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`p-3 border-b border-border last:border-0 transition-colors ${
        notification.read ? "opacity-60" : "bg-primary/5"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{iconMap[notification.type]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-sm truncate">{notification.title}</p>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          {notification.action && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 mt-1 text-primary"
              onClick={notification.action.onClick}
            >
              {notification.action.label}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!notification.read && (
            <button
              onClick={onRead}
              className="p-1 hover:bg-secondary rounded transition-colors"
              title="Mark as read"
            >
              <Check className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={onRemove}
            className="p-1 hover:bg-secondary rounded transition-colors"
            title="Remove"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotifications();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 text-xs gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-8 text-xs gap-1 text-muted-foreground"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={() => markAsRead(notification.id)}
                onRemove={() => removeNotification(notification.id)}
              />
            ))}
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
