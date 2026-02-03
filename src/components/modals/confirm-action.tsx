import alertIconSrc from "@/assets/alert.png";
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
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  variant = isDestructive ? "danger" : "primary",
}: ConfirmActionProps) {
  return (
    <AlertDialog open={open}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle asChild>
            <div>
              <img
                className="p-2 mb-2 ml-[-8px]"
                src={alertIconSrc}
                alt="Alert Icon"
                width={70}
                height={70}
              />
              <h1 className="text-base font-medium text-primary">{title}</h1>
            </div>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <h3 className="text-base font-medium text-secondary opacity-50">
              {description}
            </h3>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="secondary" size="md" onClick={() => onClose?.()}>
            {cancelLabel}
          </Button>

          <Button variant={variant} size="md" onClick={() => onAction()}>
            {isDestructive ? "Delete" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
