"""Lovli memory engine + memory orchestra.

Event-sourced learning layer: append-only conversation_events are reduced into
derived, fully-rebuildable memory (memory_atoms, texting_profiles,
tone_profiles, phrase_rules) that the orchestra turns into personalized,
safety-bounded generation.

Module map:
- memory.py            event write path, rebuild, delete, pause (db I/O)
- memory_reducers.py   pure deterministic reducers (no I/O)
- text_features.py     pure text feature extraction + edit diffing (no I/O)
- memory_context.py    get_memory_context read contract + in-process cache
- reply_orchestrator.py generation plan + prompt block + memory_used
- reply_scoring.py     pure rerank of LLM reply variants
- safety.py            baseline non-manipulation constraints + user boundaries
"""
