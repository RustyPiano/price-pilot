import { act, renderHook } from '@testing-library/react';
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap';

function buildDialog(buttonCount: number, disabled = false): HTMLDivElement {
  const container = document.createElement('div');
  for (let i = 0; i < buttonCount; i += 1) {
    const button = document.createElement('button');
    button.textContent = `btn-${i}`;
    button.disabled = disabled;
    container.appendChild(button);
  }
  document.body.appendChild(container);
  return container;
}

function pressTab(): boolean {
  const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
  return document.dispatchEvent(event);
}

describe('useModalFocusTrap', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('focuses the first focusable element on activation', () => {
    const container = buildDialog(3);
    renderHook(() => useModalFocusTrap({ current: container }, { active: true }));

    expect(document.activeElement).toBe(container.querySelectorAll('button')[0]);
  });

  it('wraps Tab at the last element back to the first', () => {
    const container = buildDialog(2);
    const buttons = container.querySelectorAll('button');
    renderHook(() => useModalFocusTrap({ current: container }, { active: true }));

    (buttons[1] as HTMLElement).focus();
    act(() => {
      pressTab();
    });

    expect(document.activeElement).toBe(buttons[0]);
  });

  it('traps focus on the container itself when nothing inside is focusable', () => {
    // 回归: 导入进行中三个策略按钮 + 关闭按钮全部 disabled 时, Tab 曾直接放行,
    // 焦点漏到弹窗背后的页面 (useModalFocusTrap.ts 的 focusables.length === 0 分支)。
    const container = buildDialog(2, true);
    renderHook(() => useModalFocusTrap({ current: container }, { active: true }));

    expect(document.activeElement).toBe(container);

    let notCancelled = true;
    act(() => {
      notCancelled = pressTab();
    });

    expect(notCancelled).toBe(false);
    expect(document.activeElement).toBe(container);
  });

  it('calls onClose on Escape', () => {
    const container = buildDialog(1);
    const onClose = vi.fn();
    renderHook(() => useModalFocusTrap({ current: container }, { active: true, onClose }));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('returns focus to the previously focused element on cleanup', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const container = buildDialog(1);
    const { unmount } = renderHook(() => useModalFocusTrap({ current: container }, { active: true }));

    unmount();

    expect(document.activeElement).toBe(trigger);
  });

  it('does nothing when inactive', () => {
    const container = buildDialog(1);
    renderHook(() => useModalFocusTrap({ current: container }, { active: false }));

    expect(document.activeElement).not.toBe(container.querySelector('button'));
  });
});
