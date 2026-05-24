export type LunariaServiceName = "api" | "bot" | "dashboard" | "worker";

export function serviceBanner(serviceName: LunariaServiceName): string {
  return `Lunaria ${serviceName} ready`;
}

