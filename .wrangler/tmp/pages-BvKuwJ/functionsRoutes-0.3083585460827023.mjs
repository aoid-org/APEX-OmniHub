import { onRequestOptions as __api_mcp_invoke_ts_onRequestOptions } from "C:\\Users\\sinyo\\OMNILINK-APEX HUB\\APEX-OmniLink\\APEX-OmniHub\\APEX-OmniHub\\functions\\api\\mcp\\invoke.ts"
import { onRequestPost as __api_mcp_invoke_ts_onRequestPost } from "C:\\Users\\sinyo\\OMNILINK-APEX HUB\\APEX-OmniLink\\APEX-OmniHub\\APEX-OmniHub\\functions\\api\\mcp\\invoke.ts"
import { onRequestPost as __api_omnibridge_ingest_ts_onRequestPost } from "C:\\Users\\sinyo\\OMNILINK-APEX HUB\\APEX-OmniLink\\APEX-OmniHub\\APEX-OmniHub\\functions\\api\\omnibridge\\ingest.ts"
import { onRequestPost as __api_omnibridge_sync_ts_onRequestPost } from "C:\\Users\\sinyo\\OMNILINK-APEX HUB\\APEX-OmniLink\\APEX-OmniHub\\APEX-OmniHub\\functions\\api\\omnibridge\\sync.ts"
import { onRequest as __api_omnibridge_ingest_ts_onRequest } from "C:\\Users\\sinyo\\OMNILINK-APEX HUB\\APEX-OmniLink\\APEX-OmniHub\\APEX-OmniHub\\functions\\api\\omnibridge\\ingest.ts"
import { onRequest as __api_omnibridge_sync_ts_onRequest } from "C:\\Users\\sinyo\\OMNILINK-APEX HUB\\APEX-OmniLink\\APEX-OmniHub\\APEX-OmniHub\\functions\\api\\omnibridge\\sync.ts"

export const routes = [
    {
      routePath: "/api/mcp/invoke",
      mountPath: "/api/mcp",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_mcp_invoke_ts_onRequestOptions],
    },
  {
      routePath: "/api/mcp/invoke",
      mountPath: "/api/mcp",
      method: "POST",
      middlewares: [],
      modules: [__api_mcp_invoke_ts_onRequestPost],
    },
  {
      routePath: "/api/omnibridge/ingest",
      mountPath: "/api/omnibridge",
      method: "POST",
      middlewares: [],
      modules: [__api_omnibridge_ingest_ts_onRequestPost],
    },
  {
      routePath: "/api/omnibridge/sync",
      mountPath: "/api/omnibridge",
      method: "POST",
      middlewares: [],
      modules: [__api_omnibridge_sync_ts_onRequestPost],
    },
  {
      routePath: "/api/omnibridge/ingest",
      mountPath: "/api/omnibridge",
      method: "",
      middlewares: [],
      modules: [__api_omnibridge_ingest_ts_onRequest],
    },
  {
      routePath: "/api/omnibridge/sync",
      mountPath: "/api/omnibridge",
      method: "",
      middlewares: [],
      modules: [__api_omnibridge_sync_ts_onRequest],
    },
  ]