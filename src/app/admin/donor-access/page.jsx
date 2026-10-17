import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import DonorAccessManager from "@/components/admin/DonorAccessManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Donor Access Management | Admin Portal",
  description: "Authorize and manage explicit project access grants for donor accounts.",
};

export default async function DonorAccessPage() {
  const auth = await requireAuth(["superadmin"]);

  if (!auth.authenticated) {
    redirect("/login?callbackUrl=/admin/donor-access");
  }

  if (!auth.authorized) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Donor Access Control
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Explicit project authorization for donor transparency portals. Donors have zero visibility by default until granted.
        </p>
      </div>

      <DonorAccessManager />
    </div>
  );
}
