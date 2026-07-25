declare global {
  interface RegExpConstructor {
    escape(string: string): string
  }
}
