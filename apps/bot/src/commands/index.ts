import { lunariaCommand } from "./lunaria.js";

export const commands = [lunariaCommand] as const;

export type LunariaCommand = (typeof commands)[number];

