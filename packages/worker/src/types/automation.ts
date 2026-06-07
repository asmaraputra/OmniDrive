export interface RuleCondition {
  field: 'name' | 'extension';
  operator: 'endswith' | 'contains' | 'equals';
  value: string;
}

export interface RuleAction {
  type: 'move' | 'delete';
  target_folder_id?: string;
}

export interface AutomationRule {
  id: string;
  user_id: string;
  name: string;
  trigger_type: 'event' | 'cron';
  trigger_config: any;
  conditions: RuleCondition[];
  actions: RuleAction[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
