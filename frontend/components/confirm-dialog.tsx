"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

type Props = {
  titulo: string;
  linhas: string[];
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirmacao simples (Sim / Cancelar), renderizada no <body> como o dialogo de alocacao. */
export function ConfirmDialog({ titulo, linhas, onConfirm, onCancel }: Props) {
  const tituloId = useId();
  const sim = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    sim.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return createPortal(
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        aria-labelledby={tituloId}
        aria-modal="true"
        className="manual-dialog confirm-dialog"
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
      >
        <h2 id={tituloId}>{titulo}</h2>
        <ul>
          {linhas.map((linha) => (
            <li key={linha}>{linha}</li>
          ))}
        </ul>
        <footer className="manual-dialog-actions">
          <button className="ghost-action" onClick={onCancel} type="button">
            Cancelar
          </button>
          <button className="primary-action" onClick={onConfirm} ref={sim} type="button">
            Sim
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
