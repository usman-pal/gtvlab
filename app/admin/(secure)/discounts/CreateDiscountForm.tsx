"use client";
import { useActionState } from "react";
import { createDiscount } from "../../actions";

export default function CreateDiscountForm({ products }: { products: { key: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createDiscount, {} as { error?: string; ok?: string });
  return (
    <form action={action}>
      <div className="filters">
        <label>Code<input className="input" name="code" required placeholder="CREATOR20" style={{ textTransform: "uppercase" }} maxLength={40} /></label>
        <label>% off<input className="input" name="percentOff" type="number" min={1} max={100} required style={{ minWidth: 80 }} /></label>
        <label>Max uses<input className="input" name="maxUses" type="number" min={1} placeholder="unlimited" style={{ minWidth: 100 }} /></label>
        <label>Expires<input className="input" name="expiresAt" type="date" /></label>
        <label>Note<input className="input" name="note" placeholder="e.g. for @creator's audience" /></label>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: "12px 0 0" }}>
        <legend className="xs muted" style={{ fontWeight: 600, marginBottom: 4 }}>Applies to (leave all unticked for every service)</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px" }}>
          {products.map((p) => (
            <label key={p.key} className="small" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" name="products" value={p.key} /> {p.name}
            </label>
          ))}
        </div>
      </fieldset>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
        <button className="btn btn-dark" disabled={pending}>{pending ? "Creating…" : "Create code"}</button>
        {state.error && <span className="err" style={{ margin: 0 }}>{state.error}</span>}
        {state.ok && <span className="g-A">{state.ok}</span>}
      </div>
    </form>
  );
}
