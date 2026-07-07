import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/context/LanguageContext';
import { getComparisonList } from '@/lib/comparison-lists';
import { translations } from '@/constants/translations';
import QuickCompare from '@/components/QuickCompare';

const zh = translations.zh;

// 翻译字典里除 `sampleProducts` 外的取值理论上都是字符串, 但类型上是联合类型;
// 这里的取值方式复刻 LanguageContext 里 `t()` 的兜底逻辑 (非字符串则退回 key 本身)。
function tzh(key: string): string {
  const value = zh[key];
  return typeof value === 'string' ? value : key;
}

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/router', () => ({
  useRouter: () => ({ push }),
}));

const { toast } = vi.hoisted(() => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({ toast }));

// `LanguageProvider` 和「存为清单」都会读写 window.localStorage, jsdom 环境下默认未提供,
// 沿用 tests/lib/comparison-lists.test.ts 的内存 mock 惯例。
function installStorageMock() {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key) ?? null : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };

  Object.defineProperty(window, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
}

async function resetDatabase() {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('price-pilot');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function renderQuickCompare() {
  render(
    <LanguageProvider>
      <QuickCompare />
    </LanguageProvider>
  );
}

// 顺序对应 DOM 顺序: 每行先价格后数量, 行与行之间按序排列。
function getInputs(): HTMLInputElement[] {
  return screen.getAllByRole('textbox') as HTMLInputElement[];
}

function nthInput(index: number): HTMLInputElement {
  const input = getInputs()[index];
  if (!input) {
    throw new Error(`Expected an input at index ${index}.`);
  }
  return input;
}

describe('QuickCompare', () => {
  beforeEach(async () => {
    installStorageMock();
    await resetDatabase();
    push.mockReset();
    toast.error.mockReset();
  });

  afterEach(async () => {
    await resetDatabase();
  });

  it('renders two empty rows initially', () => {
    renderQuickCompare();

    const inputs = getInputs();
    expect(inputs).toHaveLength(4);
    inputs.forEach((input) => expect(input).toHaveValue(''));
    expect(screen.queryByRole('button', { name: tzh('quickCompareSaveAction') })).not.toBeInTheDocument();
  });

  it('filters out letters and collapses a second decimal point', () => {
    renderQuickCompare();

    const priceA = nthInput(0);

    fireEvent.change(priceA, { target: { value: 'abc' } });
    expect(priceA).toHaveValue('');

    fireEvent.change(priceA, { target: { value: '1..2' } });
    expect(priceA).toHaveValue('1.2');
  });

  it('shows a result banner with a best-value badge and the correct markup once two rows are valid', () => {
    renderQuickCompare();

    const priceA = nthInput(0);
    const quantityA = nthInput(1);
    const priceB = nthInput(2);
    const quantityB = nthInput(3);

    fireEvent.change(priceA, { target: { value: '10' } });
    fireEvent.change(quantityA, { target: { value: '2' } }); // 单价 5
    fireEvent.change(priceB, { target: { value: '30' } });
    fireEvent.change(quantityB, { target: { value: '3' } }); // 单价 10, 比 A 贵 100%

    expect(screen.getByText(tzh('quickCompareBestBadge'))).toBeInTheDocument();
    expect(screen.getByText(tzh('quickCompareWorseBadge').replace('{pct}', '100'))).toBeInTheDocument();

    const winnerName = `${tzh('quickCompareItemLabel')} A`;
    const bannerText = tzh('quickCompareWinnerLine').replace('{name}', winnerName).replace('{pct}', '100');
    expect(screen.getByText(bannerText)).toBeInTheDocument();
  });

  it('auto-appends a row once the last row is filled, capping at 6 rows with a limit hint', () => {
    renderQuickCompare();

    expect(getInputs()).toHaveLength(4); // 初始 2 行

    // 依次填满每个新出现的末行 (第 2~5 行), 每次都应自动追加一行新的空行。
    for (let round = 0; round < 4; round += 1) {
      const before = getInputs();
      const lastPriceIndex = before.length - 2;
      fireEvent.change(nthInput(lastPriceIndex), { target: { value: '10' } });
      fireEvent.change(nthInput(lastPriceIndex + 1), { target: { value: '2' } });

      expect(getInputs()).toHaveLength(before.length + 2);
    }

    // 已到 6 行上限, 但第 6 行本身还是空的, 尚不该出现上限提示。
    expect(getInputs()).toHaveLength(12);
    expect(screen.queryByText(tzh('quickCompareLimitHint'))).not.toBeInTheDocument();

    // 填满第 6 行 (此时已到 MAX_ROWS, 不再追加新行) 才应出现上限提示。
    const lastPriceIndex = getInputs().length - 2;
    fireEvent.change(nthInput(lastPriceIndex), { target: { value: '10' } });
    fireEvent.change(nthInput(lastPriceIndex + 1), { target: { value: '2' } });

    expect(getInputs()).toHaveLength(12); // 行数不再增加
    expect(screen.getByText(tzh('quickCompareLimitHint'))).toBeInTheDocument();
  });

  it('moves focus to the next field when Enter is pressed', () => {
    renderQuickCompare();

    const priceA = nthInput(0);
    const quantityA = nthInput(1);
    const priceB = nthInput(2);

    fireEvent.keyDown(priceA, { key: 'Enter' });
    expect(document.activeElement).toBe(quantityA);

    fireEvent.keyDown(quantityA, { key: 'Enter' });
    expect(document.activeElement).toBe(priceB);
  });

  it('hides the save-as-list action until at least two rows are valid', () => {
    renderQuickCompare();

    expect(screen.queryByRole('button', { name: tzh('quickCompareSaveAction') })).not.toBeInTheDocument();

    const priceA = nthInput(0);
    const quantityA = nthInput(1);
    fireEvent.change(priceA, { target: { value: '10' } });
    fireEvent.change(quantityA, { target: { value: '2' } });

    expect(screen.queryByRole('button', { name: tzh('quickCompareSaveAction') })).not.toBeInTheDocument();
  });

  it('saves the valid rows as a comparison list and navigates to its detail page', async () => {
    renderQuickCompare();

    const priceA = nthInput(0);
    const quantityA = nthInput(1);
    const priceB = nthInput(2);
    const quantityB = nthInput(3);
    fireEvent.change(priceA, { target: { value: '10' } });
    fireEvent.change(quantityA, { target: { value: '2' } });
    fireEvent.change(priceB, { target: { value: '30' } });
    fireEvent.change(quantityB, { target: { value: '3' } });

    const saveButton = screen.getByRole('button', { name: tzh('quickCompareSaveAction') });
    fireEvent.click(saveButton);

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(toast.error).not.toHaveBeenCalled();

    const pushedPath = push.mock.calls[0]?.[0] as string;
    expect(pushedPath).toMatch(/^\/list\/.+/);

    const savedId = pushedPath.replace('/list/', '');
    const savedList = await getComparisonList(savedId);
    expect(savedList?.products).toHaveLength(2);
    expect(savedList?.products.map((product) => product.name)).toEqual([
      `${tzh('quickCompareItemLabel')} A`,
      `${tzh('quickCompareItemLabel')} B`,
    ]);
    expect(savedList?.baseCurrency).toBe('CNY');
  });

  it('restores the initial two empty rows when reset is clicked', () => {
    renderQuickCompare();

    const priceA = nthInput(0);
    const quantityA = nthInput(1);
    const priceB = nthInput(2);
    const quantityB = nthInput(3);
    fireEvent.change(priceA, { target: { value: '10' } });
    fireEvent.change(quantityA, { target: { value: '2' } });
    fireEvent.change(priceB, { target: { value: '30' } });
    fireEvent.change(quantityB, { target: { value: '3' } });

    expect(getInputs()).toHaveLength(6); // 已因末行填满追加第 3 行

    fireEvent.click(screen.getByRole('button', { name: tzh('quickCompareResetAction') }));

    const inputs = getInputs();
    expect(inputs).toHaveLength(4);
    inputs.forEach((input) => expect(input).toHaveValue(''));
    expect(screen.queryByRole('button', { name: tzh('quickCompareSaveAction') })).not.toBeInTheDocument();
  });
});
