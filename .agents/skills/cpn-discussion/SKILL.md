---
name: cpn-discussion
description:
  "Use when opening, answering, converting, or closing a GitHub discussion in
  this repo: RFC framing, French prose, category by purpose, conversion to
  issue when converged."
license: Apache-2.0
metadata:
  version: 1.0.0
---

# Console discussions

Discussions are the convergence phase before an issue exists. An RFC lands
here, not in an issue. Once converged, the outcome is an issue — a discussion
never carries implementation work.

## Prerequisites

- Discussions enabled on `cloud-pi-native/console`.
- `gh` authenticated; discussion writes need GraphQL, not REST.

An unmet requirement is a reported blocker, never a silent scope change.

## Open

1. Search open discussions first — reuse a matching thread instead of
   duplicating it.
2. Discover the real categories at runtime, never from memory:

```bash
gh api graphql -f query='{ repository(owner:"cloud-pi-native",name:"console"){
  discussionCategories(first:20){ nodes{ id name } } } }'
```

3. Category by purpose: question → Q&A, proposal → Ideas, convention or
   architecture debate → the repo's general/RFU category as discovered.
4. Body in French: context, the open question, the options considered. No
   acceptance tasklist — a discussion is not an issue. No solution embedded;
   the thread produces it.

## Answer and moderate

- Answer in French, findings with evidence, one statement per fact.
- Mark an answer as resolved only when it states a verified fact or a
   decision; a helpful comment is not a resolution.
- A thread drifting toward implementation stops: state that the converged
   outcome moves to an issue, then convert.

## Convert to issue

When a proposal converges:

1. Verify the convergence: a stated decision or verified fact, never an
   impression — a thread that "seems" converged keeps moderating until a
   decision emerges.
2. Create the issue per `cpn-issue`, linking the discussion URL in its
   Références section.
3. Post the conversion comment on the discussion — decision summary, options
   rejected, link to the issue — then close it. The issue carries the work
   from here.

## Close

Close when answered, converted, or abandoned with a stated reason. Never
delete a discussion — it is the decision record.

## Verify

`gh api graphql` read-back of the discussion state and, after conversion,
the linked issue number in the closing comment.

## See also

`cpn-issue` (the converged outcome) · `cpn-dev` (lifecycle).
