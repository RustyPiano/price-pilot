import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { parseSmartProductInput } from '../lib/smart-product-parser';

const currencySymbols = {
    CNY: '¥',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    AUD: 'A$',
    CAD: 'C$',
    CHF: 'CHF',
    HKD: 'HK$',
    NZD: 'NZ$',
    SGD: 'S$',
};

const invalidNumberKeys = new Set(['e', 'E', '+', '-']);

const getDefaultUnit = (unitSystem) => Object.values(unitSystem)[0]?.baseUnit || 'g';

const buildFormData = (initialProduct, defaultCurrency, unitSystem) => ({
    name: initialProduct?.name || '',
    price: initialProduct?.price?.toString() || '',
    quantity: initialProduct?.quantity?.toString() || '',
    unit: initialProduct?.unit || getDefaultUnit(unitSystem),
    currency: initialProduct?.currency || defaultCurrency,
});

export default function ProductEditorForm({
    initialProduct,
    unitSystem,
    defaultCurrency = 'CNY',
    submitLabel,
    onSubmit,
    onCancel,
    resetOnSubmit = false,
    autoFocus = false,
    compact = false,
    recentUnits = [],
    className = '',
}) {
    const [formData, setFormData] = useState(() => buildFormData(initialProduct, defaultCurrency, unitSystem));
    const nameRef = useRef(null);
    const { t } = useLanguage();
    const formIdPrefix = useMemo(
        () => initialProduct?.id || `product-form-${defaultCurrency.toLowerCase()}`,
        [defaultCurrency, initialProduct?.id]
    );
    const nameInputId = `${formIdPrefix}-name`;
    const priceInputId = `${formIdPrefix}-price`;
    const quantityInputId = `${formIdPrefix}-quantity`;
    const unitInputId = `${formIdPrefix}-unit`;

    useEffect(() => {
        if (initialProduct) {
            setFormData(buildFormData(initialProduct, defaultCurrency, unitSystem));
            return;
        }

        setFormData((prev) => ({
            ...prev,
            unit: prev.unit || getDefaultUnit(unitSystem),
            currency: defaultCurrency,
        }));
    }, [initialProduct, defaultCurrency, unitSystem]);

    useEffect(() => {
        if (autoFocus) {
            nameRef.current?.focus();
        }
    }, [autoFocus, initialProduct]);

    const orderedUnitGroups = useMemo(() => {
        const recentUnitIndex = new Map(recentUnits.map((unit, index) => [unit, index]));

        return Object.entries(unitSystem).map(([type, info]) => ({
            type,
            info,
            conversions: Object.entries(info.conversions).sort(([codeA], [codeB]) => {
                const rankA = recentUnitIndex.has(codeA) ? recentUnitIndex.get(codeA) : Number.POSITIVE_INFINITY;
                const rankB = recentUnitIndex.has(codeB) ? recentUnitIndex.get(codeB) : Number.POSITIVE_INFINITY;

                if (rankA !== rankB) {
                    return rankA - rankB;
                }

                return codeA.localeCompare(codeB);
            }),
        }));
    }, [recentUnits, unitSystem]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!formData.name.trim() || !formData.price || !formData.quantity || !formData.unit) {
            toast.error(t('fillComplete'));
            return;
        }

        const price = parseFloat(formData.price);
        const quantity = parseFloat(formData.quantity);

        if (Number.isNaN(price) || Number.isNaN(quantity) || price <= 0 || quantity <= 0) {
            toast.error(t('invalidPriceQty'));
            return;
        }

        onSubmit({
            ...initialProduct,
            ...formData,
            name: formData.name.trim(),
            price,
            quantity,
            currency: formData.currency || defaultCurrency,
        });

        if (resetOnSubmit) {
            setFormData((prev) => ({
                name: '',
                price: '',
                quantity: '',
                unit: prev.unit,
                currency: prev.currency,
            }));
            nameRef.current?.focus();
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Escape' && onCancel) {
            event.preventDefault();
            onCancel();
        }
    };

    const handleNumberKeyDown = (event) => {
        if (invalidNumberKeys.has(event.key)) {
            event.preventDefault();
        }
    };

    const handleSmartParse = () => {
        const parsedProduct = parseSmartProductInput(formData.name, defaultCurrency);

        if (!parsedProduct) {
            toast.error(t('smartParseError'));
            return;
        }

        setFormData((prev) => ({
            ...prev,
            name: parsedProduct.name,
            price: parsedProduct.price.toString(),
            quantity: parsedProduct.quantity.toString(),
            unit: parsedProduct.unit,
            currency: parsedProduct.currency,
        }));
        toast.success(t('smartParseSuccess'));
    };

    const labelClassName = compact
        ? 'block text-xs font-semibold text-foreground mb-2 uppercase tracking-wide'
        : 'block text-sm font-semibold text-foreground mb-2 uppercase tracking-wide';
    const inputClassName = compact
        ? 'theme-input w-full text-sm font-medium placeholder-gray-400'
        : 'theme-input w-full text-base font-medium placeholder-gray-400';

    return (
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className={`space-y-4 ${className}`}>
            <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                    <label htmlFor={nameInputId} className={`${labelClassName} mb-0`}>{t('productName')}</label>
                    <button
                        type="button"
                        onClick={handleSmartParse}
                        className="text-xs font-semibold uppercase tracking-wide text-foreground hover:text-accent transition-colors"
                    >
                        {t('smartParseAction')}
                    </button>
                </div>
                <input
                    id={nameInputId}
                    ref={nameRef}
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={inputClassName}
                    placeholder={t('productNamePlaceholder')}
                />
                <p className="mt-2 text-xs text-gray-500">{t('smartParseHint')}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor={priceInputId} className={labelClassName}>{t('price')}</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground font-semibold text-sm pointer-events-none z-10">
                            {currencySymbols[formData.currency]}
                        </span>
                        <input
                            id={priceInputId}
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            onKeyDown={handleNumberKeyDown}
                            inputMode="decimal"
                            className={`${inputClassName} pl-14 pr-3`}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor={quantityInputId} className={labelClassName}>{t('quantity')}</label>
                    <input
                        id={quantityInputId}
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        onKeyDown={handleNumberKeyDown}
                        inputMode="decimal"
                        className={`${inputClassName} px-3`}
                        placeholder="0"
                        step="any"
                        min="0"
                    />
                </div>
            </div>

            <div>
                <label htmlFor={unitInputId} className={labelClassName}>{t('unit')}</label>
                <div className={`flex ${onCancel ? 'flex-col sm:flex-row' : 'gap-3'} gap-3`}>
                    <div className="relative flex-1">
                        <select
                            id={unitInputId}
                            name="unit"
                            value={formData.unit}
                            onChange={handleChange}
                            className={`${inputClassName} appearance-none pl-3 pr-12 cursor-pointer`}
                        >
                            {orderedUnitGroups.map(({ type, info, conversions }) => (
                                <optgroup key={type} label={t(`unitTypes.${type}`) || info.displayName}>
                                    {conversions.map(([code, unit]) => (
                                        <option key={code} value={code}>
                                            {t(`units.${code}`) || unit.displayName}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-foreground" />
                    </div>
                    <div className={`flex ${onCancel ? 'sm:w-auto' : ''} gap-3`}>
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="theme-btn px-4 py-3 text-sm font-semibold text-foreground bg-surface"
                            >
                                {t('cancel')}
                            </button>
                        )}
                        <button
                            type="submit"
                            className="theme-btn theme-btn-primary px-6 py-3 uppercase tracking-wider text-sm font-semibold"
                        >
                            {submitLabel}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}
