/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
/** @module Tree */

import * as React from "react";
import { Tree } from "./Tree";
import { BeInspireTreeNode } from "./BeInspireTree";
import { TreeNodeItem } from "../TreeDataProvider";
import { TreeNode as TreeNodeBase, NodeCheckboxProps as CheckboxProps, Omit, shallowDiffers } from "@bentley/ui-core";
import { TreeNodeContent } from "./NodeContent";
import { CellEditingEngine } from "../CellEditingEngine";
import { HighlightableTreeNodeProps } from "../HighlightingEngine";
import { PropertyValueRendererManager } from "../../properties/ValueRendererManager";

/**
 * Properties for Checkbox in [[TreeNode]]
 * @hidden
 */
export interface NodeCheckboxProps extends Omit<CheckboxProps, "onClick"> {
  onClick: (node: TreeNodeItem) => void;
}

/**
 * Properties for [[TreeNode]] React component
 * @hidden
 */
export interface TreeNodeProps {
  node: BeInspireTreeNode<TreeNodeItem>;
  checkboxProps?: NodeCheckboxProps;
  onClick?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;

  cellEditing?: CellEditingEngine;
  highlightProps?: HighlightableTreeNodeProps;
  showDescription?: boolean;
  valueRendererManager: PropertyValueRendererManager;

  /**
   * Called when all of the component tasks are done.
   * There are 3 different conditions:
   * * Props and node did not update so there is no need to render.
   * * Provided label function was synchronous and the render finished.
   * * Provided label function was asynchronous and the second render finished.
   */
  onFinalRenderComplete?: (renderId: string) => void;
  /**
   * Id specified by the parent component to identify all
   * nodes rendered at one request
   */
  renderId?: string;
}

/**
 * Default component for rendering a node for the [[Tree]]
 * @hidden
 */
export class TreeNode extends React.Component<TreeNodeProps> {
  private doPropsDiffer(props1: TreeNodeProps, props2: TreeNodeProps) {
    return shallowDiffers(props1.highlightProps, props2.highlightProps)
      || props1.valueRendererManager !== props2.valueRendererManager
      || props1.cellEditing !== props2.cellEditing
      || props1.showDescription !== props2.showDescription
      || shallowDiffers(props1.checkboxProps, props2.checkboxProps);
  }

  public shouldComponentUpdate(nextProps: TreeNodeProps) {
    if (nextProps.node.isDirty() || this.doPropsDiffer(this.props, nextProps))
      return true;

    // This is an anti-pattern, but it's main purpose is for testing.
    // We need to know when all of the nodes have finished rendering
    // and asynchronous updates make it very difficult.
    // If it should not render, let the parent know that it's
    // already fully rendered
    if (nextProps.renderId && nextProps.onFinalRenderComplete)
      nextProps.onFinalRenderComplete(nextProps.renderId);

    return false;
  }

  public render() {
    const checkboxProps: CheckboxProps | undefined = this.props.checkboxProps ? {
      ...this.props.checkboxProps,
      onClick: this._onCheckboxClick,
    } : undefined;

    const label = (
      <TreeNodeContent
        node={this.props.node}
        cellEditing={this.props.cellEditing}
        highlightProps={this.props.highlightProps}
        showDescription={this.props.showDescription}
        valueRendererManager={this.props.valueRendererManager}

        onFinalRenderComplete={this.props.onFinalRenderComplete}
        renderId={this.props.renderId}
      />);

    return (
      <TreeNodeBase
        data-testid={Tree.TestId.Node}
        isExpanded={this.props.node.expanded()}
        isSelected={this.props.node.selected()}
        isLoading={this.props.node.loading()}
        isLeaf={!this.props.node.hasOrWillHaveChildren()}
        label={label}
        icon={this.props.node.itree && this.props.node.itree.icon ? <span className={this.props.node.itree.icon} /> : undefined}
        checkboxProps={checkboxProps}
        level={this.props.node.getParents().length}
        onClick={this.props.onClick}
        onMouseMove={this.props.onMouseMove}
        onMouseDown={this.props.onMouseDown}
        onClickExpansionToggle={() => this.props.node.toggleCollapse()}
      />
    );
  }

  private _onCheckboxClick = () => {
    if (this.props.checkboxProps && this.props.node.payload)
      this.props.checkboxProps.onClick(this.props.node.payload);
  }
}
