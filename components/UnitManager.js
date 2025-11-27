import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { defaultUnitSystem } from '../constants/unitSystem';
import { useLanguage } from '../context/LanguageContext';
import { X, Plus } from 'lucide-react';

export default function UnitManager({ unitSystem, onUpdateUnits }) {
    const [selectedType, setSelectedType] = useState('weight');
    const [showAddUnit, setShowAddUnit] = useState(false);
    const [newUnit, setNewUnit] = useState({ code: '', displayName: '', rate: '' });
    const { t } = useLanguage();

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

        const updatedSystem = { ...unitSystem };
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

        const updatedSystem = { ...unitSystem };
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
        <div className="theme-card p-5">
            <div className="flex justify-between items-center mb-5">
                <h2 className="font-bold text-lg text-foreground">{t('unitManager')}</h2>
                <button
                    onClick={resetToDefault}
                    className="text-sm font-medium text-foreground hover:text-accent transition-colors"
                >
                    {t('resetDefault')}
                </button>
            </div>

            <div className="flex gap-2 mb-5 overflow-x-auto pb-2 scrollbar-hide">
                {Object.entries(unitSystem).map(([type, info]) => (
                    <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`px-3 py-2 border-theme font-medium text-sm transition-all rounded-theme whitespace-nowrap ${selectedType === type
                                ? 'bg-secondary text-foreground shadow-none translate-x-[2px] translate-y-[2px]'
                                : 'bg-surface text-foreground shadow-theme-sm hover:-translate-y-0.5 hover:shadow-theme-base'
                            }`}
                    >
                        {t(`unitTypes.${type}`) || info.displayName}
                    </button>
                ))}
            </div>

            <div className="space-y-2 mb-5">
                {Object.entries(unitSystem[selectedType].conversions).map(([code, unit]) => (
                    <div key={code} className="flex items-center justify-between p-3 bg-surface border-theme shadow-theme-sm rounded-theme">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="font-semibold text-foreground">{t(`units.${code}`) || unit.displayName}</span>
                            <span className="text-xs font-medium bg-foreground text-white px-2 py-0.5 font-mono rounded-theme whitespace-nowrap">
                                {code} = {unit.rate} {unitSystem[selectedType].baseUnit}
                            </span>
                        </div>
                        {code !== unitSystem[selectedType].baseUnit && (
                            <button
                                onClick={() => handleDeleteUnit(code)}
                                className="w-8 h-8 flex items-center justify-center flex-shrink-0 ml-2 border-theme bg-surface hover:bg-accent hover:text-white transition-colors shadow-theme-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {!showAddUnit ? (
                <button
                    onClick={() => setShowAddUnit(true)}
                    className="w-full py-3 border-theme border-dashed text-foreground font-medium hover:bg-surface-100 transition-all hover:border-solid rounded-theme flex items-center justify-center gap-1"
                >
                    <Plus className="w-4 h-4" />
                    {t('addNewUnit')}
                </button>
            ) : (
                <form onSubmit={handleAddUnit} className="space-y-3 p-4 border-theme bg-surface-100 rounded-theme">
                    <div className="grid grid-cols-3 gap-2">
                        <input
                            type="text"
                            value={newUnit.code}
                            onChange={(e) => setNewUnit({ ...newUnit, code: e.target.value })}
                            className="theme-input font-medium text-sm"
                            placeholder={t('codePlaceholder')}
                        />
                        <input
                            type="text"
                            value={newUnit.displayName}
                            onChange={(e) => setNewUnit({ ...newUnit, displayName: e.target.value })}
                            className="theme-input font-medium text-sm"
                            placeholder={t('namePlaceholder')}
                        />
                        <input
                            type="number"
                            step="any"
                            value={newUnit.rate}
                            onChange={(e) => setNewUnit({ ...newUnit, rate: e.target.value })}
                            className="theme-input font-medium text-sm"
                            placeholder={t('ratePlaceholder')}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setShowAddUnit(false)}
                            className="flex-1 py-2 border-theme bg-surface font-medium text-sm hover:bg-gray-100 transition-colors rounded-theme"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2 bg-foreground text-white border-theme font-medium text-sm hover:bg-gray-800 transition-colors shadow-theme-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme"
                        >
                            {t('addUnit')}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}