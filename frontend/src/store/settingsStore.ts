import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Settings } from '../types'
import { settingsApi } from '../api/client'

interface SettingsStore {
  settings: Settings | null
  loading: boolean
  fetchSettings: () => Promise<void>
  updateSettings: (data: Partial<Settings> & { openai_api_key?: string }) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: null,
      loading: false,

      fetchSettings: async () => {
        set({ loading: true })
        try {
          const settings = await settingsApi.get()
          set({ settings, loading: false })
        } catch {
          set({ loading: false })
        }
      },

      updateSettings: async (data) => {
        const updated = await settingsApi.update(data)
        set({ settings: updated })
      },
    }),
    { name: 'ragmind-settings', partialize: s => ({ settings: s.settings }) }
  )
)
