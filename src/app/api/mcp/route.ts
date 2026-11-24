// Palmera Admin MCP endpoint — for clients that can send a header
// (Claude Code, Claude Desktop config, the API):
//   POST /api/mcp      Authorization: Bearer pal_…
// Connector UIs that only take a URL use /api/mcp/{key} instead.
// See docs/ai-connector.md.
import { bearerOf, mcpMethodNotAllowed, mcpPost } from '@/lib/ai/mcp'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export const POST = (req: Request) => mcpPost(req, bearerOf(req))
export const GET = mcpMethodNotAllowed
export const DELETE = mcpMethodNotAllowed
