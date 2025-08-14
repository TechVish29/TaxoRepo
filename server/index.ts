import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleValidateCampaign } from "./routes/validate-campaign";
import {
  handleBulkValidation,
  handleSaveRuleVersion,
  handleGetRuleVersions,
  handleValidationRerun,
  handleExportMapping
} from "./routes/rule-maker";
import {
  handleSavePlatformRules,
  handleGetPlatformRules,
  handleGetSpecificPlatformRules
} from "./routes/platform-rules";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/validate-campaign", handleValidateCampaign);

  // Rule Maker API routes
  app.post("/api/bulk-validate", handleBulkValidation);
  app.post("/api/rule-versions", handleSaveRuleVersion);
  app.get("/api/rule-versions", handleGetRuleVersions);
  app.post("/api/validation-rerun", handleValidationRerun);
  app.post("/api/export-mapping", handleExportMapping);

  // Platform Rules API routes
  app.post("/api/platform-rules", handleSavePlatformRules);
  app.get("/api/platform-rules", handleGetPlatformRules);
  app.get("/api/platform-rules/:platform", handleGetSpecificPlatformRules);

  return app;
}
