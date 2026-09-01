import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  destructive?: boolean;
}

export function Modal({ title, children, onClose, footer, destructive = false }: ModalProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" role="presentation">
      <section
        aria-modal="true"
        className={destructive ? "modal-panel destructive-panel" : "modal-panel"}
        role="dialog"
      >
        <header className="modal-header">
          <h2>{title}</h2>
          <button aria-label="Fechar" className="icon-button subtle" onClick={onClose} type="button">
            <X aria-hidden="true" size={20} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  );
}
