import { create } from "zustand";

/**
 * Pure UI state only — active sheet/modal, toasts. Wallet state is NOT mirrored here; wagmi's own
 * context is the single source of truth (see hooks/useWallet.ts) to avoid a dual-source-of-truth
 * sync bug between zustand and wagmi.
 */
interface UiState {
  activeSheet: "listingDetail" | null;
  openSheet: (sheet: UiState["activeSheet"]) => void;
  closeSheet: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeSheet: null,
  openSheet: (sheet) => set({ activeSheet: sheet }),
  closeSheet: () => set({ activeSheet: null }),
}));
