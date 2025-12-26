import React, { useState } from 'react';
import { OverlayTrigger, Popover } from 'react-bootstrap';
import { FaExclamationCircle } from 'react-icons/fa';

interface DeleteConfirmPopoverProps {
    onConfirm: () => void;
    title?: string;
    confirmText?: string;
    confirmBtnStyle?: React.CSSProperties;
    children: React.ReactElement;
    placement?: 'top' | 'bottom' | 'left' | 'right';
}

const DeleteConfirmPopover: React.FC<DeleteConfirmPopoverProps> = ({
    onConfirm,
    title = 'Are you sure?',
    confirmText = 'Delete',
    confirmBtnStyle = { fontSize: '13px', padding: '4px 10px', background: '#ef4444', borderColor: '#ef4444' },
    children,
    placement = 'top'
}) => {
    const [show, setShow] = useState(false);

    const handleConfirm = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShow(false);
        onConfirm();
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShow(false);
    };

    const popover = (
        <Popover
            id="delete-popover"
            className="shadow-lg border-0"
            style={{ maxWidth: '200px' }}
            onClick={(e) => e.stopPropagation()}
        >
            <Popover.Body className="p-3 text-center">
                <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                    <FaExclamationCircle className="text-warning fs-5" style={{ color: '#f59e0b' }} />
                    <span className="fw-semibold text-dark" style={{ fontSize: '15px' }}>{title}</span>
                </div>
                <div className="d-flex justify-content-center gap-2">
                    <button
                        className="btn btn-sm btn-white border shadow-sm"
                        onClick={handleCancel}
                        style={{ fontSize: '13px', padding: '4px 10px' }}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-sm btn-danger shadow-sm"
                        onClick={handleConfirm}
                        style={confirmBtnStyle}
                    >
                        {confirmText}
                    </button>
                </div>
            </Popover.Body>
        </Popover>
    );

    return (
        <OverlayTrigger
            trigger="click"
            placement={placement}
            show={show}
            onToggle={(nextShow) => setShow(nextShow)}
            rootClose
            overlay={popover}
        >
            <span className="d-inline-block" onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer' }}>
                {children}
            </span>
        </OverlayTrigger>
    );
};

export default DeleteConfirmPopover;
