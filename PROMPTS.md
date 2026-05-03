# Build Process & Prompts

This file documents how I approached building this project, what tools I used, and the decisions I made along the way. The assignment explicitly allows use of AI tools, and I used Claude and Gemini as a learning companion throughout — but I want to be clear about what that actually looked like in practice.

---

## My starting point

My background is in ML engineering — anomaly detection, async backends, PyTorch, FastAPI. I had studied DBMS in college and had touched Docker and Redis before, but never built a distributed system that combined all of these together. I'd also never worked with PostgreSQL transactions, MongoDB at scale, or TypeScript on the backend.

So this project was genuinely new territory for me, and I treated it that way.

---

## How I actually used AI

I didn't ask Claude or Gemini to write the project for me. My approach was: understand the concept first, then implement it, then debug it myself before asking for help.

For example — before writing the ring buffer, I asked Claude to explain what a ring buffer is and *why* it solves the backpressure problem, without giving me code. Only after I understood the circular index logic (`% size`) did I implement it. Same with the state pattern — I read about it first, understood why each state being its own class beats a giant if/else chain, then wrote the code.

When I hit errors, my rule was: read the error fully first, guess the cause, then verify. The TypeScript `req.params.id` type error is a good example — I spotted it was a `string | string[]` mismatch and understood why before fixing it. The `@types/pg` missing package — I figured that out on my own before Gemini even responded.

The Docker `ECONNREFUSED` error at 2 AM taught me something real: containers don't survive laptop restarts. That's why production systems have process managers and auto-restart policies. I learned that by hitting it, not by reading about it.

---

## Architecture decisions I made

**Why three databases?**
This wasn't handed to me as a requirement list to implement — I had to understand *why* each database exists. MongoDB for raw signals because it's schema-less and handles burst writes without caring about structure. PostgreSQL for work items because state transitions need to be transactional — you can't have a work item half-updated. Redis for the dashboard because hitting Postgres on every 5-second UI refresh is wasteful when the data changes slowly.

**Why dependency injection in DebounceEngine?**
Claude asked me why DebounceEngine accepts DB functions as parameters instead of importing them directly. My first answer was wrong (I said it was about memory). The real answer — separation of concerns, testability, storage-agnosticism — I arrived at through the conversation. That understanding is why I could write the unit tests confidently: I knew exactly what the class was responsible for and what it wasn't.

**Why a ring buffer instead of a queue library?**
I could have used Bull or BeeQueue. I chose to implement the ring buffer from scratch because I wanted to actually understand backpressure, not just install a package that handles it invisibly. The `push()` returning false when full, the `drain()` taking batches, the circular pointer arithmetic — I wrote all of that and understand all of it.

---

## Debugging log (real things I fixed myself)

- Typed `:` instead of `;` in psql on Day 1 — learned SQL statement termination the hard way
- Ran `npm run dev` from `backend/src/` instead of `backend/` — understood the error, fixed it
- `ECONNREFUSED` on Postgres — diagnosed as containers not running, not a code issue
- TypeScript `string | string[]` error on `req.params.id` — understood the type mismatch, added `as string` cast
- Frontend blank screen — checked browser console (F12), read the null reference error, added the guard

---

## Prompts I used (representative examples)

These are the kinds of questions I asked. I'm paraphrasing — the actual conversations were longer and more back-and-forth.

- "Explain ring buffers to me like I'm building one from scratch, don't give me code yet"
- "Why would you use a State Pattern instead of if/else for work item transitions?"
- "What's the difference between MongoDB and PostgreSQL for this use case specifically?"
- "I'm getting ECONNREFUSED on port 5432 — what does that mean and what should I check first?"
- "Review this ring buffer implementation — does the circular logic look correct?"
- "Why does my frontend show a blank screen when I click an incident?" (I checked console first, found the null error, then confirmed the fix)

---

## What I learned building this

Things I actually understand now that I didn't before:

- How backpressure works in practice and why in-memory buffers exist between fast producers and slow consumers
- Why SQL transactions (BEGIN/COMMIT/ROLLBACK) matter — the RCA submission does two writes that must both succeed or both fail
- The difference between a design pattern that looks good on paper (State, Strategy) and one that actually simplifies debugging
- Why Docker containers don't persist between restarts and what that means for production reliability
- How Redis fits into a real read path — not just "caching is good" but specifically: what to cache, for how long, and when to invalidate
- TypeScript strictness is annoying until it catches a real bug

---

## Tools used

- **Claude** — learning companion, code review
- **Gemini** —  architecture discussion, error debugging, concept clarification and knowledge in depth
- **VS Code** — editor
- **Docker Desktop** — container management
- **Postman / curl** — API testing
- **Chrome DevTools** — frontend debugging
