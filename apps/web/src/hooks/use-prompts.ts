import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import type { PromptType } from '@vibe-creator/shared';

interface Prompt {
  id: string;
  type: PromptType;
  title: string;
  currentVersion: number;
  lastGeneratedPrompt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PromptDetail {
  id: string;
  type: PromptType;
  title: string;
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  versions: PromptVersion[];
}

interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  inputData: Record<string, unknown>;
  generatedPrompt: string;
  userNotes: string | null;
  createdAt: string;
}

interface ListPromptsParams {
  page?: number;
  limit?: number;
  type?: PromptType;
}

interface CreatePromptInput {
  type: PromptType;
  title: string;
  inputData: Record<string, unknown>;
}

interface CreateVersionInput {
  inputData: Record<string, unknown>;
  userNotes?: string;
}

// Queries
export function usePrompts(params?: ListPromptsParams) {
  const { isAuthenticated } = useAuthStore();
  
  return useQuery({
    queryKey: ['prompts', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.type) searchParams.set('type', params.type);
      
      const response = await api.get<Prompt[]>(`/prompts?${searchParams.toString()}`);
      if (!response.success) throw new Error(response.error.message);
      return response;
    },
    // Only fetch when authenticated
    enabled: isAuthenticated,
  });
}

export function usePrompt(id: string) {
  return useQuery({
    queryKey: ['prompt', id],
    queryFn: async () => {
      const response = await api.get<PromptDetail>(`/prompts/${id}`);
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
    enabled: !!id,
  });
}

export function usePromptVersion(promptId: string, version: number) {
  return useQuery({
    queryKey: ['prompt', promptId, 'version', version],
    queryFn: async () => {
      const response = await api.get<PromptVersion>(`/prompts/${promptId}/versions/${version}`);
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
    enabled: !!promptId && version > 0,
  });
}

// Mutations
export function useCreatePrompt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreatePromptInput) => {
      const response = await api.post<PromptDetail & { generatedPrompt: string }>('/prompts', input);
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    },
  });
}

export function useCreateVersion(promptId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateVersionInput) => {
      const response = await api.post<PromptVersion & { generatedPrompt: string }>(
        `/prompts/${promptId}/versions`,
        input
      );
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['prompt', promptId] });
    },
  });
}

export function useUpdatePrompt(promptId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: { title: string }) => {
      const response = await api.patch<PromptDetail>(`/prompts/${promptId}`, input);
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['prompt', promptId] });
    },
  });
}

export function useDeletePrompt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (promptId: string) => {
      const response = await api.delete(`/prompts/${promptId}`);
      if (!response.success) throw new Error(response.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    },
  });
}

export function useRegeneratePrompt(promptId: string) {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post<{ generatedPrompt: string; version: number }>(
        `/prompts/${promptId}/regenerate`
      );
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
  });
}
