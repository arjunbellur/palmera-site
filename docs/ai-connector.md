# AI connector — Claude and ChatGPT for the admin dashboard

A Model Context Protocol (MCP) server inside this app, so a teammate's AI
assistant can look things up in Palmera and draft listings for them, instead
of clicking through the editor.

- Endpoint: `POST https://www.palmeraexp.com/api/mcp`
- Keys are issued, listed and revoked at `/admin/ai` (admins only).
- Code: `src/lib/ai/` (keys, listing builder, tools, protocol) and
  `src/app/api/mcp/`.

## Access keys

There is no shared password. Each person (and each assistant) gets a key of
their own, so access can be cut for one without touching the others and every
change is attributed.

- A key looks like `pal_…` (256 bits of randomness). It is shown once, when it
  is created. Only its SHA-256 is stored (`ai_keys/{hash}`), so a database
  leak does not leak keys.
- The endpoint answers nobody until a key exists.
- Two ways to present it:
  - in the URL, `https://www.palmeraexp.com/api/mcp/<key>` — for the Claude
    and ChatGPT "add a connector" screens, which take a URL;
  - as `Authorization: Bearer <key>` on `/api/mcp` — for clients that can
    send a header (Claude Code, scripts).
- The URL form puts the secret in a path, so it appears in the hosting
  provider's request logs. Treat the link like a password and revoke it at
  `/admin/ai` if it is ever pasted somewhere it should not be.

### Permissions

| Permission | Lets the assistant | Risk |
| --- | --- | --- |
| `read` (always on) | See businesses, listings, bookings (guest first name only), Featured tonight, headline numbers | None to members |
| `write` | Create listings as drafts; edit listings that are not live | Members see nothing until a person publishes |
| `publish` | Publish and unpublish, edit live listings, set Featured tonight | Members see the change at once |

Start people on `read` + `write`. Give `publish` only to someone who wants the
assistant to act on the live app, and expect the assistant to ask before it
does: the server tells it to confirm first.

## Tools

| Tool | Permission | What it does |
| --- | --- | --- |
| `overview` | read | Counts: live listings by city, drafts, businesses, bookings by status, this month's delivered bookings and revenue |
| `listing_options` | read | Valid cities, categories and subcategories, cancellation tiers, languages |
| `list_companies` | read | Businesses with ids (unfinished signups are flagged) |
| `list_listings` / `get_listing` | read | Listings, their fields, and what each still needs before it can go live |
| `list_bookings` | read | Recent bookings, filterable by status or business |
| `get_featured` | read | Featured tonight per city |
| `create_listing` | write | New draft listing for a business, with choices and extras; `dryRun` previews without saving |
| `update_listing` | write (`publish` if the listing is live) | Change any fields; `dryRun` previews |
| `set_listing_status` | publish | Publish, unpublish or return to draft; refuses to publish a listing with no photo, no map link or no price |
| `set_featured` | publish | Set or clear Featured tonight for a city |

## What the connector will not do

- Upload photos. Every AI-drafted listing needs a person to add photos in the
  dashboard, which is also the review step before publishing.
- Delete anything.
- Touch money: no refunds, payouts, commission rates or payment settings.
- Show member contact details. Bookings carry the guest's first name only.
- Create businesses or partner accounts.

Listings are built by the same code path the editor uses (categories,
weekly availability, cancellation window, option groups), so an AI draft is
indistinguishable from a hand-made one apart from `createdVia:
'ai_connector'`. Prices must be whole XOF; a fractional or malformed value is
rejected, never rounded.

Every change, and every refused attempt, is written to `ai_audit` and shown
under Activity at `/admin/ai`.

## Connecting an assistant

Menus in both products move; these were right in November 2026.

**Claude** (any plan; the Free plan allows one custom connector):
claude.ai/customize/connectors → Add → Add custom connector → name it
"Palmera", paste the connector URL → Continue → Add. On a Team or Enterprise
workspace an Owner adds it under Organization settings → Connectors.

**ChatGPT** (web only): Plugins → + → Add custom MCP server → name it
"Palmera", paste the connector URL → tick the acknowledgement → Create as a
plugin. ChatGPT allows actions that change data only on Business, Enterprise
and Edu workspaces; on Pro a custom server is limited to looking things up,
so drafting listings will not work there.

**Claude Code**:
`claude mcp add --transport http palmera https://www.palmeraexp.com/api/mcp --header "Authorization: Bearer <key>"`

Then ask in plain language, for example: "Draft a listing for Yuma Lodge: a
sunset dinner, 25,000 XOF per person, Thursday to Saturday 18:00 to 23:00,
with a choice of fish or lobster (+15,000)."

## Protocol notes

Streamable HTTP in its stateless form: one JSON-RPC message (or a batch of up
to 20) per POST, one JSON answer, no session id, no SSE stream; `GET` returns
405. Methods: `initialize`, `ping`, `tools/list`, `tools/call` (plus empty
`resources/list` and `prompts/list`). A key only sees the tools its
permissions allow. Tool failures come back as a result with `isError: true`
and a message the assistant can act on.
