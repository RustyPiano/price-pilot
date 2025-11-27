import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function UnitConverter({ unitSystem }) {
    const [selectedType, setSelectedType] = useState('weight');
    const [fromUnit, setFromUnit] = useState('');
    const [toUnit, setToUnit] = useState('');
    const [value, setValue] = useState('');
    const [result, setResult] = useState(null);

    useEffect(() => {
        const units = Object.keys(unitSystem[selectedType].conversions);
        setFromUnit(units[0]);
        setToUnit(units[1] || units[0]);
        setValue('');
        setResult(null);
    }, [selectedType, unitSystem]);

    const handleConvert = () => {
        if (!value || isNaN(value) || parseFloat(value) <= 0) {
            toast.error('请输入有效数值');
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
        <div className="bg-white border-3 border-black shadow-neo p-6">
            <h2 className="font-black text-xl text-black uppercase mb-6">Unit Converter</h2>

            {/* 单位类型 */}
            <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {Object.entries(unitSystem).map(([type, info]) => (
                    <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`px-4 py-2 border-3 border-black font-bold uppercase transition-all ${selectedType === type
                                ? 'bg-secondary-400 text-black shadow-none translate-x-[2px] translate-y-[2px]'
                                : 'bg-white text-black shadow-neo-sm hover:-translate-y-0.5 hover:shadow-neo'
                            }`}
                    >
                        {info.displayName}
                    </button>
                ))}
            </div>

            {/* 转换器 */}
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <input
                            type="number"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConvert()}
                            className="w-full px-4 py-3 bg-white border-3 border-black font-bold text-lg outline-none focus:shadow-neo transition-all placeholder-gray-400"
                            placeholder="Value"
                            step="any"
                            min="0"
                        />
                    </div>
                    <div className="relative w-32">
                        <select
                            value={fromUnit}
                            onChange={(e) => setFromUnit(e.target.value)}
                            className="w-full appearance-none px-4 py-3 bg-white border-3 border-black font-bold outline-none focus:shadow-neo transition-all cursor-pointer"
                        >
                            {Object.entries(unitSystem[selectedType].conversions).map(([code, unit]) => (
                                <option key={code} value={code}>{unit.displayName}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-black">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* 交换按钮 */}
                <div className="flex justify-center">
                    <button
                        onClick={handleSwap}
                        className="p-3 border-3 border-black bg-white hover:bg-primary-400 transition-all shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-full"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={result !== null ? formatNumber(result) : ''}
                            readOnly
                            className="w-full px-4 py-3 bg-surface-100 border-3 border-black font-black text-xl text-black outline-none"
                            placeholder="Result"
                        />
                    </div>
                    <div className="relative w-32">
                        <select
                            value={toUnit}
                            onChange={(e) => setToUnit(e.target.value)}
                            className="w-full appearance-none px-4 py-3 bg-white border-3 border-black font-bold outline-none focus:shadow-neo transition-all cursor-pointer"
                        >
                            {Object.entries(unitSystem[selectedType].conversions).map(([code, unit]) => (
                                <option key={code} value={code}>{unit.displayName}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-black">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleConvert}
                    className="w-full py-4 bg-black text-white font-black uppercase tracking-widest border-3 border-black hover:bg-gray-800 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shadow-neo transition-all text-lg"
                >
                    CONVERT
                </button>
            </div>
        </div>
    );
}