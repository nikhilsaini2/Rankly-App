import AsyncStorage from "@react-native-async-storage/async-storage";

// All AsyncStorage keys that store per-user data.
// These use fixed keys (not user-scoped) so we must wipe them on account deletion.
const USER_DATA_KEYS = [
  "rankly_resume_history_v1",
  "rankly_interview_history_v1",
];

/**
 * Clears all local AsyncStorage data tied to a user.
 * Call this before signing out on account deletion to prevent
 * data leakage when the same device re-registers with the same credentials.
 */
export async function clearUserLocalData(_userId: string): Promise<void> {
  try {
    await AsyncStorage.multiRemove(USER_DATA_KEYS);
  } catch (err) {
    if (__DEV__) console.warn("[localStorageService] Failed to clear local data", err);
  }
}
