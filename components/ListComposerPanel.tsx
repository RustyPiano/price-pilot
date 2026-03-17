import AddProductForm from '@/components/AddProductForm';
import CurrencySelector from '@/components/CurrencySelector';
import ToolPanel, { type ActivePanel } from '@/components/ToolPanel';
import { useLanguage } from '@/context/LanguageContext';
import { Plus } from 'lucide-react';
import type { ProductInput, UnitSystem } from '@/types';

interface ListComposerPanelProps {
  activePanel: ActivePanel;
  highlightForm: boolean;
  baseCurrency: string;
  unitSystem: UnitSystem;
  recentUnits: string[];
  onAddProduct: (product: ProductInput) => void;
  onCurrencyChange: (currency: string) => void;
  onTogglePanel: (panel: Exclude<ActivePanel, null>) => void;
  onUpdateUnits: (unitSystem: UnitSystem) => void;
}

export default function ListComposerPanel({
  activePanel,
  highlightForm,
  baseCurrency,
  unitSystem,
  recentUnits,
  onAddProduct,
  onCurrencyChange,
  onTogglePanel,
  onUpdateUnits,
}: ListComposerPanelProps) {
  const { t } = useLanguage();

  return (
    <div className={`panel space-y-4 p-4 sm:p-5 ${highlightForm ? 'panel-highlight' : ''}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="section-title flex items-center gap-2">
            <Plus className="h-4 w-4 text-brand" />
            {t('addItem')}
          </h2>
          <p className="section-description">{t('addItemsToCompare')}</p>
        </div>

        <div className="w-full sm:w-auto">
          <CurrencySelector onCurrencyChange={onCurrencyChange} defaultCurrency={baseCurrency} />
        </div>
      </div>

      <AddProductForm
        onAddProduct={onAddProduct}
        unitSystem={unitSystem}
        defaultCurrency={baseCurrency}
        recentUnits={recentUnits}
      />

      <ToolPanel
        activePanel={activePanel}
        onTogglePanel={onTogglePanel}
        unitSystem={unitSystem}
        onUpdateUnits={onUpdateUnits}
      />
    </div>
  );
}
