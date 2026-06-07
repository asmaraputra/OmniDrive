import { useEffect } from 'react';
import { useAutomationStore } from '../stores/useAutomationStore';
import { Layout } from '../components/Layout';

export function AutomationsPage() {
  const { rules, fetchRules, toggleRule } = useAutomationStore();

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Automation Rules</h1>
        <div className="bg-white rounded-lg shadow">
          {rules.map(rule => (
            <div key={rule.id} className="p-4 border-b flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{rule.name}</h3>
                <p className="text-sm text-gray-500">Trigger: {rule.trigger_type}</p>
              </div>
              <button 
                onClick={() => toggleRule(rule.id, !rule.is_active)}
                className={`px-4 py-2 rounded ${rule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
              >
                {rule.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
          ))}
          {rules.length === 0 && <div className="p-8 text-center text-gray-500">No automation rules yet.</div>}
        </div>
      </div>
    </Layout>
  );
}
