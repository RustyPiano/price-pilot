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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-medium text-gray-800">单位管理</h2>
                <button onClick={resetToDefault} className="text-xs text-gray-400 hover:text-red-500">
                    重置
                </button>
            </div>

            {/* 单位类型标签 */}
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

            {/* 单位列表 */}
            <div className="space-y-2 mb-4">
                {Object.entries(unitSystem[selectedType].conversions).map(([code, unit]) => (
                    <div key={code} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div>
                            <span className="font-medium text-gray-700">{unit.displayName}</span>
                            <span className="text-xs text-gray-400 ml-2">
                                {code} = {unit.rate} {unitSystem[selectedType].baseUnit}
                            </span>
                        </div>
                        {code !== unitSystem[selectedType].baseUnit && (
                            <button
                                onClick={() => handleDeleteUnit(code)}
                                className="p-1 text-gray-300 hover:text-red-500"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
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
                    className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors text-sm"
                >
                    + 添加单位
                </button>
            ) : (
                <form onSubmit={handleAddUnit} className="space-y-3 p-3 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-2">
                        <input
                            type="text"
                            value={newUnit.code}
                            onChange={(e) => setNewUnit({ ...newUnit, code: e.target.value })}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                            placeholder="代码"
                        />
                        <input
                            type="text"
                            value={newUnit.displayName}
                            onChange={(e) => setNewUnit({ ...newUnit, displayName: e.target.value })}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                            placeholder="名称"
                        />
                        <input
                            type="number"
                            step="any"
                            value={newUnit.rate}
                            onChange={(e) => setNewUnit({ ...newUnit, rate: e.target.value })}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                            placeholder="转换率"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setShowAddUnit(false)} className="flex-1 py-2 text-gray-500 text-sm">
                            取消
                        </button>
                        <button type="submit" className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm">
                            添加
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
} 