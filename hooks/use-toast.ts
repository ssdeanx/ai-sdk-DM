'use client';

/**
 * Enhanced toast hook with advanced features
 * Supports multiple toast types, actions, and toast queue management
 *
 * @module hooks/use-toast
 */

// Inspired by react-hot-toast library
import * as React from 'react';

import type { ToastActionElement, ToastProps } from '@/components/ui/toast';

// Configuration
const TOAST_LIMIT = 5; // Increased from 1 to allow multiple toasts
const TOAST_REMOVE_DELAY = 5000; // Reduced from 1000000 to 5000ms (5 seconds)

/**
 * Toast variant types
 */
export type ToastVariant = 'default' | 'destructive';

/**
 * Toast priority levels
 */
export type ToastPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Toast action with callback
 */
export interface ToastAction {
  label: string;
  onClick: () => void;
  className?: string;
}

/**
 * Enhanced toast properties
 */
type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: ToastVariant;
  duration?: number;
  priority?: ToastPriority;
  icon?: React.ReactNode;
  onDismiss?: () => void;
  group?: string;
  createdAt: number;
};

/**
 * Toast action types
 */
const actionTypes = {
  ADD_TOAST: 'ADD_TOAST',
  UPDATE_TOAST: 'UPDATE_TOAST',
  DISMISS_TOAST: 'DISMISS_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
  DISMISS_ALL_TOASTS: 'DISMISS_ALL_TOASTS',
  REMOVE_ALL_TOASTS: 'REMOVE_ALL_TOASTS',
  DISMISS_GROUP: 'DISMISS_GROUP',
  PAUSE_TOAST: 'PAUSE_TOAST',
  RESUME_TOAST: 'RESUME_TOAST',
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

/**
 * Toast actions
 */
type Action =
  | {
      type: ActionType['ADD_TOAST'];
      toast: ToasterToast;
    }
  | {
      type: ActionType['UPDATE_TOAST'];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType['DISMISS_TOAST'];
      toastId?: ToasterToast['id'];
    }
  | {
      type: ActionType['REMOVE_TOAST'];
      toastId?: ToasterToast['id'];
    }
  | {
      type: ActionType['DISMISS_ALL_TOASTS'];
    }
  | {
      type: ActionType['REMOVE_ALL_TOASTS'];
    }
  | {
      type: ActionType['DISMISS_GROUP'];
      group: string;
    }
  | {
      type: ActionType['PAUSE_TOAST'];
      toastId: ToasterToast['id'];
    }
  | {
      type: ActionType['RESUME_TOAST'];
      toastId: ToasterToast['id'];
    };

/**
 * Toast state
 */
interface State {
  toasts: ToasterToast[];
  paused: Record<string, boolean>;
  queue: ToasterToast[];
}

/**
 * Toast timeout management
 */
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Add toast to removal queue
 */
const addToRemoveQueue = (toastId: string, duration?: number) => {
  // Clear existing timeout if any
  if (toastTimeouts.has(toastId)) {
    clearTimeout(toastTimeouts.get(toastId));
    toastTimeouts.delete(toastId);
  }

  // Don't set a timeout for permanent toasts (duration === 0)
  if (duration === 0) return;

  // Set timeout to remove toast
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: 'REMOVE_TOAST',
      toastId: toastId,
    });

    // Process queue after removing a toast
    processQueue();
  }, duration || TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

/**
 * Process toast queue
 */
const processQueue = () => {
  const state = memoryState;

  // If we have space for more toasts and there are toasts in the queue
  if (state.toasts.length < TOAST_LIMIT && state.queue.length > 0) {
    // Sort queue by priority and creation time
    const sortedQueue = [...state.queue].sort((a, b) => {
      const priorityOrder = { urgent: 3, high: 2, normal: 1, low: 0 };
      const aPriority = priorityOrder[a.priority || 'normal'];
      const bPriority = priorityOrder[b.priority || 'normal'];

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      return a.createdAt - b.createdAt; // Older first
    });

    // Get the next toast from the queue
    const nextToast = sortedQueue[0];

    // Remove it from the queue and add it to active toasts
    dispatch({
      type: 'ADD_TOAST',
      toast: nextToast,
    });
  }
};

/**
 * Toast reducer
 */
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'ADD_TOAST': {
      // If we've reached the toast limit, add to queue instead
      if (state.toasts.length >= TOAST_LIMIT) {
        return {
          ...state,
          queue: [...state.queue, action.toast],
        };
      }

      // Add toast and set timeout for removal
      const toast = action.toast;
      if (!state.paused[toast.id]) {
        addToRemoveQueue(toast.id, toast.duration);
      }

      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    }

    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case 'DISMISS_TOAST': {
      const { toastId } = action;

      // Call onDismiss callback if defined
      if (toastId) {
        const toast = state.toasts.find((t) => t.id === toastId);
        if (toast?.onDismiss) {
          toast.onDismiss();
        }
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          if (toast.onDismiss) {
            toast.onDismiss();
          }
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }

    case 'REMOVE_TOAST': {
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }

      // Remove the toast
      const newState = {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
        paused: { ...state.paused },
      };

      // Remove from paused state
      if (action.toastId in newState.paused) {
        delete newState.paused[action.toastId];
      }

      return newState;
    }

    case 'DISMISS_ALL_TOASTS': {
      // Call onDismiss for all toasts
      state.toasts.forEach((toast) => {
        if (toast.onDismiss) {
          toast.onDismiss();
        }
        addToRemoveQueue(toast.id);
      });

      return {
        ...state,
        toasts: state.toasts.map((t) => ({ ...t, open: false })),
      };
    }

    case 'REMOVE_ALL_TOASTS': {
      // Clear all timeouts
      toastTimeouts.forEach((timeout) => clearTimeout(timeout));
      toastTimeouts.clear();

      return {
        ...state,
        toasts: [],
        queue: [],
        paused: {},
      };
    }

    case 'DISMISS_GROUP': {
      const { group } = action;

      // Call onDismiss for group toasts
      state.toasts
        .filter((t) => t.group === group)
        .forEach((toast) => {
          if (toast.onDismiss) {
            toast.onDismiss();
          }
          addToRemoveQueue(toast.id);
        });

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.group === group ? { ...t, open: false } : t
        ),
      };
    }

    case 'PAUSE_TOAST': {
      const { toastId } = action;

      // Clear the timeout
      if (toastTimeouts.has(toastId)) {
        clearTimeout(toastTimeouts.get(toastId));
        toastTimeouts.delete(toastId);
      }

      return {
        ...state,
        paused: {
          ...state.paused,
          [toastId]: true,
        },
      };
    }

    case 'RESUME_TOAST': {
      const { toastId } = action;
      const toast = state.toasts.find((t) => t.id === toastId);

      if (toast) {
        addToRemoveQueue(toastId, toast.duration);
      }

      const newPaused = { ...state.paused };
      delete newPaused[toastId];

      return {
        ...state,
        paused: newPaused,
      };
    }

    default:
      return state;
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [], paused: {}, queue: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

/**
 * Toast options
 */
type ToastOptions = Omit<ToasterToast, 'id' | 'createdAt'>;

/**
 * Create a toast
 */
function toast({ ...props }: ToastOptions) {
  const id = genId();
  const createdAt = Date.now();

  // Update toast
  const update = (props: Partial<ToasterToast>) =>
    dispatch({
      type: 'UPDATE_TOAST',
      toast: { ...props, id },
    });

  // Dismiss toast
  const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id });

  // Pause toast (stop timer)
  const pause = () => dispatch({ type: 'PAUSE_TOAST', toastId: id });

  // Resume toast (restart timer)
  const resume = () => dispatch({ type: 'RESUME_TOAST', toastId: id });

  // Create and dispatch toast
  dispatch({
    type: 'ADD_TOAST',
    toast: {
      ...props,
      id,
      createdAt,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id,
    dismiss,
    update,
    pause,
    resume,
  };
}

/**
 * Create an error toast
 */
toast.error = (props: Omit<ToastOptions, 'variant'>) => {
  return toast({
    ...props,
    variant: 'destructive',
  });
};

/**
 * Create a success toast (uses default variant with custom styling)
 */
toast.success = (props: Omit<ToastOptions, 'variant'>) => {
  return toast({
    ...props,
    variant: 'default',
  });
};

/**
 * Create a warning toast (uses default variant with custom styling)
 */
toast.warning = (props: Omit<ToastOptions, 'variant'>) => {
  return toast({
    ...props,
    variant: 'default',
  });
};

/**
 * Create an info toast (uses default variant with custom styling)
 */
toast.info = (props: Omit<ToastOptions, 'variant'>) => {
  return toast({
    ...props,
    variant: 'default',
  });
};

/**
 * Create a permanent toast (doesn't auto-dismiss)
 */
toast.permanent = (props: ToastOptions) => {
  return toast({
    ...props,
    duration: 0,
  });
};

/**
 * Create a toast with an action
 */
toast.action = (props: ToastOptions & { action: ToastAction }) => {
  const { action, ...rest } = props;

  // Create a proper React element for the toast action
  const actionElement: ToastActionElement = React.createElement('button', {
    type: 'button',
    className: action.className,
    onClick: () => {
      action.onClick();
      dispatch({ type: 'DISMISS_TOAST', toastId: undefined });
    },
    children: action.label,
  });

  return toast({
    ...rest,
    action: actionElement,
  });
};

/**
 * Enhanced toast hook
 */
function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
    dismissAll: () => dispatch({ type: 'DISMISS_ALL_TOASTS' }),
    removeAll: () => dispatch({ type: 'REMOVE_ALL_TOASTS' }),
    dismissGroup: (group: string) => dispatch({ type: 'DISMISS_GROUP', group }),
    pause: (toastId: string) => dispatch({ type: 'PAUSE_TOAST', toastId }),
    resume: (toastId: string) => dispatch({ type: 'RESUME_TOAST', toastId }),
    update: (toastId: string, props: Partial<ToasterToast>) =>
      dispatch({ type: 'UPDATE_TOAST', toast: { ...props, id: toastId } }),
  };
}

export { useToast, toast };
