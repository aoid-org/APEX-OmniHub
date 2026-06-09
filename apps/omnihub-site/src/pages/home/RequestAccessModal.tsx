import React from 'react';

export function RequestAccessModal({
  isOpen,
  onClose,
  formStatus,
  formError,
  onSubmit
}: Readonly<{
  isOpen: boolean;
  onClose: () => void;
  formStatus: 'idle' | 'success';
  formError: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}>) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClick = (e: MouseEvent) => {
      if (e.target === dialog) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target === dialog && (e.key === 'Enter' || e.key === ' ')) onClose();
    };
    dialog.addEventListener('click', handleClick);
    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('click', handleClick);
      dialog.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      id="ra-modal"
      className={`modal-overlay ${isOpen ? 'open' : ''}`}
      aria-hidden={!isOpen}
      aria-modal="true"
      aria-labelledby="modal-title"
      open={isOpen}
    >
      <div className="modal-card">
        <button className="modal-close" id="modal-close" aria-label="Close" onClick={onClose}>&times;</button>
        <div className={`modal-form-body ${formStatus === 'success' ? 'hidden' : ''}`} id="modal-form-body">
          <div className="modal-title" id="modal-title">Request Early Access</div>
          <div className="modal-sub">Tell us about your use case and we will be in touch.</div>
          <div className={`modal-gen-error ${formError ? 'show' : ''}`} id="gen-error">{formError}</div>
          <form id="ra-form" noValidate onSubmit={onSubmit}>
            <input type="text" name="website" className="form-honey" tabIndex={-1} autoComplete="off" />
            <div className="form-group">
              <label className="form-label" htmlFor="ra_name">Full Name *</label>
              <input className="form-input" type="text" id="ra_name" name="ra_name" required maxLength={100} autoComplete="name" placeholder="Jane Smith" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ra_email">Work Email *</label>
              <input className="form-input" type="email" id="ra_email" name="ra_email" required maxLength={254} autoComplete="email" placeholder="jane@company.com" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ra_company">Company</label>
              <input className="form-input" type="text" id="ra_company" name="ra_company" maxLength={100} autoComplete="organization" placeholder="ACME Corp" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ra_usecase">Use Case</label>
              <textarea className="form-input" id="ra_usecase" name="ra_usecase" maxLength={500} rows={3} placeholder="Briefly describe how you plan to use APEX OmniHub"></textarea>
            </div>
            <button type="submit" className="pill" id="form-submit" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
              <span className="btn-text">Request Access</span>
              <span className="spinner"></span>
            </button>
          </form>
        </div>
        <div className={`modal-success ${formStatus === 'success' ? 'show' : ''}`} id="modal-success">
          <div className="modal-success-ico">&#10003;</div>
          <div className="modal-success-ttl">Request Received</div>
          <div className="modal-success-txt">We will be in touch shortly.</div>
        </div>
      </div>
    </dialog>
  );
}
