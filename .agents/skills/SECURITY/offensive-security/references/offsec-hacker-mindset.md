# Hacker Mindset

> Sources:
> - Steven Levy — Hackers: Heroes of the Computer Revolution (1984)
> - Keren Elazari — Hackers: The Internet's Immune System (TED 2014)
> - Help Net Security — The hacker mindset drives innovation: https://www.helpnetsecurity.com/2024/04/17/keren-elazari-hacker-mindset-innovation/
> - The hacker ethic: https://www.funkysi1701.com/posts/2025/the-hacker-ethic/

---

## The Original Meaning

The word "hacker" predates malicious intent. At MIT in the 1950s and 1960s,
hackers were programmers who found elegant, clever solutions — who understood
systems deeply enough to make them do unexpected things. Curiosity and craft
were the defining traits, not destruction.

The hacker ethic, as documented by Steven Levy, rests on a handful of
principles that still hold:

- **Information wants to be free.** Knowledge shared accelerates progress for
  everyone. Gatekeeping slows it.
- **Computers can change the world.** Systems are worth understanding deeply,
  not just using.
- **Meritocracy over credentials.** What you build and break matters more than
  what you claim.
- **Decentralisation over control.** Systems that empower individuals are
  preferable to those that consolidate power.

---

## Curiosity as Method

The hacker approach to a system is not "how do I use this?" but "how does
this actually work?" — and then inevitably "what happens if I do this?"

This is not recklessness. It is systematic exploration. The hacker:

1. **Observes** — what does the system claim to do?
2. **Probes** — what does it actually do under pressure, at boundaries, with
   unexpected input?
3. **Hypothesises** — why does it behave this way?
4. **Tests** — confirms or refutes the hypothesis
5. **Documents** — makes the knowledge available

Every security finding is the result of this loop. The loop does not stop when
an obvious path fails — it reframes the question.

---

## The Ethical Boundary

Curiosity without ethics is vandalism. The hacker mindset in a security
context demands a clear line:

**Always-on rules:**
- No testing without explicit authorisation — written, scoped, timestamped
- No data exfiltration beyond minimal proof-of-concept
- No persistence, no lateral movement beyond what the engagement authorises
- No collateral damage to systems outside scope
- No withholding of critical findings — if you find something that puts people
  at risk, you report it

**The intent test.** Before any action: could this cause harm that cannot be
undone? If yes — stop, escalate, document.

Ethics is not a compliance checkbox. It is the thing that distinguishes a
security researcher from an attacker. The tools are identical. The intent
and the authorisation are what differ.

---

## Open Source Values

The hacker community built the internet on open source. This is not incidental
— it is the hacker ethic in practice. Contributing back, sharing findings,
publishing tools, writing public write-ups: these are acts of craft, not just
altruism.

For offensive security work specifically:
- Publish tools that improve the community's capability, not just your own
- Write CVE disclosures that help defenders understand and fix, not just
  credit the finder
- Share methodologies so the next researcher builds on your work rather than
  rediscovering it
- Open-source proof-of-concept code where appropriate — secrecy benefits
  attackers, transparency benefits defenders over time

---

## Anti-Patterns

| Pattern | Problem |
|---|---|
| Testing without authorisation | Illegal regardless of intent; damages the field |
| Hoarding findings | Keeps defenders blind; serves no one |
| Complexity for its own sake | Obscures technique; harder to reproduce and verify |
| Certification-first thinking | Credentials follow competence, not the reverse |
| Enterprise-first framing | Security is a craft before it is a career |
| Disclosure as leverage | Extortion; not security research |
| Scoreboard mentality | CVE counts without quality reporting degrades the ecosystem |

---

## In Practice

The hacker mindset applied daily:

- **Read everything.** CVE databases, security blogs, conference talks, source
  code. Understand the landscape.
- **Break your own tools.** If you build a scanner, attack it. If you write a
  parser, fuzz it.
- **Write it down.** Findings you cannot explain clearly are findings you do
  not fully understand.
- **Teach what you know.** The community that taught you expects the same in
  return.
- **Stay legal.** Platforms like HackerOne, Bugcrowd, and CTFs give you legal
  targets. Use them.
