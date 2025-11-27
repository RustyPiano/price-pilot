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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="font-medium text-gray-800 mb-4">单位转换</h2>

            {/* 单位类型 */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {Object.entries(unitSystem).map(([type, info]) => (
                    <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                            selectedType === type
                                ? 'bg-blue-100 text-blue-600 font-medium'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {info.displayName}
                    </button>
                ))}
            </div>

            {/* 转换器 */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <input
                            type="number"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConvert()}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                            placeholder="输入数值"
                            step="any"
                            min="0"
                        />
                    </div>
                    <select
                        value={fromUnit}
                        onChange={(e) => setFromUnit(e.target.value)}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    >
                        {Object.entries(unitSystem[selectedType].conversions).map(([code, unit]) => (
                            <option key={code} value={code}>{unit.displayName}</option>
                        ))}
                    </select>
                </div>

                {/* 交换按钮 */}
                <div className="flex justify-center">
                    <button
                        onClick={handleSwap}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={result !== null ? formatNumber(result) : ''}
                            readOnly
                            className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium"
                            placeholder="转换结果"
                        />
                    </div>
                    <select
                        value={toUnit}
                        onChange={(e) => setToUnit(e.target.value)}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    >
                        {Object.entries(unitSystem[selectedType].conversions).map(([code, unit]) => (
                            <option key={code} value={code}>{unit.displayName}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleConvert}
                    className="w-full py-2.5 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 active:scale-98 transition-all text-sm"
                >
                    转换
                </button>
            </div>
        </div>
    );
} 