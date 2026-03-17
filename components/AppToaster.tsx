import { useCallback } from 'react';
import { ToastBar, resolveValue, useToaster, type DefaultToastOptions, type Toast, type ToastPosition } from 'react-hot-toast';

const DEFAULT_OFFSET = 16;

interface AppToasterProps {
  position?: ToastPosition;
  toastOptions?: DefaultToastOptions;
}

interface ToastWrapperProps {
  id: string;
  style: React.CSSProperties;
  visible: boolean;
  onHeightUpdate: (toastId: string, height: number) => void;
  children: React.ReactNode;
}

function ToastWrapper({ id, style, visible, onHeightUpdate, children }: ToastWrapperProps) {
  const measureRef = useCallback((element: HTMLDivElement | null) => {
    if (!element) {
      return;
    }

    const updateHeight = () => {
      onHeightUpdate(id, element.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new MutationObserver(updateHeight);
    observer.observe(element, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  }, [id, onHeightUpdate]);

  return (
    <div
      ref={measureRef}
      style={{
        ...style,
        zIndex: 9999,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {children}
    </div>
  );
}

function getPositionStyle(position: ToastPosition, offset: number): React.CSSProperties {
  const isTop = position.includes('top');
  const verticalStyle = isTop ? { top: 0 } : { bottom: 0 };
  const horizontalStyle = position.includes('center')
    ? { justifyContent: 'center' }
    : position.includes('right')
      ? { justifyContent: 'flex-end' }
      : {};

  return {
    left: 0,
    right: 0,
    display: 'flex',
    position: 'absolute',
    transform: `translateY(${offset * (isTop ? 1 : -1)}px)`,
    transition: 'all 230ms cubic-bezier(.21,1.02,.73,1)',
    ...verticalStyle,
    ...horizontalStyle,
  };
}

export default function AppToaster({
  position = 'bottom-center',
  toastOptions,
}: AppToasterProps) {
  const { toasts, handlers } = useToaster(toastOptions);

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 9999,
        top: DEFAULT_OFFSET,
        right: DEFAULT_OFFSET,
        bottom: DEFAULT_OFFSET,
        left: DEFAULT_OFFSET,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        const toastPosition = toast.position || position;
        const offset = handlers.calculateOffset(toast, {
          reverseOrder: false,
          gutter: 8,
          defaultPosition: position,
        });

        return (
          <ToastWrapper
            key={toast.id}
            id={toast.id}
            visible={toast.visible}
            onHeightUpdate={handlers.updateHeight}
            style={getPositionStyle(toastPosition, offset)}
          >
            {toast.type === 'custom'
              ? resolveValue(toast.message, toast)
              : <ToastBar toast={toast} position={toastPosition} />}
          </ToastWrapper>
        );
      })}
    </div>
  );
}
