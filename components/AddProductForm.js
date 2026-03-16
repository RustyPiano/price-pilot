import { useLanguage } from '../context/LanguageContext';
import ProductEditorForm from './ProductEditorForm';

export default function AddProductForm({ onAddProduct, unitSystem, defaultCurrency = 'CNY', recentUnits = [] }) {
    const { t } = useLanguage();

    const handleSubmit = (product) => {
        onAddProduct({
            ...product,
            timestamp: new Date().toISOString()
        });
    };

    return (
        <ProductEditorForm
            unitSystem={unitSystem}
            defaultCurrency={defaultCurrency}
            submitLabel={t('add')}
            onSubmit={handleSubmit}
            resetOnSubmit
            autoFocus
            recentUnits={recentUnits}
            className="space-y-5"
        />
    );
}
