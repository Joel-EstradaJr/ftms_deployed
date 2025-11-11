import ReactDOM from "react-dom";
import "@/styles/components/modal2.css";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="modal-overlay">
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-content-wrapper">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}