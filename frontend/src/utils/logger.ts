export function logEvent(event: string, metadata: Record<string, any> = {}) {
  console.log(`[Analytics] ${event}`, metadata);
}

export function logError(error: string, context?: any) {
  console.error(`[Error] ${error}`, context);
}
