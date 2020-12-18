import { Request, Response } from "express";
import {
  CodeartifactClient,
  ListPackageVersionAssetsCommand,
  AssetSummary,
  GetPackageVersionAssetCommand,
} from "@aws-sdk/client-codeartifact";

import configuration from "../config";

type Payload = string;

export default async function (req: Request, res: Response) {
  res.setHeader("Content-Version", 1);

  const client = new CodeartifactClient(configuration);
  const command = new ListPackageVersionAssetsCommand({
    domain: req.params.domain,
    repository: req.params.repository,
    namespace: req.params.namespace,
    package: req.params.package,
    packageVersion: req.params.version,
    format: "swift",
  });

  let manifestFileName = "Package.swift";
  if (req.params.swift_version.match(/(\d+)(?:\.(\d+)){0,2}/)) {
    manifestFileName = `Package@swift-${req.params.swift_version}.swift`;
  }

  try {
    const result = await client.send(command);
    const asset: AssetSummary | undefined = result.assets.find(
      (a: AssetSummary) => {
        a.name === manifestFileName;
      }
    );

    let payload: Payload;

    if (asset) {
      const command = new GetPackageVersionAssetCommand({
        domain: req.params.domain,
        repository: req.params.repository,
        namespace: req.params.namespace,
        package: req.params.package,
        packageVersion: req.params.version,
        format: "swift",
        asset: asset.name,
      });

      const result = await client.send(command);
      console.log(result);
      // FIXME: decode asset from result
    }

    res.status(200);
    res.contentType("text/x-swift");
    res.attachment(manifestFileName);
    res.send(payload);
  } catch (err) {
    console.error(err);
    res.status(500);
  }
}
