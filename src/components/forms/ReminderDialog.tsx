import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { debtsApi, Debt } from "@/lib/api";
import { Mail, Phone, Send, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt | null;
}

export function ReminderDialog({ open, onOpenChange, debt }: ReminderDialogProps) {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<"email" | "sms">("email");
  const [customMessage, setCustomMessage] = useState("");
  const [useCustomMessage, setUseCustomMessage] = useState(false);

  const hasEmail = !!debt?.debtorEmail;
  const hasPhone = !!debt?.debtorContact;

  const sendReminderMutation = useMutation({
    mutationFn: (data: { method: "email" | "sms"; customMessage?: string }) =>
      debtsApi.sendReminder(debt!.id, data),
    onSuccess: (data) => {
      toast.success(data.message, {
        description: `Reminder sent to ${data.details.recipient}`,
      });
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      handleClose();
    },
    onError: (error: Error) => {
      toast.error("Failed to send reminder", {
        description: error.message,
      });
    },
  });

  const handleClose = () => {
    setMethod("email");
    setCustomMessage("");
    setUseCustomMessage(false);
    onOpenChange(false);
  };

  const handleSend = () => {
    sendReminderMutation.mutate({
      method,
      customMessage: useCustomMessage ? customMessage : undefined,
    });
  };

  const defaultMessage = debt
    ? `Dear ${debt.debtorName},\n\nThis is a friendly reminder that you have an outstanding balance of $${debt.balance.toLocaleString()} for ${debt.serviceName}.\n\nOriginal Amount: $${debt.originalAmount.toLocaleString()}\nDue Date: ${new Date(debt.dueDate).toLocaleDateString()}\n\nPlease arrange for payment at your earliest convenience.\n\nThank you.`
    : "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Payment Reminder
          </DialogTitle>
          <DialogDescription>
            Send a payment reminder to <strong>{debt?.debtorName}</strong> for outstanding balance of{" "}
            <strong>${debt?.balance?.toLocaleString()}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Method Selection */}
          <div className="space-y-3">
            <Label>Delivery Method</Label>
            <RadioGroup
              value={method}
              onValueChange={(value) => setMethod(value as "email" | "sms")}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="email"
                  id="email"
                  className="peer sr-only"
                  disabled={!hasEmail}
                />
                <Label
                  htmlFor="email"
                  className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer ${
                    !hasEmail ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <Mail className="mb-2 h-6 w-6" />
                  <span className="text-sm font-medium">Email</span>
                  {hasEmail ? (
                    <span className="text-xs text-muted-foreground truncate max-w-full">
                      {debt?.debtorEmail}
                    </span>
                  ) : (
                    <span className="text-xs text-destructive">No email on file</span>
                  )}
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="sms"
                  id="sms"
                  className="peer sr-only"
                  disabled={!hasPhone}
                />
                <Label
                  htmlFor="sms"
                  className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer ${
                    !hasPhone ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <Phone className="mb-2 h-6 w-6" />
                  <span className="text-sm font-medium">SMS</span>
                  {hasPhone ? (
                    <span className="text-xs text-muted-foreground">{debt?.debtorContact}</span>
                  ) : (
                    <span className="text-xs text-destructive">No phone on file</span>
                  )}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* No Contact Info Warning */}
          {!hasEmail && !hasPhone && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No contact information on file for this debtor. Please update their record first.
              </AlertDescription>
            </Alert>
          )}

          {/* Custom Message Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="customMessage"
              checked={useCustomMessage}
              onChange={(e) => setUseCustomMessage(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="customMessage" className="text-sm cursor-pointer">
              Use custom message
            </Label>
          </div>

          {/* Message Preview/Editor */}
          <div className="space-y-2">
            <Label>{useCustomMessage ? "Custom Message" : "Message Preview"}</Label>
            <Textarea
              value={useCustomMessage ? customMessage : defaultMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              readOnly={!useCustomMessage}
              rows={6}
              className={!useCustomMessage ? "bg-muted" : ""}
              placeholder="Enter your custom message..."
            />
          </div>

          {/* Integration Note */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Note:</strong> This is a placeholder feature. In production, integrate with
              SendGrid, Twilio, or similar services for actual delivery.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={
              sendReminderMutation.isPending ||
              (method === "email" && !hasEmail) ||
              (method === "sms" && !hasPhone)
            }
            className="gap-2"
          >
            {sendReminderMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Reminder
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
