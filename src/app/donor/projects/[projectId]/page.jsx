import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import ProjectImpactOverview from "@/components/donor/ProjectImpactOverview";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Project Impact Overview | Donor Portal",
  description: "Aggregated health impact metrics, coverage progress, and survey round comparisons.",
};

export default async function DonorProjectPage({ params }) {
  const auth = await requireAuth(["donor", "superadmin"]);

  if (!auth.authenticated) {
    redirect("/login?callbackUrl=/donor/dashboard");
  }

  if (!auth.authorized) {
    redirect("/login");
  }

  const { projectId } = await params;

  return <ProjectImpactOverview projectId={projectId} />;
}
