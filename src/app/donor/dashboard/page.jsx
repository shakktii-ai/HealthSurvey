import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import DonorDashboard from "@/components/donor/DonorDashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Donor Impact Observatory | HealthSurvey Portal",
  description: "Read-only aggregated analytics, survey coverage, and round comparison for authorized projects.",
};

export default async function DonorDashboardPage() {
  const auth = await requireAuth(["donor", "superadmin"]);

  if (!auth.authenticated) {
    redirect("/login?callbackUrl=/donor/dashboard");
  }

  if (!auth.authorized) {
    redirect("/login");
  }

  return <DonorDashboard userName={auth.user?.name || "Donor"} />;
}
