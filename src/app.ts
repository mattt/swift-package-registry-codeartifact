import express from "express";

import listReleases from "./endpoints/listReleases";
import fetchMetadata from "./endpoints/fetchMetadata";
import fetchManifest from "./endpoints/fetchManifest";
import fetchSourceArchive from "./endpoints/fetchSourceArchive";
import publishRelease from "./endpoints/publishRelease";

const app = express();

app.set("port", process.env.PORT || 3000);

app.get("/:domain/:repository/:namespace/:package", listReleases);
app.get("/:domain/:repository/:namespace/:package/:version", fetchMetadata);
app.get("/:domain/:repository/:namespace/:package/:version/Package.swift", fetchManifest);
app.get("/:domain/:repository/:namespace/:package/:version.zip", fetchSourceArchive);
app.put("/:domain/:repository/:namespace/:package/:version", publishRelease);

export default app;
