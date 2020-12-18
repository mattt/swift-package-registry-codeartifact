import { Request, Response } from "express";
import {
  CodeartifactClient,
  ListPackageVersionAssetsCommand,
  AssetSummary,
  GetPackageVersionAssetCommand,
} from "@aws-sdk/client-codeartifact";

import configuration from "../config";

interface Payload {}

const packageMetadataFileName = "metadata.json"; // to be defined by AWS CodeArtifact

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

  try {
    const result = await client.send(command);
    const asset: AssetSummary | undefined = result.assets.find(
      (a: AssetSummary) => {
        a.name === packageMetadataFileName;
      }
    );

    const payload: Payload = {};

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

      res.status(200);
      res.contentType("application/json");
      res.json(payload);
    } else {
      res.status(404);
    }
  } catch (err) {
    console.error(err);
    res.status(500);
  }
}
