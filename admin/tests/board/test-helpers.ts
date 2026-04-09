export function installLocalStorageMock() {
  const storage = new Map<string, string>()
  const mockLocalStorage: Storage = {
    get length() {
      return storage.size
    },
    clear() {
      storage.clear()
    },
    getItem(key: string) {
      return storage.get(key) ?? null
    },
    key(index: number) {
      return [...storage.keys()][index] ?? null
    },
    removeItem(key: string) {
      storage.delete(key)
    },
    setItem(key: string, value: string) {
      storage.set(key, value)
    },
  }

  Object.defineProperty(window, "localStorage", { value: mockLocalStorage, configurable: true })
  Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage, configurable: true })
}
