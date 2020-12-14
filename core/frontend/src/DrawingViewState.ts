/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Views
 */

import { Id64, Id64String } from "@bentley/bentleyjs-core";
import { Constant, Range3d, Transform } from "@bentley/geometry-core";
import { AxisAlignedBox3d, ViewDefinition2dProps, ViewStateProps } from "@bentley/imodeljs-common";
import { ExtentLimits, ViewState2d } from "./ViewState";
import { IModelConnection } from "./IModelConnection";
import { CategorySelectorState } from "./CategorySelectorState";
import { DisplayStyle2dState } from "./DisplayStyleState";
import { SectionDrawingModelState } from "./ModelState";

/** Temporary, for testing.
 * @internal
 */
export interface SectionDrawingInfo {
  readonly spatialView: Id64String;
  readonly drawingToSpatialTransform: Transform;
  readonly displaySpatialView: boolean;
}

/** A view of a [DrawingModel]($backend)
 * @public
 */
export class DrawingViewState extends ViewState2d {
  /** @internal */
  public static get className() { return "DrawingViewDefinition"; }
  private readonly _modelLimits: ExtentLimits;
  private readonly _viewedExtents: AxisAlignedBox3d;
  private _sectionDrawingInfo?: SectionDrawingInfo;
  /** Temporary, for testing. @internal */
  public get sectionDrawingInfo() { return this._sectionDrawingInfo; }

  public constructor(props: ViewDefinition2dProps, iModel: IModelConnection, categories: CategorySelectorState, displayStyle: DisplayStyle2dState, extents: AxisAlignedBox3d) {
    super(props, iModel, categories, displayStyle);
    if (categories instanceof DrawingViewState) {
      this._viewedExtents = categories._viewedExtents.clone();
      this._modelLimits = { ...categories._modelLimits };
      this._sectionDrawingInfo = categories._sectionDrawingInfo;
    } else {
      this._viewedExtents = extents;
      this._modelLimits = { min: Constant.oneMillimeter, max: 10 * extents.maxLength() };
    }
  }

  public async load(): Promise<void> {
    this._sectionDrawingInfo = undefined;
    await super.load();
    const model = this.iModel.models.getLoaded(this.baseModelId);
    if (!model || !(model instanceof SectionDrawingModelState))
      return;

    // Find out if we also need to display the spatial view.
    let spatialView;
    let drawingToSpatialTransform;
    let displaySpatialView;
    const ecsql = `
      SELECT spatialView,
        json_extract(jsonProperties, '$.drawingToSpatialTransform') as drawingToSpatialTransform,
        json_extract(jsonProperties, '$.displaySpatialView') as displaySpatialView
      FROM bis.SectionDrawing
      WHERE ECInstanceId=${model.modeledElement.id}`;

    for await (const row of this.iModel.query(ecsql)) {
      spatialView = Id64.fromJSON(row.spatialView?.id);
      displaySpatialView = true === row.displaySpatialView;
      try {
        drawingToSpatialTransform = Transform.fromJSON(JSON.parse(row.drawingToSpatialTransform));
      } catch (_) {
        //
      }

      break;
    }

    // ###TODO: Don't bother if displaySpatialView === false
    if (spatialView && Id64.isValidId64(spatialView) && drawingToSpatialTransform && undefined !== displaySpatialView)
      this._sectionDrawingInfo = { spatialView, drawingToSpatialTransform, displaySpatialView };
  }

  public static createFromProps(props: ViewStateProps, iModel: IModelConnection): DrawingViewState {
    const cat = new CategorySelectorState(props.categorySelectorProps, iModel);
    const displayStyleState = new DisplayStyle2dState(props.displayStyleProps, iModel);
    const extents = props.modelExtents ? Range3d.fromJSON(props.modelExtents) : new Range3d();

    // use "new this" so subclasses are correct
    return new this(props.viewDefinitionProps as ViewDefinition2dProps, iModel, cat, displayStyleState, extents);
  }

  public getViewedExtents(): AxisAlignedBox3d {
    return this._viewedExtents;
  }

  public get defaultExtentLimits() {
    return this._modelLimits;
  }

  /** @internal */
  public isDrawingView(): this is DrawingViewState { return true; }
}
