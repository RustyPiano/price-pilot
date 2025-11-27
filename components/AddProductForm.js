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
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* 商品名称 */}
            <div>
                <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">Product Name</label>
                <input
                    ref={nameRef}
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border-3 border-black rounded-none focus:shadow-neo transition-all text-base font-medium outline-none placeholder-gray-400"
                    placeholder="e.g. Cola 500ml"
                />
            </div>

            {/* 价格和数量行 */}
            <div className="grid grid-cols-2 gap-5">
                <div>
                    <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">Price</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black font-bold text-lg">
                            {currencies[formData.currency]}
                        </span>
                        <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-3 bg-white border-3 border-black rounded-none focus:shadow-neo transition-all text-base font-bold outline-none placeholder-gray-400"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">Qty</label>
                    <input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white border-3 border-black rounded-none focus:shadow-neo transition-all text-base font-bold outline-none placeholder-gray-400"
                        placeholder="0"
                        step="any"
                        min="0"
                    />
                </div>
            </div>

            {/* 单位选择 */}
            <div>
                <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">Unit</label>
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <select
                            name="unit"
                            value={formData.unit}
                            onChange={handleChange}
                            className="w-full appearance-none px-4 py-3 bg-white border-3 border-black rounded-none focus:shadow-neo transition-all text-base font-bold outline-none cursor-pointer"
                        >
                            {Object.entries(unitSystem).map(([type, info]) => (
                                <optgroup key={type} label={info.displayName}>
                                    {Object.entries(info.conversions).map(([code, unit]) => (
                                        <option key={code} value={code}>{unit.displayName}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-black">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="px-8 py-3 bg-primary-400 border-3 border-black text-black font-black uppercase tracking-wider rounded-none hover:-translate-y-1 hover:shadow-neo active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
                    >
                        ADD
                    </button>
                </div>
            </div>
        </form>
    );
}