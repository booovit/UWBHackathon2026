import { useProfile } from "@/features/profile/ProfileProvider";

export function AccessibilityToolbar() {
  const { profile, saveProfile } = useProfile();
  const ui = profile.uiPreferences;

  function setUi(next: Partial<typeof ui>) {
    void saveProfile({ uiPreferences: { ...ui, ...next } }).catch((err) => {
      console.error("Could not save accessibility preferences", err);
    });
  }

  return (
    <div
      className="card row"
      role="toolbar"
      aria-label="Accessibility settings"
      style={{ justifyContent: "space-between", flexWrap: "wrap" }}
    >
      <div className="row" style={{ gap: "var(--space-2)" }}>
        <button
          type="button"
          className="button secondary"
          onClick={() =>
            setUi({ fontScale: Math.max(0.85, ui.fontScale - 0.1) })
          }
          aria-label="Decrease text size"
        >
          A-
        </button>
        <span aria-live="polite">{Math.round(ui.fontScale * 100)}%</span>
        <button
          type="button"
          className="button secondary"
          onClick={() =>
            setUi({ fontScale: Math.min(1.6, ui.fontScale + 0.1) })
          }
          aria-label="Increase text size"
        >
          A+
        </button>
      </div>
      <div className="row" style={{ gap: "var(--space-2)" }}>
        <ToolbarToggle
          pressed={ui.extraSpacing}
          label="Extra spacing"
          onChange={(v) => setUi({ extraSpacing: v })}
        />
        <ToolbarToggle
          pressed={ui.lineFocus}
          label="Line focus"
          onChange={(v) => setUi({ lineFocus: v })}
        />
        <ToolbarToggle
          pressed={ui.highContrast}
          label="High contrast"
          onChange={(v) => setUi({ highContrast: v })}
        />
        <ToolbarToggle
          pressed={ui.maxLineWidth === "narrow"}
          label="Narrow lines"
          onChange={(v) => setUi({ maxLineWidth: v ? "narrow" : "standard" })}
        />
      </div>
    </div>
  );
}

function ToolbarToggle({
  pressed,
  label,
  onChange,
}: {
  pressed: boolean;
  label: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={pressed ? "button" : "button secondary"}
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
    >
      {label}
    </button>
  );
}
