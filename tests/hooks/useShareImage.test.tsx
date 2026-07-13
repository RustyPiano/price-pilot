import { act, renderHook } from '@testing-library/react';
import { createComparisonList } from '@/lib/comparison-lists';
import { truncateReceiptName, useShareImage } from '@/hooks/useShareImage';

const { html2canvas, toast } = vi.hoisted(() => ({
  html2canvas: vi.fn(),
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('html2canvas', () => ({ default: html2canvas }));
vi.mock('react-hot-toast', () => ({ toast }));

const t = ((key: string) => key) as (key: string) => string;

describe('useShareImage', () => {
  beforeEach(() => {
    html2canvas.mockReset();
    toast.error.mockReset();
    toast.success.mockReset();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders an offscreen receipt node and builds an image preview', async () => {
    html2canvas.mockResolvedValue({
      toBlob: (callback: (blob: Blob | null) => void) => {
        callback(new Blob(['preview'], { type: 'image/png' }));
      },
    });

    const comparisonList = createComparisonList({ name: 'Groceries' });
    const listRef = { current: comparisonList };
    const { result } = renderHook(() => useShareImage({
      listRef,
      locale: 'en',
      t,
    }));

    await act(async () => {
      await result.current.shareImage();
    });

    expect(html2canvas).toHaveBeenCalledTimes(1);
    const [capturedNode, options] = html2canvas.mock.calls[0];
    expect(capturedNode).toBeInstanceOf(HTMLElement);
    expect(options).toEqual(expect.objectContaining({
      backgroundColor: null,
      scale: 2,
    }));
    expect(result.current.imagePreview).toEqual({
      fileName: 'Groceries.png',
      url: 'blob:preview',
    });
    expect(toast.success).toHaveBeenCalledWith('shareImageSuccess');

    // 离屏容器截图后应被清理, 不残留在文档中。
    expect(document.body.querySelectorAll('div[style*="-9999px"]').length).toBe(0);
  });

  it('truncates long receipt item names with width-weighted budget', () => {
    expect(truncateReceiptName('可乐 2L')).toBe('可乐 2L');
    expect(truncateReceiptName('无糖零度可乐家庭分享装超值特惠版')).toBe('无糖零度可乐家庭分享装…');
    const truncated = truncateReceiptName('Extra Large Family Pack Premium Cola');
    expect(truncated.endsWith('…')).toBe(true);
    expect(truncated.length).toBeLessThan(24);
  });

  it('never splits a surrogate pair when truncating (no mojibake)', () => {
    // 每个 🥛 (U+1F95B) 是代理对, 按 UTF-16 code unit 切会切出孤立高代理项。
    const name = '牛奶🥛家庭分享特惠超值装🥛🥛🥛🥛';
    const truncated = truncateReceiptName(name);

    expect(truncated.endsWith('…')).toBe(true);
    // Array.from 按码点分割; 若切断了代理对, 结果会包含孤立的半个代理对字符。
    expect(Array.from(truncated.slice(0, -1)).join('').length).toBe(truncated.length - 1);
  });
});
