import alerStopIconSrc from "@/assets/alert-stop-icon.png";
import alertIconSrc from "@/assets/alert.png";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "../ui/Button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";

type ConfirmActionProps = {
  title: React.ReactNode;
  description: React.ReactNode;
  trigger?: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
  onAction: () => void;
  children?: React.ReactNode;
  isDestructive?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "secondary" | "primary" | "ghost" | "danger";
  useIcon?: boolean;
};

export function ConfirmAction({
  onClose,
  onAction,
  trigger,
  title,
  description,
  open,
  children,
  isDestructive = false,
  confirmLabel,
  cancelLabel,
  variant = isDestructive ? "danger" : "primary",
  useIcon = false,
}: ConfirmActionProps) {
  const { t } = useTranslation();
  const resolvedCancelLabel = cancelLabel ?? t("common.cancel");
  const resolvedConfirmLabel = isDestructive
    ? t("common.delete")
    : (confirmLabel ?? t("common.ok"));

  return (
    <AlertDialog open={open}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader className="px-4 pt-2">
          <AlertDialogTitle asChild>
            <div>
              {useIcon && (
                <img
                  className="p-2 mb-2 ml-[-8px]"
                  src={isDestructive ? alerStopIconSrc : alertIconSrc}
                  alt="Alert Icon"
                  width={90}
                  height={90}
                />
              )}
              <p className="text-[20px] font-medium text-primary mt-1">
                {title}
              </p>
            </div>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <p className="text-[18px] font-normal leading-[25px] text-secondary opacity-50">
              {description}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="ghost" size="lg" onClick={() => onClose?.()}>
            {resolvedCancelLabel}
          </Button>

          <Button variant={variant} size="lg" onClick={() => onAction()}>
            {resolvedConfirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
