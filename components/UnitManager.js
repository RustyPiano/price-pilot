import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { defaultUnitSystem } from '../constants/unitSystem';
import { useLanguage } from '../context/LanguageContext';
import { X, Plus } from 'lucide-react';

export default function UnitManager({ unitSystem, onUpdateUnits }) {
  const [selectedType, setSelectedType] = useState('weight');
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnit, setNewUnit] = useState({ code: '', displayName: '', rate: '' });
  const { t, locale } = useLanguage();

  const handleAddUnit = (e) => {
    e.preventDefault();

    if (!newUnit.code || !newUnit.displayName || !newUnit.rate) {
      toast.error(t('fillComplete'));
      return;
    }

    const rate = parseFloat(newUnit.rate);
    if (isNaN(rate) || rate <= 0) {
      toast.error(t('enterValidRate'));
      return;
    }

    const updatedSystem = structuredClone(unitSystem);
    updatedSystem[selectedType].conversions[newUnit.code] = { rate, displayName: newUnit.displayName };

    onUpdateUnits(updatedSystem);
    setNewUnit({ code: '', displayName: '', rate: '' });
    setShowAddUnit(false);
    toast.success(t('unitAdded'));
  };

  const handleDeleteUnit = (unitCode) => {
    if (unitCode === unitSystem[selectedType].baseUnit) {
      toast.error(t('cannotDeleteBase'));
      return;
    }

    const updatedSystem = structuredClone(unitSystem);
    delete updatedSystem[selectedType].conversions[unitCode];
    onUpdateUnits(updatedSystem);
    toast.success(t('unitDeleted'));
  };

  const resetToDefault = () => {
    if (confirm(t('confirmReset'))) {
      onUpdateUnits(defaultUnitSystem);
    }
  };

  return (
    <div className="panel p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="section-title">{t('unitManager')}</h2>
          <p className="section-description">{t('addNewUnit')}</p>
        </div>
        <button
          type="button"
          onClick={resetToDefault}
          className="btn btn-secondary text-sm"
        >
          {t('resetDefault')}
        </button>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {Object.entries(unitSystem).map(([type, info]) => (
          <button
            key={type}
            type="button"
            onClick={() => setSelectedType(type)}
            className={`btn whitespace-nowrap px-3 text-sm ${selectedType === type ? 'btn-primary' : 'btn-secondary'}`}
          >
            {t(`unitTypes.${type}`) || info.displayName}
          </button>
        ))}
      </div>

      <div className="mb-5 space-y-2">
        {Object.entries(unitSystem[selectedType].conversions).map(([code, unit]) => (
          <div key={code} className="subpanel flex items-center justify-between p-3">
            <div className="min-w-0 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">{t(`units.${code}`) || unit.displayName}</span>
              <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted">
                {code} = {unit.rate} {unitSystem[selectedType].baseUnit}
              </span>
            </div>
            {code !== unitSystem[selectedType].baseUnit && (
              <button
                type="button"
                onClick={() => handleDeleteUnit(code)}
                aria-label={locale === 'zh' ? `删除单位 ${code}` : `Delete unit ${code}`}
                className="icon-btn icon-btn-danger ml-2"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {!showAddUnit ? (
        <button
          type="button"
          onClick={() => setShowAddUnit(true)}
          className="btn btn-secondary w-full"
        >
          <Plus className="h-4 w-4" />
          {t('addNewUnit')}
        </button>
      ) : (
        <form onSubmit={handleAddUnit} className="subpanel space-y-3 p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label htmlFor="new-unit-code" className="sr-only">{locale === 'zh' ? '单位代号' : 'Unit code'}</label>
            <input
              id="new-unit-code"
              type="text"
              value={newUnit.code}
              onChange={(e) => setNewUnit({ ...newUnit, code: e.target.value })}
              className="input font-medium text-sm"
              placeholder={t('codePlaceholder')}
            />
            <label htmlFor="new-unit-name" className="sr-only">{locale === 'zh' ? '单位名称' : 'Unit name'}</label>
            <input
              id="new-unit-name"
              type="text"
              value={newUnit.displayName}
              onChange={(e) => setNewUnit({ ...newUnit, displayName: e.target.value })}
              className="input font-medium text-sm"
              placeholder={t('namePlaceholder')}
            />
            <label htmlFor="new-unit-rate" className="sr-only">{locale === 'zh' ? '单位换算率' : 'Unit conversion rate'}</label>
            <input
              id="new-unit-rate"
              type="number"
              step="any"
              value={newUnit.rate}
              onChange={(e) => setNewUnit({ ...newUnit, rate: e.target.value })}
              className="input font-medium text-sm"
              placeholder={t('ratePlaceholder')}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAddUnit(false)}
              className="btn btn-secondary flex-1 text-sm"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1 text-sm"
            >
              {t('addUnit')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
