import { lunariaCommand } from "./lunaria.js";
import { quoteCommand } from "./quote.js";

export const commands = [lunariaCommand, quoteCommand] as const;

export type LunariaCommand = (typeof commands)[number];
