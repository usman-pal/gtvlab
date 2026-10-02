"use client";

/** Submit button that asks for confirmation first (for actions that notify the client). */
export default function ConfirmSubmit({ children, message, className = "btn btn-dark btn-sm" }: { children: React.ReactNode; message: string; className?: string }) {
  return (
    <button className={className} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
