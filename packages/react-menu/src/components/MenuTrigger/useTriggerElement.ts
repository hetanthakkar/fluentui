import * as React from 'react';
import { useMergedRefs, useEventCallback, shouldPreventDefaultOnKeyDown } from '@fluentui/react-utilities';
import { getCode, keyboardKey } from '@fluentui/keyboard-key';
import { MenuTriggerState } from './MenuTrigger.types';
import { useMenuContext } from '../../contexts/menuContext';
import { isOutsideMenu } from '../../utils/index';

// Helper type to select on parts of state the hook uses
type UseTriggerElementState = Pick<MenuTriggerState, 'children'>;

/**
 * Adds the necessary props to the trigger element
 *
 * openOnHover -> adds mouseenter/mouseleave events
 * openOnContextMenu -> removes all events except for openOnContextMenu
 */
export const useTriggerElement = (state: UseTriggerElementState): MenuTriggerState => {
  const triggerRef = useMenuContext(context => context.triggerRef);
  const menuPopupRef = useMenuContext(context => context.menuPopupRef);
  const setOpen = useMenuContext(context => context.setOpen);
  const open = useMenuContext(context => context.open);
  const triggerId = useMenuContext(context => context.triggerId);
  const openOnHover = useMenuContext(context => context.openOnHover);
  const openOnContext = useMenuContext(context => context.openOnContext);
  const isSubmenu = useMenuContext(context => context.isSubmenu);

  const openedWithKeyboardRef = React.useRef(false);

  // TODO also need to warn on React.Fragment usage
  const child = React.Children.only(state.children);

  const onContextMenu = useEventCallback((e: React.MouseEvent<HTMLElement>) => {
    if (openOnContext) {
      e.preventDefault();
      setOpen(e, { open: true, keyboard: false });
    }
    child.props?.onContextMenu?.(e);
  });

  const onClick = useEventCallback((e: React.MouseEvent<HTMLElement>) => {
    // Click event will close the menu popup
    // Therefore, do not propagate click events to parent popup for nested menu trigger
    if (isSubmenu) {
      e.stopPropagation();
    }

    if (!openOnContext) {
      setOpen(e, { open: !open, keyboard: openedWithKeyboardRef.current });
      openedWithKeyboardRef.current = false;
    }
    child.props?.onClick?.(e);
  });

  const onKeyDown = useEventCallback((e: React.KeyboardEvent<HTMLElement>) => {
    if (shouldPreventDefaultOnKeyDown(e)) {
      e.preventDefault();
      openedWithKeyboardRef.current = true;
      (e.target as HTMLElement)?.click();
    }

    const keyCode = getCode(e);
    if (
      !openOnContext &&
      ((isSubmenu && keyCode === keyboardKey.ArrowRight) || (!isSubmenu && keyCode === keyboardKey.ArrowDown))
    ) {
      if (keyCode === keyboardKey.ArrowDown) {
        // TODO https://github.com/microsoft/tabster/pull/25
        // Tabster attaches a window event listener that currently can run before user keydown handler
        e.stopPropagation();
      }

      setOpen(e, { open: true, keyboard: true });
    }

    child.props?.onKeyDown?.(e);
  });

  const onMouseEnter = useEventCallback((e: React.MouseEvent<HTMLElement>) => {
    if (openOnHover && !openOnContext) {
      setOpen(e, { open: true, keyboard: false });
    }
    child.props?.onMouseEnter?.(e);
  });

  // no mouse leave, since mouse enter sets focus for menu items
  const onBlur = useEventCallback((e: React.FocusEvent<HTMLElement>) => {
    if (isOutsideMenu({ menuPopupRef, triggerRef, event: e })) {
      setOpen(e, { open: false, keyboard: false });
    }

    child.props?.onBlur?.(e);
  });

  const disabled = child.props?.disabled;
  const triggerProps: Partial<React.HTMLAttributes<HTMLElement>> = {
    'aria-haspopup': true,
    'aria-expanded': open,
    id: triggerId,
    ...(child.props || {}),

    // These handlers should always handle the child's props
    ...(!disabled && {
      // These handlers should always handle the child's original handlers
      onClick,
      onMouseEnter,
      onContextMenu,
      onKeyDown,
      onBlur,
    }),
  };

  state.children = React.cloneElement(child, {
    ...triggerProps,
    ref: useMergedRefs(child.props.ref, triggerRef),
  });

  return state as MenuTriggerState;
};
