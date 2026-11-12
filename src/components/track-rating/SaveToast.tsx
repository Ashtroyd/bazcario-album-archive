import { cn } from "@/lib/utils";
import type { Toast } from "./types";

/** Bottom toast confirming a track save, with Undo, or reporting an error. */
export function SaveToast({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const undo = toast.kind === "saved" ? toast.undo : null;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="rating-save-toast fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 z-50 overflow-hidden rounded-xl border border-white/10 bg-ink text-paper shadow-[0_18px_55px_rgba(38,37,33,0.3)] sm:right-6 sm:bottom-6 sm:left-auto sm:w-96"
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span
          aria-hidden="true"
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full border",
            toast.kind === "error"
              ? "border-accent/60 bg-accent/15 text-accent"
              : "border-sage/60 bg-sage/15 text-sage",
          )}
        >
          <span className="size-2 rounded-full bg-current" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-paper/60 uppercase">
            {toast.kind === "saved"
              ? "Track updated"
              : toast.kind === "undone"
                ? "Change undone"
                : "Save interrupted"}
          </p>
          <p className="truncate text-sm font-medium">
            {toast.kind === "error" ? toast.message : toast.trackName}
          </p>
        </div>
        {undo ? (
          <button
            type="button"
            onClick={() => {
              onDismiss();
              undo();
            }}
            className="shrink-0 rounded-full border border-paper/25 px-3 py-1.5 text-xs font-semibold text-paper transition hover:border-paper/50 hover:bg-paper/10"
          >
            Undo
          </button>
        ) : null}
      </div>
      {toast.kind !== "error" ? <div aria-hidden="true" className="rating-save-toast-timer h-0.5 origin-left bg-accent" /> : null}
    </div>
  );
}
