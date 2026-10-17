import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import FamilyWorkflowStepper from "@/components/field/FamilyWorkflowStepper";
import { Card, CardContent } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Family Survey Workflow | Field Worker Portal",
  description: "Execute and track the complete family-linked questionnaire sequence across survey rounds.",
};

export default async function FieldFamilyWorkflowPage({ params }) {
  const auth = await requireAuth(["field_worker", "superadmin"]);
  if (!auth.authenticated) {
    redirect("/login?callbackUrl=/field/assignments");
  }

  if (!auth.authorized) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="space-y-3 py-6">
            <h3 className="text-lg font-bold text-rose-800">Access Denied</h3>
            <p className="text-xs text-rose-600">Requires Field Worker privileges.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { id } = await params;

  return (
    <div className="py-2">
      <FamilyWorkflowStepper assignmentId={id} />
    </div>
  );
}
