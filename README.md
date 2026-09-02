# ABC Cabinet Shop-Floor Assistant

A chat assistant for shop-floor operators, built as an n8n workflow with a
React frontend. Operators confirm their workstation, look up panel
details, and pull SOPs, all through a chat interface backed by structured
tool calls rather than free-form LLM answers.

## Demo URL

N/A — no hosted demo; see setup instructions below to run locally.

## Repository / source code

[github.com/jojosfplay99/shop-floor-mock](https://github.com/jojosfplay99/shop-floor-mock)

## LLM provider

**Groq**, running [`openai/gpt-oss-safeguard-20b`](https://groq.com), wired
into the n8n AI Agent node via n8n's Groq Chat Model credential. Groq's
inference speed keeps shop-floor round-trips fast, which matters here since
the agent often needs multiple tool calls in sequence (confirm workstation
→ look up panel → check SOP) before an operator gets a full answer.

## Agent implementation approach

The agent runs as an n8n AI Agent node with a system prompt that treats the
conversation as a fixed procedure rather than an open-ended chat. The main
design decisions:

- **Step ordering is enforced in the prompt, not just suggested.** The
  operator must confirm a workstation (Step 1) before panel lookups
  (Step 2), and SOPs (Step 3) can be requested any time after Step 1. The
  agent won't skip ahead even if an operator asks for a panel before
  confirming their station.

- **Tool calls require fresh input.** The agent is instructed to only call a
  tool when the operator has just supplied the specific input that tool
  needs — never a remembered or guessed value from earlier in the
  conversation. This avoids the common failure mode where an agent reuses a
  stale panel code or workstation ID.

- **Session state is held in the prompt, not re-asked for.** Once a
  workstation is confirmed, its ID is reused automatically for every
  following panel or SOP lookup in that session. The only way to change it
  is typing "home" (full reset) or explicitly stating a station change.

- **No invention of technical data.** The agent is told explicitly not to
  estimate machine settings, feed rates, tooling parameters, or safety
  procedures. If a tool doesn't return a value the operator asks for, the
  agent says so plainly instead of filling the gap from general knowledge.

- **Answers are grounded in tool output, not paraphrased.** For panel data
  and SOP content, the agent quotes the tool's fields as returned — same
  units, same wording — rather than reformatting or summarizing. Every SOP
  answer ends with a `Source:` line pulled from the tool's `source` field,
  so an operator (or auditor) can trace an instruction back to its origin.

- **Reported issues trigger real escalation, not just advice.** If an
  operator reports something happening right now at their station (a
  defect, a material problem, a malfunction) — even if an SOP's
  `escalation` field already describes what to do about it — the agent
  calls `escalate_supervisor` itself and confirms notification as
  completed ("Supervisor has been notified"), rather than instructing the
  operator to notify the supervisor themselves.

- **Every response includes a trace of what was actually called.** When a
  tool runs, the response ends with a log line (e.g.
  `✓ mock_sop("WS-01") — Source: SOP - Panel Saw 1`), so behavior is
  auditable turn by turn. No tool call means no trace line — this keeps the
  log meaningful instead of decorative.

## Data storage approach

Workstation, panel, and SOP data are stored as static mock JSON inside the
n8n workflow itself (via Set or Code nodes), rather than an external
database or spreadsheet. Each "tool" the agent calls is really a lookup
against one of these in-workflow datasets.

**Why mock JSON for this stage:**
- No external dependency (database credentials, API keys, network calls) —
  the whole workflow runs self-contained and is easy to import, inspect, or
  hand off.
- Fast to iterate on: adding or editing a workstation, panel, or SOP is a
  direct edit to the node's JSON, not a schema migration.
- Keeps the focus on agent behavior and prompt design during prototyping,
  without data-layer complexity in the way.

**Shape of the data:**

```jsonc
// Workstations
{
  "WS01": { "workstation_id": "WS01", "name": "Panel Saw 1", "department": "Cutting" }
}

// Panels
{
  "PNL-0231": {
    "panel_code": "PNL-0231",
    "cabinet_id": "CAB-118",
    "panel_name": "Left Side Panel",
    "length_mm": 720,
    "width_mm": 560,
    "thickness_mm": 18,
    "material": "18mm MDF",
    "required_operation": "Cut to size, edge band",
    "expected_workstation_id": "WS01"
  }
}

// SOPs
{
  "WS01": {
    "purpose": "...",
    "procedure": "...",
    "quality_check": "...",
    "escalation": "...",
    "source": "SOP - Panel Saw 1"
  }
}
```

Lookups accept either a code/ID or a display name (e.g. `"WS01"` or
`"Panel Saw 1"`) and are passed through to the matching node without the
agent trying to guess or reformat the input first.

**Moving beyond mock data:** the tool nodes are isolated from the agent's
prompt and logic, so swapping the mock JSON for Airtable, Google Sheets, or
a real database later only means changing the tool node's data source — the
system prompt and agent behavior don't need to change.

## Approximate time spent

~2 hours 40 minutes

## Setup

1. Import the n8n workflow (Chat Trigger → AI Agent → tool nodes).
2. Copy the Chat Trigger node's **Production webhook URL**.
3. In the frontend, copy `.env.example` to `.env` and set
   `VITE_N8N_WEBHOOK_URL` to that URL.
4. Add the frontend's dev/prod origin to the Chat Trigger node's CORS
   allowlist.
5. `npm install && npm run dev`.

## Required Test Results

- ☑ Correct Workstation
- ☑ Wrong Workstation
- ☑ Unsupported Question / No Hallucination
- ☑ Unknown Panel
- ☑ Supervisor Escalation

## Demo

Sample transcripts (values match the mock data shape shown above — swap in
your actual test data if it differs). A full recording script is in
`DEMO_SCRIPT.md`.

<details>
<summary><strong>Correct Workstation</strong></summary>

```
Operator: WS01
Agent: Workstation confirmed — WS01, Panel Saw 1, Cutting department.
       What panel would you like to look up?
       ✓ Get Workstation Info("WS01")

Operator: PNL-0231
Agent: Panel Code: PNL-0231
       Cabinet ID: CAB-118
       Panel Name: Left Side Panel
       Dimensions: 720mm x 560mm x 18mm
       Material: 18mm MDF
       Required Operation: Cut to size, edge band
       ✓ Get Panel Info("PNL-0231")
```
</details>

<details>
<summary><strong>Wrong Workstation</strong></summary>

```
Operator: PNL-0450
Agent: This panel is assigned to a different workstation and doesn't
       belong here. Please check with your supervisor.
       ✓ Get Panel Info("PNL-0450")
```
</details>

<details>
<summary><strong>Unsupported Question / No Hallucination</strong></summary>

```
Operator: What feed rate should I run for this cut?
Agent: That value isn't available in the workstation, panel, or SOP data
       for WS01. I can't provide feed rates or machine settings that
       aren't in the data — please check with your supervisor or the
       machine's control panel.
```
</details>

<details>
<summary><strong>Unknown Panel</strong></summary>

```
Operator: PNL-9999
Agent: I couldn't find a panel with that code. Please re-scan or
       re-enter it.
       ✓ Get Panel Info("PNL-9999")
```
</details>

<details>
<summary><strong>Supervisor Escalation</strong></summary>

```
Operator: The wet wood is a material issue.
Agent: The wet wood is a material issue. Supervisor has been notified.
       ✓ escalate_supervisor("wet wood material issue" at WS01) —
         Logged & Supervisor Notified
```
</details>

## Brief Technical Questions

**1. How does the agent decide which tool to call?**
The system prompt maps each conversation step to a specific tool. The agent can only call a tool when the operator provides the required input and cannot skip steps or guess values.

**2. What tools are available?**

* `Get Workstation Info`
* `Get Panel Info`
* `Get Workstation SOP`
* `escalate_supervisor`

**3. What comes from structured data rather than the LLM?**
All factual workstation, panel, and SOP information comes from mock JSON tool data. The LLM only selects the tool and presents its results.

**4. How do you prevent unsupported answers?**
The agent must use returned tool values exactly, never estimate technical or safety information, and clearly state when data is unavailable. Unsupported issues are escalated to a supervisor.

**5. What happens when a tool or LLM call fails?**
The failure is clearly reported by the AI, and the operator is asked to re-enter or re-scan the input. Issues that cannot be resolved are sent to `escalate_supervisor`.

**6. What would you improve with one more day?**
I would improve **panel code normalization**. The prompt requires normalization but doesn't define the exact format, leaving room for guessing. Defining this rule would better enforce the system's no-guessing principle.
