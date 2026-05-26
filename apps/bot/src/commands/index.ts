import { lunariaCommand } from "./lunaria.js";
import { quoteCommand, quoteMessageCommand } from "./quote.js";

export const commands = [lunariaCommand, quoteCommand, quoteMessageCommand] as const;

export type LunariaCommand = (typeof commands)[number];
