import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { PageTransition } from '@/components/ui/PageTransition';
import { useDeletePrompt, usePrompt } from '@/hooks/use-prompts';
import { DeletePromptDialog } from './prompt/components/DeletePromptDialog';
import { PromptDetailHeader } from './prompt/components/PromptDetailHeader';
import { PromptErrorState } from './prompt/components/PromptErrorState';
import { PromptLoadingState } from './prompt/components/PromptLoadingState';
import {
  ADVICE_BY_TYPE,
  AIModelAdvisor,
  DEFAULT_ADVICE,
} from './prompt/components/PromptResultDisplay';
import { PromptTerminal } from './prompt/components/PromptTerminal';

export function PromptDetailPage() {
  const { id } = useParams({ strict: false }) as { id?: string };
  const promptId = id ?? '';
  const navigate = useNavigate();
  const { data: prompt, isLoading, error } = usePrompt(promptId);
  const deletePrompt = useDeletePrompt();

  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleDelete = async () => {
    if (!promptId) return;
    try {
      await deletePrompt.mutateAsync(promptId);
      navigate({ to: '/dashboard/prompts' });
    } catch {
      // Error is logged by mutation
    }
  };

  const handleBack = () => {
    navigate({ to: '/dashboard/prompts' });
  };

  if (isLoading) {
    return <PromptLoadingState />;
  }

  if (error || !prompt) {
    return <PromptErrorState onBack={handleBack} />;
  }

  const currentVersion = selectedVersion
    ? prompt.versions.find((v) => v.id === selectedVersion)
    : prompt.versions[0];

  const advice = prompt.type ? ADVICE_BY_TYPE[prompt.type] || DEFAULT_ADVICE : DEFAULT_ADVICE;

  return (
    <PageTransition className="pb-6 lg:pb-10">
      <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-in">
        {/* Header Section */}
        <PromptDetailHeader
          prompt={prompt}
          promptId={promptId}
          onDeleteClick={() => setIsDeleteOpen(true)}
        />

        {/* Dynamic 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* Left Side: Terminal View with integrated version dropdown */}
          <div className="lg:col-span-2 flex flex-col">
            <PromptTerminal
              generatedPrompt={currentVersion?.generatedPrompt || ''}
              inputData={currentVersion?.inputData || {}}
              versions={prompt.versions}
              currentVersionId={prompt.currentVersionId}
              selectedVersionId={selectedVersion}
              onSelectVersion={setSelectedVersion}
            />
          </div>

          {/* Right Side: AI Execution Advisor */}
          <div className="lg:col-span-1 flex flex-col">
            <AIModelAdvisor advice={advice} />
          </div>
        </div>
      </div>

      {/* Delete Prompt Dialog Modal */}
      <DeletePromptDialog
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDelete}
        isPending={deletePrompt.isPending}
      />
    </PageTransition>
  );
}
