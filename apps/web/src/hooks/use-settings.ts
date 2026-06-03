import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changePassword,
  getPaymentHistory,
  getUserPreferences,
  type NotificationPreferences,
  type UserPreferences,
  updateProfile,
  updateUserPreferences,
} from '@/services/settings-api';
import { useAuthStore } from '@/stores/auth-store';

export const settingsKeys = {
  all: ['settings'] as const,
  preferences: () => [...settingsKeys.all, 'preferences'] as const,
  paymentHistory: () => [...settingsKeys.all, 'payment-history'] as const,
};

export function useUserPreferences() {
  return useQuery({
    queryKey: settingsKeys.preferences(),
    queryFn: getUserPreferences,
  });
}

export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserPreferences,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.preferences() });
      const previous = queryClient.getQueryData<UserPreferences>(settingsKeys.preferences());

      if (previous) {
        queryClient.setQueryData<UserPreferences>(settingsKeys.preferences(), {
          ...previous,
          notifications: {
            ...previous.notifications,
            ...input,
          },
        });
      }

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(settingsKeys.preferences(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.preferences() });
    },
  });
}

export function useUpdateProfile() {
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      setUser(data.user, data.subscription);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: changePassword,
  });
}

export function usePaymentHistory() {
  return useQuery({
    queryKey: settingsKeys.paymentHistory(),
    queryFn: getPaymentHistory,
  });
}

export type { NotificationPreferences };
