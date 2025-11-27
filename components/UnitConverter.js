import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { ChevronDown, ArrowUpDown } from 'lucide-react';

export default function UnitConverter({ unitSystem }) {
    const [selectedType, setSelectedType] = useState('weight');
    const [fromUnit, setFromUnit] = useState('');
    const [toUnit, setToUnit] = useState('');
    const [value, setValue] = useState('');
    const [result, setResult] = useState(null);
    const { t } = useLanguage();

    useEffect(() => {
        const units = Object.keys(unitSystem[selectedType].conversions);
        setFromUnit(units[0]);
        setToUnit(units[1] || units[0]);
        setValue('');
        setResult(null);
    }, [selectedType, unitSystem]);

    const handleConvert = () => {
        if (!value || isNaN(value) || parseFloat(value) <= 0) {
            toast.error(t('enterValidValue'));
            return;
        }

        const fromRate = unitSystem[selectedType].conversions[fromUnit].rate;
        const toRate = unitSystem[selectedType].conversions[toUnit].rate;
        const baseValue = parseFloat(value) * fromRate;
        const convertedValue = baseValue / toRate;
        setResult(convertedValue);
    };

    const handleSwap = () => {
        setFromUnit(toUnit);
        setToUnit(fromUnit);
        if (result !== null) {
            setValue(result.toString());
            setResult(parseFloat(value));
        }
    };

    const formatNumber = (num) => {
        return new Intl.NumberFormat('zh-CN', { maximumSignificantDigits: 6 }).format(num);
    };

    return (
        <div className="theme-card p-5">
            <h2 className="font-bold text-lg text-foreground mb-5">{t('unitConverter')}</h2>

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

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <input
                            type="number"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConvert()}
                            className="theme-input w-full font-medium text-base placeholder-gray-400"
                            placeholder={t('value')}
                            step="any"
                            min="0"
                        />
                    </div>
                    <div className="relative w-24 flex-shrink-0">
                        <select
                            value={fromUnit}
                            onChange={(e) => setFromUnit(e.target.value)}
                            className="theme-input w-full appearance-none pl-2 pr-7 font-medium text-sm cursor-pointer"
                        >
                            {Object.entries(unitSystem[selectedType].conversions).map(([code, unit]) => (
                                <option key={code} value={code}>{t(`units.${code}`) || unit.displayName}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-foreground" />
                    </div>
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={handleSwap}
                        className="w-9 h-9 flex items-center justify-center border-theme bg-surface hover:bg-primary transition-all shadow-theme-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-full"
                    >
                        <ArrowUpDown className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={result !== null ? formatNumber(result) : ''}
                            readOnly
                            className="w-full px-3 py-3 bg-surface-100 border-theme font-bold text-lg text-foreground outline-none rounded-theme"
                            placeholder={t('result')}
                        />
                    </div>
                    <div className="relative w-24 flex-shrink-0">
                        <select
                            value={toUnit}
                            onChange={(e) => setToUnit(e.target.value)}
                            className="theme-input w-full appearance-none pl-2 pr-7 font-medium text-sm cursor-pointer"
                        >
                            {Object.entries(unitSystem[selectedType].conversions).map(([code, unit]) => (
                                <option key={code} value={code}>{t(`units.${code}`) || unit.displayName}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-foreground" />
                    </div>
                </div>

                <button
                    onClick={handleConvert}
                    className="theme-btn w-full py-3 bg-foreground text-white font-semibold border-theme hover:bg-gray-800 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shadow-theme-base transition-all"
                >
                    {t('convert')}
                </button>
            </div>
        </div>
    );
}