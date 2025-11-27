import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { defaultUnitSystem } from '../constants/unitSystem';

export default function UnitManager({ unitSystem, onUpdateUnits }) {
    const [selectedType, setSelectedType] = useState('weight');
    const [showAddUnit, setShowAddUnit] = useState(false);
    const [newUnit, setNewUnit] = useState({ code: '', displayName: '', rate: '' });

    const handleAddUnit = (e) => {
        e.preventDefault();

        if (!newUnit.code || !newUnit.displayName || !newUnit.rate) {
            toast.error('请填写完整信息');
            return;
        }

        const rate = parseFloat(newUnit.rate);
        if (isNaN(rate) || rate <= 0) {
            toast.error('请输入有效的转换率');
            return;
        }

        const updatedSystem = { ...unitSystem };
        updatedSystem[selectedType].conversions[newUnit.code] = { rate, displayName: newUnit.displayName };

        onUpdateUnits(updatedSystem);
        setNewUnit({ code: '', displayName: '', rate: '' });
        setShowAddUnit(false);
        toast.success('单位已添加');
    };

    const handleDeleteUnit = (unitCode) => {
        if (unitCode === unitSystem[selectedType].baseUnit) {
            toast.error('不能删除基准单位');
            return;
        }

        const updatedSystem = { ...unitSystem };
        delete updatedSystem[selectedType].conversions[unitCode];
        onUpdateUnits(updatedSystem);
        toast.success('单位已删除');
    };

    const resetToDefault = () => {
        if (confirm('确定重置所有单位设置吗？')) {
            onUpdateUnits(defaultUnitSystem);
        }
    };

    return (
        <div className="bg-white border-3 border-black shadow-neo p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-black text-xl text-black uppercase">Unit Manager</h2>
                <button
                    onClick={resetToDefault}
                    className="text-sm font-bold text-black hover:text-accent-500 hover:underline decoration-3 underline-offset-4 transition-colors"
                >
                    RESET DEFAULT
                </button>
            </div>

            {/* 单位类型标签 */}
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

            {/* 单位列表 */}
            <div className="space-y-3 mb-6">
                {Object.entries(unitSystem[selectedType].conversions).map(([code, unit]) => (
                    <div key={code} className="flex items-center justify-between p-4 bg-white border-3 border-black shadow-neo-sm">
                        <div>
                            <span className="font-black text-lg text-black mr-2">{unit.displayName}</span>
                            <span className="text-sm font-bold bg-black text-white px-2 py-0.5 font-mono">
                                {code} = {unit.rate} {unitSystem[selectedType].baseUnit}
                            </span>
                        </div>
                        {code !== unitSystem[selectedType].baseUnit && (
                            <button
                                onClick={() => handleDeleteUnit(code)}
                                className="p-1.5 border-3 border-black bg-white hover:bg-accent-500 hover:text-white transition-colors shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* 添加单位 */}
            {!showAddUnit ? (
                <button
                    onClick={() => setShowAddUnit(true)}
                    className="w-full py-3 border-3 border-dashed border-black text-black font-black uppercase hover:bg-primary-50 transition-all hover:border-solid"
                >
                    + Add New Unit
                </button>
            ) : (
                <form onSubmit={handleAddUnit} className="space-y-4 p-4 border-3 border-black bg-surface-100">
                    <div className="grid grid-cols-3 gap-4">
                        <input
                            type="text"
                            value={newUnit.code}
                            onChange={(e) => setNewUnit({ ...newUnit, code: e.target.value })}
                            className="px-3 py-2 bg-white border-3 border-black font-bold outline-none focus:shadow-neo transition-all"
                            placeholder="Code (kg)"
                        />
                        <input
                            type="text"
                            value={newUnit.displayName}
                            onChange={(e) => setNewUnit({ ...newUnit, displayName: e.target.value })}
                            className="px-3 py-2 bg-white border-3 border-black font-bold outline-none focus:shadow-neo transition-all"
                            placeholder="Name (Kilogram)"
                        />
                        <input
                            type="number"
                            step="any"
                            value={newUnit.rate}
                            onChange={(e) => setNewUnit({ ...newUnit, rate: e.target.value })}
                            className="px-3 py-2 bg-white border-3 border-black font-bold outline-none focus:shadow-neo transition-all"
                            placeholder="Rate (1000)"
                        />
                    </div>
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setShowAddUnit(false)}
                            className="flex-1 py-2 border-3 border-black bg-white font-bold uppercase hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2 bg-black text-white border-3 border-black font-bold uppercase hover:bg-gray-800 transition-colors shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                        >
                            Add Unit
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
} 