import { Request, Response } from "express";
import semver from "semver";
import {
  CodeartifactClient,
  ListPackageVersionsCommand,
  PackageVersionSummary,
} from "@aws-sdk/client-codeartifact";

import configuration from "../config";

interface Problem {
  type?: string;
  status?: number;
  title?: string;
  detail?: string;
}

interface Release {
  url: string;
  problem?: Problem;
}

interface Payload {
  releases: Release[];
}

export default async function (req: Request, res: Response) {
  res.setHeader("Content-Version", 1);

  const client = new CodeartifactClient(configuration);
  const command = new ListPackageVersionsCommand({
    domain: req.params.domain,
    repository: req.params.repository,
    namespace: req.params.namespace,
    package: req.params.package,
    format: "swift",
  });

  try {
    const results = await client.send(command);
    const releases = results.versions
      .filter((v) => semver.valid(v.version))
      .sort((a, b) => (semver.lt(a.version, b.version) ? 1 : -1))
      .map((v: PackageVersionSummary) => {
        const release: Release = {
          url: req.path + "/" + v.version,
        };

        switch (v.status) {
          case "Unfinished":
          case "Unlisted":
          case "Disposed":
            return undefined;
          case "Archived":
            release["problem"] = {
              status: 410,
              title: "Archived",
            };
            break;
        }

        return release;
      })
      .filter((r) => !!r);

    const payload: Payload = { releases };

    res.status(200);
    res.contentType("application/json");
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500);
  }
}
