import { Request, Response } from "express";
import { CodeartifactClient } from "@aws-sdk/client-codeartifact";

import configuration from "../config";

export default function (req: Request, res: Response) {
  res.setHeader("Content-Version", 1);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const client = new CodeartifactClient(configuration);

  // TODO: create package version and upload asset

  res.status(501);
}
