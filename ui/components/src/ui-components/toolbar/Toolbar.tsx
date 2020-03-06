/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Toolbar
 */

import classnames from "classnames";
import * as React from "react";
import { CommonToolbarItem, ToolbarItemUtilities, ActionButton, ConditionalBooleanValue, ConditionalStringValue, CustomButtonDefinition, GroupButton } from "@bentley/ui-abstract";
import { CommonProps, NoChildrenProps, IconHelper, useRefs, useResizeObserver, useOnOutsideClick, BadgeUtilities } from "@bentley/ui-core";
import { ToolbarOverflowButton } from "./Overflow";
import { ToolbarOverflowPanel } from "./OverflowPanel";
import { ToolbarItems } from "./Items";
import { Direction, DirectionHelpers, OrthogonalDirectionHelpers, OrthogonalDirection } from "./utilities/Direction";
import { ItemWrapper } from "./ItemWrapper";
import { PopupItem } from "./PopupItem";
import { PopupItemsPanel } from "./PopupItemsPanel";
import { PopupItemWithDrag } from "./PopupItemWithDrag";
import { ToolbarButtonItem } from "./Item";
import "./Toolbar.scss";

/** Describes the data needed to insert a custom framework-specific button into an ToolbarWithOverflow.
 * @beta
 */
export interface CustomToolbarItem extends CustomButtonDefinition {
  buttonNode?: React.ReactNode;
  panelContentNode?: React.ReactNode;
}

/** Describes toolbar item.
 * @beta
 */
export type ToolbarItem = ActionButton | GroupButton | CustomToolbarItem;

/** CustomToolbarItem type guard. */
function isCustomToolbarItem(item: ToolbarItem): item is CustomToolbarItem {
  return !!(item as CustomToolbarItem).isCustom && (("buttonNode" in item) || ("panelContentNode" in item));
}

/** @internal */
export const getToolbarDirection = (expandsTo: Direction): OrthogonalDirection => {
  const orthogonalDirection = DirectionHelpers.getOrthogonalDirection(expandsTo);
  return OrthogonalDirectionHelpers.inverse(orthogonalDirection);
};

/** Available alignment modes of [[ToolbarWithOverflow]] panels.
 * @beta
 */
export enum ToolbarPanelAlignment {
  Start,
  End,
}

/** Helpers for [[ToolbarPanelAlignment]].
 * @internal
 */
export class ToolbarPanelAlignmentHelpers {
  /** Class name of [[ToolbarPanelAlignment.Start]] */
  public static readonly START_CLASS_NAME = "components-panel-alignment-start";
  /** Class name of [[ToolbarPanelAlignment.End]] */
  public static readonly END_CLASS_NAME = "components-panel-alignment-end";

  /** @returns Class name of specified [[ToolbarPanelAlignment]] */
  public static getCssClassName(panelAlignment: ToolbarPanelAlignment): string {
    switch (panelAlignment) {
      case ToolbarPanelAlignment.Start:
        return ToolbarPanelAlignmentHelpers.START_CLASS_NAME;
      case ToolbarPanelAlignment.End:
        return ToolbarPanelAlignmentHelpers.END_CLASS_NAME;
    }
  }
}

/** @internal */
export interface ToolbarOverflowContextProps {
  readonly expandsTo: Direction;
  readonly direction: OrthogonalDirection;
  readonly overflowExpandsTo: Direction;
  readonly overflowDirection: OrthogonalDirection;
  readonly panelAlignment: ToolbarPanelAlignment;
  readonly useDragInteraction: boolean;
}

/**
 * Context used by Toolbar component to provide Direction to child components.
 * @internal
 */
// tslint:disable-next-line: variable-name
export const ToolbarWithOverflowDirectionContext = React.createContext<ToolbarOverflowContextProps>({
  expandsTo: Direction.Bottom,
  direction: OrthogonalDirection.Horizontal,
  overflowExpandsTo: Direction.Right,
  overflowDirection: OrthogonalDirection.Vertical,
  panelAlignment: ToolbarPanelAlignment.Start,
  useDragInteraction: false,
});

function CustomItem({ item }: { item: CustomToolbarItem }) {

  // const node = item.internalData.get(ToolbarUtils.reactButtonKey);
  if (item.buttonNode !== undefined)
    return <>{item.buttonNode}</>;

  if (item.panelContentNode === undefined)
    return null;

  const badge = BadgeUtilities.getComponentForBadgeType(item.badgeType);
  const title = ConditionalStringValue.getValue(item.label);
  return <PopupItem
    icon={item.icon ? IconHelper.getIconReactNode(item.icon, item.internalData) : /* istanbul ignore next */ <i className="icon icon-placeholder" />}
    isDisabled={ConditionalBooleanValue.getValue(item.isDisabled)}
    title={title ? title : /* istanbul ignore next */ item.id}
    panel={item.panelContentNode}
    hideIndicator={true}
    badge={badge}
  />;
}

function GroupPopupItem({ item }: { item: GroupButton }) {
  const { useDragInteraction } = useToolbarWithOverflowDirectionContext();
  const title = ConditionalStringValue.getValue(item.label)!;
  const badge = BadgeUtilities.getComponentForBadgeType(item.badgeType);

  if (useDragInteraction) {
    return <PopupItemWithDrag
      icon={IconHelper.getIconReactNode(item.icon, item.internalData)}
      isDisabled={ConditionalBooleanValue.getValue(item.isDisabled)}
      title={title}
      groupItem={item}
      badge={badge}
    />;
  }
  return <PopupItem
    icon={IconHelper.getIconReactNode(item.icon, item.internalData)}
    isDisabled={ConditionalBooleanValue.getValue(item.isDisabled)}
    title={title}
    panel={<PopupItemsPanel groupItem={item} activateOnPointerUp={false} />}
    badge={badge}
  />;
}

function ActionItem({ item }: { item: ActionButton }) {
  const title = ConditionalStringValue.getValue(item.label)!;
  const badge = BadgeUtilities.getComponentForBadgeType(item.badgeType);

  return <ToolbarButtonItem
    isDisabled={ConditionalBooleanValue.getValue(item.isDisabled)}
    title={title}
    icon={IconHelper.getIconReactNode(item.icon, item.internalData)}
    isActive={item.isActive}
    onClick={item.execute}
    badge={badge}
  />;
}

function ToolbarItem({ item }: { item: ToolbarItem }) {
  if (ToolbarItemUtilities.isGroupButton(item)) {
    return <GroupPopupItem item={item} />;
  } else if (isCustomToolbarItem(item)) {
    return <CustomItem item={item} />;
  } else {
    // istanbul ignore else
    if (ToolbarItemUtilities.isActionButton(item)) {
      return <ActionItem item={item} />;
    }
  }
  return null;
}

/** @internal */
export function useToolbarWithOverflowDirectionContext() {
  return React.useContext(ToolbarWithOverflowDirectionContext);
}

function OverflowItemsContainer(p: { children: React.ReactNode }) {
  return <>{p.children}</>;
}

/** Properties of [[ToolbarWithOverflow]] component.
 * @beta
 */
export interface ToolbarWithOverflowProps extends CommonProps, NoChildrenProps {
  /** Describes to which direction the popup panels are expanded. Defaults to: [[Direction.Bottom]] */
  expandsTo?: Direction;
  /** Describes to which direction the overflow popup panels are expanded. Defaults to: [[Direction.Right]] */
  overflowExpandsTo?: Direction;
  /** definitions for items of the toolbar. i.e. [[CommonToolbarItem]] */
  items: CommonToolbarItem[];
  /** Describes how expanded panels are aligned. Defaults to: [[ToolbarPanelAlignment.Start]] */
  panelAlignment?: ToolbarPanelAlignment;
  /** Use Drag Interaction to open popups with nest action buttons */
  useDragInteraction?: boolean;
}

/** Component that displays tool settings as a bar across the top of the content view.
 * @beta
 */
export function ToolbarWithOverflow(props: ToolbarWithOverflowProps) {
  const expandsTo = props.expandsTo ? props.expandsTo : Direction.Bottom;
  const useDragInteraction = !!props.useDragInteraction;
  const panelAlignment = props.panelAlignment ? props.panelAlignment : ToolbarPanelAlignment.Start;
  const useHeight = (expandsTo === Direction.Right || expandsTo === Direction.Left);
  const [isOverflowPanelOpen, setIsOverflowPanelOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const width = React.useRef<number | undefined>(undefined);
  const availableNodes = React.useMemo<React.ReactNode>(() => {
    return props.items.map((item) => {
      return (
        <ToolbarItem
          key={item.id}
          item={item}
        />
      );
    });
  }, [props.items]);
  /* overflowItemKeys - keys of items to show in overflow panel
   * handleContainerResize - handler called when container <div> is resized.
   * handleOverflowResize - handler called when determining size of overflow indicator/button.
   * handleEntryResize - handler called when determining size of each item/button.  */
  const [overflowItemKeys, handleContainerResize, handleOverflowResize, handleEntryResize] = useOverflow(availableNodes);
  // handler called by ResizeObserver
  const handleResize = React.useCallback((w: number) => {
    width.current = w;
    width.current !== undefined && handleContainerResize(width.current);
  }, [handleContainerResize]);
  const resizeObserverRef = useResizeObserver(handleResize, useHeight);
  // handle open and closing overflow panel
  const onOverflowClick = React.useCallback(() => {
    setIsOverflowPanelOpen((prev) => !prev);
  }, []);
  const onOutsideClick = React.useCallback(() => {
    setIsOverflowPanelOpen(false);
  }, []);
  const isOutsideEvent = React.useCallback((e: PointerEvent) => {
    return !!ref.current && (e.target instanceof Node) && !ref.current.contains(e.target);
  }, []);
  const panelRef = useOnOutsideClick<HTMLDivElement>(onOutsideClick, isOutsideEvent);

  const refs = useRefs(ref, resizeObserverRef);
  const availableItems = React.Children.toArray(availableNodes);
  const displayedItems = availableItems.reduce<Array<[string, React.ReactNode]>>((acc, child, index) => {
    const key = getChildKey(child, index);
    if (!overflowItemKeys || overflowItemKeys.indexOf(key) < 0) {
      acc.push([key, child]);
    }
    return acc;
  }, []);
  const overflowPanelItems = overflowItemKeys ? availableItems.reduce<Array<[string, React.ReactNode]>>((acc, child, index) => {
    const key = getChildKey(child, index);
    if (overflowItemKeys.indexOf(key) >= 0) {
      acc.push([key, child]);
    }
    return acc;
  }, []) : [];

  const direction = getToolbarDirection(expandsTo);
  const overflowExpandsTo = undefined !== props.overflowExpandsTo ? props.overflowExpandsTo : Direction.Right;
  const addOverflowButton = React.useCallback(() => {
    return (<ToolbarItemContext.Provider
      value={{
        hasOverflow: false,
        useHeight,
        onResize: handleOverflowResize,
      }}
    >
      <ToolbarOverflowButton
        onClick={onOverflowClick}
        panelNode={overflowPanelItems.length > 0 && isOverflowPanelOpen &&
          <ToolbarOverflowPanel ref={panelRef} >
            <OverflowItemsContainer>
              {overflowPanelItems.map(([key, child]) => {
                return (
                  <ToolbarItemContext.Provider
                    key={key}
                    value={{
                      hasOverflow: true,
                      useHeight,
                      onResize: () => { },
                    }}
                  >
                    {<ItemWrapper>{child}</ItemWrapper>}
                  </ToolbarItemContext.Provider>
                );
              })}
            </OverflowItemsContainer>
          </ToolbarOverflowPanel>
        }
      />
    </ToolbarItemContext.Provider>);
  }, [useHeight, overflowPanelItems, handleOverflowResize, isOverflowPanelOpen, onOverflowClick, panelRef]);

  const className = classnames(
    "components-toolbar-overflow-sizer",
    OrthogonalDirectionHelpers.getCssClassName(direction),
    props.className);

  const showOverflowAtStart = (direction === OrthogonalDirection.Horizontal) && (panelAlignment === ToolbarPanelAlignment.End);
  /* The ItemWrapper is used to wrap the <Item> <ExpandableItem> with a <div> that specifies a ref that the sizing logic uses to determine the
     size of the item. */
  return (
    <ToolbarWithOverflowDirectionContext.Provider value={
      {
        expandsTo, direction, overflowExpandsTo, panelAlignment, useDragInteraction,
        overflowDirection: direction === OrthogonalDirection.Horizontal ? OrthogonalDirection.Vertical : OrthogonalDirection.Horizontal,
      }
    }>
      <div
        className={className}
        ref={refs}
        style={props.style}
      >
        <ToolbarItems
          className="components-items"
          direction={direction}
        >
          {(!overflowItemKeys || overflowItemKeys.length > 0) && showOverflowAtStart && addOverflowButton()}
          {displayedItems.map(([key, child]) => {
            const onEntryResize = handleEntryResize(key);
            return (
              <ToolbarItemContext.Provider
                key={key}
                value={{
                  hasOverflow: false,
                  useHeight,
                  onResize: onEntryResize,
                }}
              >
                {<ItemWrapper >{child}</ItemWrapper>}
              </ToolbarItemContext.Provider>
            );
          })}
          {(!overflowItemKeys || overflowItemKeys.length > 0) && !showOverflowAtStart && addOverflowButton()}

        </ToolbarItems>
      </div>
    </ToolbarWithOverflowDirectionContext.Provider >
  );
}

/** Returns key of a child. Must be used along with React.Children.toArray to preserve the semantics of availableItems.
 * @internal
 */
function getChildKey(child: React.ReactNode, index: number) {
  // istanbul ignore else
  if (React.isValidElement(child) && child.key !== null) {
    return child.key.toString();
  }
  return index.toString();
}

/** Returns a subset of docked entry keys that exceed given width and should be overflowItemKeys.
 * @internal
 */
function getOverflown(width: number, docked: ReadonlyArray<readonly [string, number]>, overflowWidth: number) {
  let settingsWidth = 0;
  let i = 0;
  const buttonPadding = 2;
  for (; i < docked.length; i++) {
    const w = docked[i][1] + buttonPadding;
    const newSettingsWidth = settingsWidth + w;
    if (newSettingsWidth > width) {
      settingsWidth += (overflowWidth + buttonPadding);
      break;
    }
    settingsWidth = newSettingsWidth;
  }
  let j = i;
  for (; j > 0; j--) {
    if (settingsWidth <= width)
      break;
    const w = docked[j][1] + buttonPadding;
    settingsWidth -= w;
  }

  return docked.slice(j).map((e) => e[0]);
}

/** Hook that returns a list of overflowItemKeys availableItems.
 * @internal
 */
function useOverflow(availableItems: React.ReactNode): [
  ReadonlyArray<string> | undefined,
  (size: number) => void,
  (size: number) => void,
  (key: string) => (size: number) => void,
] {
  const [overflowItemKeys, setOverflown] = React.useState<ReadonlyArray<string>>();
  const entryWidths = React.useRef(new Map<string, number | undefined>());
  const width = React.useRef<number | undefined>(undefined);
  const overflowWidth = React.useRef<number | undefined>(undefined);

  const calculateOverflow = React.useCallback(() => {
    const widths = verifiedMapEntries(entryWidths.current);
    if (width.current === undefined ||
      widths === undefined ||
      overflowWidth.current === undefined) {
      setOverflown(undefined);
      return;
    }

    // Calculate overflow.
    const newOverflown = getOverflown(width.current, [...widths.entries()], overflowWidth.current);
    setOverflown(newOverflown);
  }, []);

  React.useLayoutEffect(() => {
    const newEntryWidths = new Map<string, number | undefined>();
    const array = React.Children.toArray(availableItems);
    for (let i = 0; i < array.length; i++) {
      const child = array[i];
      const key = getChildKey(child, i);
      const lastW = entryWidths.current.get(key);
      newEntryWidths.set(key, lastW);
    }
    entryWidths.current = newEntryWidths;
    calculateOverflow();
  }, [availableItems, calculateOverflow]);

  const handleContainerResize = React.useCallback((w: number) => {
    const calculate = width.current !== w;
    width.current = w;
    calculate && calculateOverflow();
  }, [calculateOverflow]);

  const handleOverflowResize = React.useCallback((w: number) => {
    const calculate = overflowWidth.current !== w;
    overflowWidth.current = w;
    calculate && calculateOverflow();
  }, [calculateOverflow]);

  const handleEntryResize = (key: string) => (w: number) => {
    const oldW = entryWidths.current.get(key);
    if (oldW !== w) {
      entryWidths.current.set(key, w);
      calculateOverflow();
    }
  };

  return [overflowItemKeys, handleContainerResize, handleOverflowResize, handleEntryResize];
}

/** Interface toolbars use to define context for its items.
 * @internal
 */
export interface ToolbarItemContextArgs {
  readonly hasOverflow: boolean;
  readonly useHeight: boolean;
  readonly onResize: (w: number) => void;
}

/** Interface toolbars use to define context for its items.
 * @internal
 */
// tslint:disable-next-line: variable-name
export const ToolbarItemContext = React.createContext<ToolbarItemContextArgs>(null!);

/** @internal */
export function useToolItemEntryContext() {
  return React.useContext(ToolbarItemContext);
}

function verifiedMapEntries<T>(map: Map<string, T | undefined>) {
  for (const [, val] of map) {
    // istanbul ignore next  during unit testing
    if (val === undefined)
      return undefined;
  }
  return map as Map<string, T>;
}