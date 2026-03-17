import ProductEditorForm from '@/components/ProductEditorForm';
import { useLanguage } from '@/context/LanguageContext';
import type { ProductInput, UnitSystem } from '@/types';

interface AddProductFormProps {
  onAddProduct: (product: ProductInput) => void;
  unitSystem: UnitSystem;
  defaultCurrency?: string;
  recentUnits?: string[];
}

export default function AddProductForm({
  onAddProduct,
  unitSystem,
  defaultCurrency = 'CNY',
  recentUnits = [],
}: AddProductFormProps) {
  const { t } = useLanguage();

  const handleSubmit = (product: ProductInput) => {
    onAddProduct({
      ...product,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <ProductEditorForm
      unitSystem={unitSystem}
      defaultCurrency={defaultCurrency}
      submitLabel={t('add')}
      onSubmit={handleSubmit}
      initialProduct={undefined}
      onCancel={undefined}
      resetOnSubmit
      recentUnits={recentUnits}
      className="space-y-5"
    />
  );
}
