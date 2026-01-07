import { useDirectorStore } from "@/stores/director-store";
import { StepIndicator } from "@/components/director/StepIndicator";
import { ImportStep } from "@/components/director/steps/ImportStep";
import { AnalyzeStep } from "@/components/director/steps/AnalyzeStep";
import { PickingStep } from "@/components/director/steps/PickingStep";
import { EditingStep } from "@/components/director/steps/EditingStep";
import { ExportStep } from "@/components/director/steps/ExportStep";

export function AiDirectorPage() {
  const { step } = useDirectorStore();

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans pb-32">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <StepIndicator />

        {/* Content */}
        <div className="min-h-[400px] flex items-center justify-center">
          {step === "IMPORT" && <ImportStep />}
          {step === "ANALYZING" && <AnalyzeStep />}
          {step === "PICKING" && <PickingStep />}
          {step === "EDITING" && <EditingStep />}
          {step === "EXPORTING" && <ExportStep />}
          {step === "COMPLETED" && <ExportStep />}
        </div>
      </div>
    </div>
  );
}
