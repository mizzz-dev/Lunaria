import { lunariaCommand } from "./lunaria.js";
import {
  quoteColorMessageCommand,
  quoteCommand,
  quoteMonochromeMessageCommand
} from "./quote.js";

export const commands = [
  lunariaCommand,
  quoteCommand,
  quoteMonochromeMessageCommand,
  quoteColorMessageCommand
] as const;

export type LunariaCommand = (typeof commands)[number];
