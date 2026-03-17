import { act, renderHook } from '@testing-library/react';
import { createComparisonList } from '@/lib/comparison-lists';
import { useShareImage } from '@/hooks/useShareImage';

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

  it('builds an image preview from the captured result node', async () => {
    html2canvas.mockResolvedValue({
      toBlob: (callback: (blob: Blob | null) => void) => {
        callback(new Blob(['preview'], { type: 'image/png' }));
      },
    });

    const resultNode = document.createElement('div');
    const resultRef = { current: resultNode };
    const comparisonList = createComparisonList({ name: 'Groceries' });
    const listRef = { current: comparisonList };
    const { result } = renderHook(() => useShareImage({
      listRef,
      resultRef,
      resolvedTheme: 'light',
      t,
    }));

    await act(async () => {
      await result.current.shareImage();
    });

    expect(html2canvas).toHaveBeenCalledWith(resultNode, expect.objectContaining({
      backgroundColor: '#f6f3ee',
      scale: 2,
    }));
    expect(result.current.imagePreview).toEqual({
      fileName: 'Groceries.png',
      url: 'blob:preview',
    });
    expect(toast.success).toHaveBeenCalledWith('shareImageSuccess');
  });
});
