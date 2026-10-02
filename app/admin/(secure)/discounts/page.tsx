import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, publicProducts, formatGBP } from "@/lib/site-config";
import { codeProducts } from "@/lib/discounts";
import { toggleDiscount } from "../../actions";
import CreateDiscountForm from "./CreateDiscountForm";

export default async function Discounts() {
  await requireSuperAdmin();
  const [codes, usage] = await Promise.all([
    db.discountCode.findMany({ orderBy: { createdAt: "desc" } }),
    db.payment.groupBy({
      by: ["discountCode"],
      where: { status: "paid", discountCode: { not: null } },
      _count: true,
      _sum: { amountPence: true, listPricePence: true },
    }),
  ]);
  const byCode = new Map(usage.map((u) => [u.discountCode, u]));
  const now = new Date();

  return (
    <>
      <h1 style={{ fontSize: "1.5rem", marginBottom: 4 }}>Discount codes</h1>
      <p className="muted small">
        Percentage codes customers can enter at checkout. Revenue in the dashboard always uses the amount actually paid. A 100% code skips payment and goes straight to
        booking.
      </p>

      <div className="card" style={{ margin: "16px 0 20px" }}>
        <h3>Create a code</h3>
        <CreateDiscountForm products={publicProducts.map((p) => ({ key: p.key, name: `${p.name} (${formatGBP(p.pricePence)})` }))} />
      </div>

      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Code</th><th className="num">% off</th><th>Applies to</th><th className="num">Used</th><th>Expires</th><th>Status</th>
              <th className="num">Revenue</th><th className="num">Discount given</th><th>Note</th><th></th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => {
              const u = byCode.get(c.code);
              const used = u?._count ?? 0;
              const expired = !!c.expiresAt && c.expiresAt < now;
              const full = c.maxUses !== null && used >= c.maxUses;
              const status = !c.active ? "Disabled" : expired ? "Expired" : full ? "Used up" : "Active";
              const allowed = codeProducts(c);
              return (
                <tr key={c.id}>
                  <td><strong>{c.code}</strong></td>
                  <td className="num">{c.percentOff}%</td>
                  <td>{allowed ? allowed.map((k) => products[k]?.name ?? k).join(", ") : "All services"}</td>
                  <td className="num">{used}{c.maxUses !== null ? ` / ${c.maxUses}` : ""}</td>
                  <td>{c.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : "—"}</td>
                  <td className={status === "Active" ? "g-A" : "muted"}>{status}</td>
                  <td className="num">{formatGBP(u?._sum.amountPence ?? 0)}</td>
                  <td className="num">{formatGBP((u?._sum.listPricePence ?? 0) - (u?._sum.amountPence ?? 0))}</td>
                  <td className="muted">{c.note ?? ""}</td>
                  <td>
                    <form action={toggleDiscount}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="btn btn-ghost" style={{ minHeight: 28, padding: "2px 10px", fontSize: 12 }}>{c.active ? "Disable" : "Enable"}</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {codes.length === 0 && <tr><td colSpan={10} className="muted">No codes yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
