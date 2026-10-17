import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import DonorReportCenter from "@/components/donor/DonorReportCenter";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Impact Reports Center | Donor Portal",
  description: "Exportable impact transparency reports and aggregated health survey datasets.",
};

export default async function DonorReportsPage() {
  const auth = await requireAuth(["donor", "superadmin"]);

  if (!auth.authenticated) {
    redirect("/login?callbackUrl=/donor/reports");
  }

  if (!auth.authorized) {
    redirect("/login");
  }

  return <DonorReportCenter />;
}
