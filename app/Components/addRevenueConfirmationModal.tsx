import React, { useEffect, useRef } from 'react';
import '../styles/components/confirmationModal.css';
import ModalHeader from './ModalHeader';

type ConfirmationModalProps = {
  isOpen: boolean;
  action?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  action = "ADD",
  onConfirm,
  onCancel
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus the confirm button when modal opens
      confirmButtonRef.current?.focus();

      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isOpen, onCancel]);

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="confirmationOverlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
      aria-describedby="confirmation-message"
    >
      <div
        className="confirmationModal"
        ref={modalRef}
        role="document"
      >
        <ModalHeader title="Confirmation" onClose={onCancel} />

        <div className="confirmationContent">
          <div
            id="confirmation-message"
            className="confirmationMessage"
          >
            Are you sure you want to {action.toLowerCase()} this record?
          </div>
        </div>

        <div className="confirmationButtons">
          <button
            ref={confirmButtonRef}
            type="button"
            className="confirmButton"
            onClick={onConfirm}
            aria-label={`Confirm ${action.toLowerCase()} action`}
          >
            Confirm
          </button>
          <button
            type="button"
            className="cancelButton"
            onClick={onCancel}
            aria-label="Cancel action"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;