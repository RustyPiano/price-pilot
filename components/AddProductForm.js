import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { ChevronDown } from 'lucide-react';

export default function AddProductForm({ onAddProduct, unitSystem, defaultCurrency = 'CNY' }) {
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        quantity: '',
        unit: 'g',
        currency: defaultCurrency,
    });
    const nameRef = useRef(null);
    const { t } = useLanguage();

    useEffect(() => {
        setFormData(prev => ({ ...prev, currency: defaultCurrency }));
    }, [defaultCurrency]);

    const currencies = { CNY: '¥', USD: '$', EUR: '€', GBP: '£', JPY: '¥' };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.price || !formData.quantity || !formData.unit) {
            toast.error(t('fillComplete'));
            return;
        }

        const price = parseFloat(formData.price);
        const quantity = parseFloat(formData.quantity);

        if (price <= 0 || quantity <= 0) {
            toast.error(t('invalidPriceQty'));
            return;
        }

        onAddProduct({
            ...formData,
            name: formData.name.trim(),
            price,
            quantity,
            timestamp: new Date().toISOString()
        });

        setFormData(prev => ({
            name: '',
            price: '',
            quantity: '',
            unit: prev.unit,
            currency: prev.currency,
        }));
        nameRef.current?.focus();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* 商品名称 */}
            <div>
                <label className="block text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">{t('productName')}</label>
                <input
                    ref={nameRef}
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="theme-input w-full text-base font-medium placeholder-gray-400"
                    placeholder={t('productNamePlaceholder')}
                />
            </div>

            {/* 价格和数量行 */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">{t('price')}</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground font-semibold text-sm pointer-events-none z-10">
                            {currencies[formData.currency]}
                        </span>
                        <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            className="theme-input w-full pl-14 pr-3 text-base font-medium placeholder-gray-400"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">{t('quantity')}</label>
                    <input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        className="theme-input w-full px-3 text-base font-medium placeholder-gray-400"
                        placeholder="0"
                        step="any"
                        min="0"
                    />
                </div>
            </div>

            {/* 单位选择 */}
            <div>
                <label className="block text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">{t('unit')}</label>
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <select
                            name="unit"
                            value={formData.unit}
                            onChange={handleChange}
                            className="theme-input w-full appearance-none pl-3 pr-12 text-base font-medium cursor-pointer"
                        >
                            {Object.entries(unitSystem).map(([type, info]) => (
                                <optgroup key={type} label={t(`unitTypes.${type}`) || info.displayName}>
                                    {Object.entries(info.conversions).map(([code, unit]) => (
                                        <option key={code} value={code}>{t(`units.${code}`) || unit.displayName}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-foreground" />
                    </div>
                    <button
                        type="submit"
                        className="theme-btn theme-btn-primary px-6 py-3 uppercase tracking-wider text-sm font-semibold"
                    >
                        {t('add')}
                    </button>
                </div>
            </div>
        </form>
    );
}