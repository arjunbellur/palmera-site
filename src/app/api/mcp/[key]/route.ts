// Palmera Admin MCP endpoint with the access key in the path — the form the
// Claude and ChatGPT "add custom connector" screens accept (URL only):
//   https://www.palmeraexp.com/api/mcp/pal_…
// The key is a personal secret: whoever has the URL can act with its
// permissions until an admin revokes it at /admin/ai.
import { bearerOf, mcpMethodNotAllowed, mcpPost } from '@/lib/ai/mcp'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params
  return mcpPost(req, bearerOf(req) ?? key)
}
export const GET = mcpMethodNotAllowed
export const DELETE = mcpMethodNotAllowed
