import { act, renderHook } from '@testing-library/react';
import { createComparisonList, normalizeProduct } from '@/lib/comparison-lists';
import { useShareLink } from '@/hooks/useShareLink';

const { toast } = vi.hoisted(() => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({ toast }));

const t = ((key: string) => key) as (key: string) => string;

describe('useShareLink', () => {
  beforeEach(() => {
    toast.error.mockReset();
    toast.success.mockReset();
  });

  it('copies the generated share URL to the clipboard when available', async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: clipboard,
    });

    const comparisonList = createComparisonList({ name: 'Groceries' });
    comparisonList.products = [normalizeProduct({
      name: 'Milk',
      price: 12,
      quantity: 1,
      unit: 'l',
      currency: 'CNY',
    })];
    const listRef = { current: comparisonList };
    const { result } = renderHook(() => useShareLink({ listRef, t }));

    await act(async () => {
      await result.current.shareLink();
    });

    expect(clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('share='));
    expect(result.current.manualShareUrl).toBe('');
    expect(toast.success).toHaveBeenCalledWith('shareLinkSuccess');
  });

  it('falls back to a manual share URL when clipboard access is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    const comparisonList = createComparisonList({ name: 'Groceries' });
    const listRef = { current: comparisonList };
    const { result } = renderHook(() => useShareLink({ listRef, t }));

    await act(async () => {
      await result.current.shareLink();
    });

    expect(result.current.manualShareUrl).toContain('share=');

    act(() => {
      result.current.closeManualShareModal();
    });

    expect(result.current.manualShareUrl).toBe('');
  });
});
