import { seed } from "./zz-order.mjs";
const s = await seed();
const call = async (token, path, init = {}) => {
  const r = await fetch("http://localhost:3000" + path, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers } });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const out = { reference: s.reference };
out.customerOrders = (await call(s.customerToken, "/api/messages/orders")).body.orders?.map((o) => o.status);
// Admin: accept -> success
out.accept = (await call(s.adminToken, `/api/admin/orders/${s.reference}/status`, { method: "POST", body: JSON.stringify({ status: "awaiting_payment" }) })).body.order?.status;
out.confirm = (await call(s.adminToken, `/api/admin/orders/${s.reference}/status`, { method: "POST", body: JSON.stringify({ status: "confirmed" }) })).body.order?.status;
// Customer sees it immediately
out.customerSees = (await call(s.customerToken, "/api/messages/orders")).body.orders?.find((o) => o.reference === s.reference)?.status;
// A confirmed order can't be re-confirmed or cancelled
out.reconfirm = (await call(s.adminToken, `/api/admin/orders/${s.reference}/status`, { method: "POST", body: JSON.stringify({ status: "confirmed" }) })).status;
out.cancelAfter = (await call(s.adminToken, `/api/admin/orders/${s.reference}/status`, { method: "POST", body: JSON.stringify({ status: "cancelled" }) })).status;
// Admin profile shows the real status
const prof = (await call(s.adminToken, `/api/admin/conversations/${s.customerUid}/profile`)).body;
out.adminProfileOrderStatus = prof.orders?.[0]?.status;
console.log(JSON.stringify(out, null, 2));
console.log(JSON.stringify({ customerEmail: s.customerEmail, adminEmail: s.adminEmail, password: s.password }));
