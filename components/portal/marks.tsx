const p = { fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const Check = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" {...p}><path d="M3.5 8.5l3 3L12.5 5" /></svg>
);
export const Lock = () => (
  <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" {...p} strokeWidth={1.8}><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" /></svg>
);
