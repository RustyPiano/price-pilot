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
  const { t, locale } = useLanguage();

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
    return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', { maximumSignificantDigits: 6 }).format(num);
  };

  return (
    <div className="panel p-5">
      <div className="mb-5 space-y-1">
        <h2 className="section-title">{t('unitConverter')}</h2>
        <p className="section-description">{t('convert')}</p>
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

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label htmlFor="unit-converter-value" className="sr-only">{t('value')}</label>
            <input
              id="unit-converter-value"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConvert()}
              className="input font-medium text-base"
              placeholder={t('value')}
              step="any"
              min="0"
            />
          </div>
          <div className="relative w-24 flex-shrink-0">
            <label htmlFor="unit-converter-from" className="sr-only">{locale === 'zh' ? '源单位' : 'From unit'}</label>
            <select
              id="unit-converter-from"
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              className="input appearance-none pr-9 text-sm font-medium cursor-pointer"
            >
              {Object.entries(unitSystem[selectedType].conversions).map(([code, unit]) => (
                <option key={code} value={code}>{t(`units.${code}`) || unit.displayName}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleSwap}
            aria-label={locale === 'zh' ? '交换换算单位' : 'Swap units'}
            className="icon-btn"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label htmlFor="unit-converter-result" className="sr-only">{t('result')}</label>
            <input
              id="unit-converter-result"
              type="text"
              value={result !== null ? formatNumber(result) : ''}
              readOnly
              className="input bg-surface-100 font-semibold text-lg"
              placeholder={t('result')}
            />
          </div>
          <div className="relative w-24 flex-shrink-0">
            <label htmlFor="unit-converter-to" className="sr-only">{locale === 'zh' ? '目标单位' : 'To unit'}</label>
            <select
              id="unit-converter-to"
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
              className="input appearance-none pr-9 text-sm font-medium cursor-pointer"
            >
              {Object.entries(unitSystem[selectedType].conversions).map(([code, unit]) => (
                <option key={code} value={code}>{t(`units.${code}`) || unit.displayName}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
        </div>

        <button
          type="button"
          onClick={handleConvert}
          className="btn btn-primary w-full"
        >
          {t('convert')}
        </button>
      </div>
    </div>
  );
}
