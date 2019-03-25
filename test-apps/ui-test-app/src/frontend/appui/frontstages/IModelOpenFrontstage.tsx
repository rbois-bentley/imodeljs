/*---------------------------------------------------------------------------------------------
| $Copyright: (c) 2019 Bentley Systems, Incorporated. All rights reserved. $
 *--------------------------------------------------------------------------------------------*/
import * as React from "react";
import { CoreTools, ContentGroup, ContentControl, ConfigurableUiManager,
         ConfigurableCreateInfo, FrontstageProvider, FrontstageProps,
         Frontstage, IModelOpen, IModelInfo } from "@bentley/ui-framework";
import { SampleAppIModelApp } from "../../index";

class IModelOpenControl extends ContentControl {
  constructor(info: ConfigurableCreateInfo, options: any) {
    super(info, options);

    const accessToken = SampleAppIModelApp.getAccessToken()!;
    super.reactElement = <IModelOpen accessToken={accessToken} onIModelSelected={this._onOpenIModel} />;
    // super.reactElement = <IModelOpen accessToken={accessToken} onOpenIModel={this._onOpenIModel} initialIModels={[defaultImodel]} />
  }

  // called when an imodel has been selected on the IModelOpen
  private _onOpenIModel = async (iModelInfo: IModelInfo) => {
    await SampleAppIModelApp.showIModelIndex(iModelInfo.projectInfo.wsgId, iModelInfo.wsgId);
  }
}

ConfigurableUiManager.registerControl("IModelOpenControl", IModelOpenControl);

export class IModelOpenFrontstage extends FrontstageProvider {

  public get frontstage(): React.ReactElement<FrontstageProps> {
    const contentGroup: ContentGroup = new ContentGroup({
        contents: [
          {
            classId: "IModelOpenControl",
          },
        ],
      });

    return (
      <Frontstage id="IModelOpen"
        defaultTool={CoreTools.selectElementCommand}
        defaultLayout="SingleContent"
        contentGroup={contentGroup}
        isInFooterMode={false}
        />
    );
  }
}
