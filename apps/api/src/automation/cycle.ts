export interface AutomationCycleService {
  expireDue(): Promise<number>;
  generateReminders(): Promise<number>;
  processOutbox(): Promise<number>;
}

export interface AutomationCycleResult {
  expired: number;
  reminders: number;
  delivered: number;
}

export async function runAutomationCycle(service: AutomationCycleService): Promise<AutomationCycleResult> {
  const expired = await service.expireDue();
  const reminders = await service.generateReminders();
  const delivered = await service.processOutbox();
  return { expired, reminders, delivered };
}
