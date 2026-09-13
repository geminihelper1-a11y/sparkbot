# Spark Session 3 — Chat Reliability Fix

Fixed the chatbot path that could return null for normal questions because ordinary conversation was forced through a strict JSON-schema response. Normal chat now uses a standard text completion path, with one retry and a stronger-model fallback. Memory extraction runs separately so memory failure cannot block the reply.

Also reduced the per-member cooldown, added typing feedback, added a top-level message-handler safety catch, and limited live channel context to channels the current member can actually view.

Role/admin command paths were left deterministic; the chatbot does not get direct destructive authority.
