export interface RuleCondition {
  field: 'name' | 'extension';
  operator: 'endswith' | 'contains' | 'equals';
  value: string;
}

export interface RuleAction {
  type: 'move' | 'delete';
  targetFolderId?: string;
}

export interface AutomationRule {
  id: string;
  userId: string;
  name: string;
  triggerType: 'event' | 'cron';
  triggerConfig: Record<string, unknown>;
  conditions: RuleCondition[];
  actions: RuleAction[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationLog {
  id: string;
  ruleId: string;
  status: string;
  details: string | null;
  executedAt: string;
}
