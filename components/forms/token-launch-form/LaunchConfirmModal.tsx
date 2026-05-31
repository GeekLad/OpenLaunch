"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmSection } from "./useTokenLaunchForm";

interface LaunchConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  buildConfirmContent: () => ConfirmSection[];
}

export function LaunchConfirmModal({
  open,
  onOpenChange,
  isLoading,
  onConfirm,
  onCancel,
  buildConfirmContent,
}: LaunchConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Launch Confirmation</DialogTitle>
          <DialogDescription>
            Review your launch settings below. Launching a token on-chain is irreversible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {(() => {
            const sections = buildConfirmContent();
            if (sections.length === 0) {
              return (
                <p className="text-sm text-muted-foreground">
                  All settings are at default values.
                </p>
              );
            }
            return sections.map((section) => (
              <div key={section.title}>
                <h4 className="text-sm font-semibold mb-2">{section.title}</h4>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="text-red-600 dark:text-destructive font-medium">{item.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ));
          })()}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="button" variant="default" onClick={onConfirm} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? "Launching..." : "Confirm Launch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
