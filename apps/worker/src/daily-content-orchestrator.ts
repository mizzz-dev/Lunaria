import {
  DAILY_CONTENT_PLUGIN_ID,
  isDailyContentConfig,
  listDailyContentDueJobs,
  type DailyContentDueJob,
  type GuildPluginSettingsStore
} from "@lunaria/core";
import type { DailyContentProcessingResult, DailyContentProcessor } from "./daily-content-processor.js";

export interface DailyContentOrchestrationResult {
  readonly jobs: readonly DailyContentDueJob[];
  readonly results: readonly DailyContentProcessingResult[];
}

export class DailyContentOrchestrator {
  constructor(
    private readonly settings: GuildPluginSettingsStore,
    private readonly processor: Pick<DailyContentProcessor, "process">,
    private readonly now = () => new Date()
  ) {}

  async processDueForGuild(
    guildId: string,
    referenceTime = this.now()
  ): Promise<DailyContentOrchestrationResult> {
    const setting = await this.settings.get(guildId, DAILY_CONTENT_PLUGIN_ID);

    if (!setting?.enabled) {
      return { jobs: [], results: [] };
    }

    if (!isDailyContentConfig(setting.config)) {
      throw new Error("DAILY_CONTENT_CONFIG_INVALID");
    }

    const jobs = listDailyContentDueJobs({
      guildId,
      config: setting.config,
      now: referenceTime
    });
    const results: DailyContentProcessingResult[] = [];

    for (const job of jobs) {
      results.push(await this.processor.process(job, referenceTime));
    }

    return { jobs, results };
  }
}
