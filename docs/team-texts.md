# Team text automation (Claude → Jordan / Samson)

Claude sends iMessages via the connected Messages account at the trigger
points below. Arjun authorized this standing automation on 2026-08-19.

## The unbreakable rule
EVERY message starts with this exact preface, then a blank line:

> Hey guys. Claude here lol. Arjun sent me to tell you this

## Template
```
Hey guys. Claude here lol. Arjun sent me to tell you this

<ONE topic. Max 3 sentences. Action first if one is needed.>
<Optional: one link — usually SYNC-STATUS or the live page.>
```

## Restrictions
1. Max 3 sentences after the preface. No multi-topic messages — two topics
   = two occasions, and almost always only one is worth sending at all.
2. Action-needed items lead with the action ("Pull main before…", "Can you
   confirm…"). FYIs only when the recipient will actually notice the change.
3. Details are NEVER restated in the text — link to
   github.com/arjunbellur/palmera-site/blob/main/docs/SYNC-STATUS.md or the
   relevant page instead.
4. No secrets, keys, or customer personal data in any message, ever.
5. One message per trigger event. Never resend on retries/amended pushes.

## Triggers
| Event | Recipient | Message core |
|---|---|---|
| Rules/index deploy (shared surface) | Samson | what changed one-line + "pull main before your next rules deploy" |
| Push that changes something a recipient uses (partner/admin feature Jordan asked for, contract change Samson consumes) | whoever it affects | what's live + where to look |
| New SYNC-STATUS action item for Samson | Samson | the ask + doc link |
| Routine pushes (refactors, copy, docs, internal) | nobody | — |

## Mechanics
Sent through the iMessage connector (individual recipients — the connector
can't post to group chats). Numbers live with Arjun's contacts; Claude
confirms the wiring with a test message before the first real send of a
session type.
