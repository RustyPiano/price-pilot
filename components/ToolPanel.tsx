import { ArrowLeftRight, Settings } from 'lucide-react';
import UnitConverter from '@/components/UnitConverter';
import UnitManager from '@/components/UnitManager';
import { useLanguage } from '@/context/LanguageContext';
import type { UnitSystem } from '@/types';

export type ActivePanel = 'converter' | 'unit-manager' | null;

interface ToolPanelProps {
  activePanel: ActivePanel;
  onTogglePanel: (panel: Exclude<ActivePanel, null>) => void;
  unitSystem: UnitSystem;
  onUpdateUnits: (unitSystem: UnitSystem) => void;
}

export default function ToolPanel({
  activePanel,
  onTogglePanel,
  unitSystem,
  onUpdateUnits,
}: ToolPanelProps) {
  const { t } = useLanguage();

  return (
    <>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => onTogglePanel('converter')}
          className={`btn text-sm ${activePanel === 'converter' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <ArrowLeftRight className="h-4 w-4" />
          {t('unitConverter')}
        </button>
        <button
          type="button"
          onClick={() => onTogglePanel('unit-manager')}
          className={`btn text-sm ${activePanel === 'unit-manager' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Settings className="h-4 w-4" />
          {t('unitManager')}
        </button>
      </div>

      {activePanel === 'unit-manager' && (
        <div className="animate-fade-in">
          <UnitManager unitSystem={unitSystem} onUpdateUnits={onUpdateUnits} />
        </div>
      )}

      {activePanel === 'converter' && (
        <div className="animate-fade-in">
          <UnitConverter unitSystem={unitSystem} />
        </div>
      )}
    </>
  );
}
