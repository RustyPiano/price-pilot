import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function AddProductForm({ onAddProduct, unitSystem, defaultCurrency = 'CNY' }) {
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        quantity: '',
        unit: 'g',
        currency: defaultCurrency,
    });
    const nameRef = useRef(null);

    useEffect(() => {
        setFormData(prev => ({ ...prev, currency: defaultCurrency }));
    }, [defaultCurrency]);

    const currencies = { CNY: '¥', USD: '$', EUR: '€', GBP: '£', JPY: '¥' };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.name.trim() || !formData.price || !formData.quantity || !formData.unit) {
            toast.error('请填写完整信息');
            return;
        }

        const price = parseFloat(formData.price);
        const quantity = parseFloat(formData.quantity);
        
        if (price <= 0 || quantity <= 0) {
            toast.error('价格和数量必须大于0');
            return;
        }

        onAddProduct({
            ...formData,
            name: formData.name.trim(),
            price,
            quantity,
            timestamp: new Date().toISOString()
        });
        
        // 重置表单，保留单位和货币
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
        <form onSubmit={handleSubmit} className="space-y-3">
            {/* 商品名称 */}
            <input
                ref={nameRef}
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="商品名称"
            />

            {/* 价格和数量行 */}
            <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        {currencies[formData.currency]}
                    </span>
                    <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        className="w-full pl-7 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="价格"
                        step="0.01"
                        min="0"
                    />
                </div>
                <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="数量"
                    step="any"
                    min="0"
                />
            </div>

            {/* 单位选择 */}
            <div className="flex gap-3">
                <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                    {Object.entries(unitSystem).map(([type, info]) => (
                        <optgroup key={type} label={info.displayName}>
                            {Object.entries(info.conversions).map(([code, unit]) => (
                                <option key={code} value={code}>{unit.displayName}</option>
                            ))}
                        </optgroup>
                    ))}
                </select>
                <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all text-sm"
                >
                    添加
                </button>
            </div>
        </form>
    );
}