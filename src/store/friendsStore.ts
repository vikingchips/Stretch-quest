import { create } from 'zustand';
import {
  acceptRequest,
  listFriends,
  listRequests,
  removeFriend,
  removeRequest,
  type FriendProfile,
  type PendingRequest,
} from '../sync/friends';
import { useAuthStore } from '../sync/authStore';

interface FriendsState {
  friends: FriendProfile[];
  requests: PendingRequest[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  accept: (id: string) => Promise<void>;
  decline: (id: string) => Promise<void>;
  unfriend: (friendId: string) => Promise<void>;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not reach the server.';
}

export const useFriendsStore = create<FriendsState>()((set, get) => ({
  friends: [],
  requests: [],
  loading: false,
  error: null,

  refresh: async () => {
    const { userId, status } = useAuthStore.getState();
    if (status !== 'signed-in' || !userId) {
      set({ friends: [], requests: [], loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const [friends, requests] = await Promise.all([
        listFriends(userId),
        listRequests(userId),
      ]);
      set({ friends, requests, loading: false });
    } catch (error) {
      set({ loading: false, error: message(error) });
    }
  },

  accept: async (id) => {
    try {
      await acceptRequest(id);
      await get().refresh();
    } catch (error) {
      set({ error: message(error) });
    }
  },

  decline: async (id) => {
    try {
      await removeRequest(id);
      await get().refresh();
    } catch (error) {
      set({ error: message(error) });
    }
  },

  unfriend: async (friendId) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    try {
      await removeFriend(userId, friendId);
      await get().refresh();
    } catch (error) {
      set({ error: message(error) });
    }
  },
}));
