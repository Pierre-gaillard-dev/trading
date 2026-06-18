import type {
  BotConfigRecord,
  BotConfigRepository,
  NewBotConfig,
} from '../repositories/bot-config.repository';

/** Faux repository de config de bots en mémoire (pour les tests). */
export class InMemoryBotConfigRepository implements BotConfigRepository {
  private readonly configs: BotConfigRecord[] = [];
  private sequence = 0;

  create(input: NewBotConfig): Promise<BotConfigRecord> {
    this.sequence += 1;
    const record: BotConfigRecord = { id: `bot_${String(this.sequence)}`, ...input };
    this.configs.push(record);
    return Promise.resolve(record);
  }

  listAll(): Promise<BotConfigRecord[]> {
    return Promise.resolve([...this.configs]);
  }

  remove(userId: string, id: string): Promise<void> {
    const index = this.configs.findIndex((c) => c.id === id && c.userId === userId);
    if (index !== -1) {
      this.configs.splice(index, 1);
    }
    return Promise.resolve();
  }
}
