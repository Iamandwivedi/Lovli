"""Tiny in-memory async Mongo stub for the memory-engine suites.

Supports exactly what engine/* and the memory endpoints use: find/sort/limit/
to_list, find_one, insert_one/insert_many, update_one, replace_one,
delete_one/delete_many, count_documents, distinct, aggregate ($group count).
"""
from __future__ import annotations

import copy
import types


def _matches(doc: dict, query: dict) -> bool:
    for key, cond in (query or {}).items():
        if key == "$or":
            if not any(_matches(doc, sub) for sub in cond):
                return False
            continue
        if key == "$and":
            if not all(_matches(doc, sub) for sub in cond):
                return False
            continue
        if key == "$nor":
            if any(_matches(doc, sub) for sub in cond):
                return False
            continue
        val = doc.get(key)
        if isinstance(cond, dict):
            if "$ne" in cond and val == cond["$ne"]:
                return False
            if "$in" in cond and val not in cond["$in"]:
                return False
            if "$exists" in cond and (val is not None) != bool(cond["$exists"]):
                return False
        elif val != cond:
            return False
    return True


def _project(doc: dict, projection: dict | None) -> dict:
    out = {k: v for k, v in doc.items() if k != "_id"}
    if projection:
        includes = [k for k, v in projection.items() if v == 1 and k != "_id"]
        excludes = [k for k, v in projection.items() if v == 0 and k != "_id"]
        if includes:
            out = {k: v for k, v in out.items() if k in includes}
        elif excludes:
            out = {k: v for k, v in out.items() if k not in excludes}
    return copy.deepcopy(out)


class _Cursor:
    def __init__(self, docs: list[dict], projection: dict | None):
        self._docs = docs
        self._projection = projection

    def sort(self, key, direction=1):
        if isinstance(key, list):
            for k, d in reversed(key):
                self._docs.sort(key=lambda x: x.get(k) or 0, reverse=d == -1)
        else:
            self._docs.sort(key=lambda x: x.get(key) or 0, reverse=direction == -1)
        return self

    def limit(self, n: int):
        self._docs = self._docs[:n]
        return self

    def skip(self, n: int):
        self._docs = self._docs[n:]
        return self

    async def to_list(self, length=None):
        docs = [_project(d, self._projection) for d in self._docs]
        return docs if length is None else docs[:length]

    def __aiter__(self):
        self._iter = iter([_project(d, self._projection) for d in self._docs])
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration


class MemCol:
    def __init__(self):
        self.docs: list[dict] = []

    def find(self, query=None, projection=None):
        return _Cursor([d for d in self.docs if _matches(d, query or {})], projection)

    async def find_one(self, query, projection=None):
        for d in self.docs:
            if _matches(d, query):
                return _project(d, projection)
        return None

    async def insert_one(self, doc):
        self.docs.append(copy.deepcopy(doc))
        return types.SimpleNamespace(inserted_id="x")

    async def insert_many(self, docs):
        self.docs.extend(copy.deepcopy(d) for d in docs)
        return types.SimpleNamespace(inserted_ids=["x"] * len(docs))

    async def update_one(self, query, update, upsert=False):
        for d in self.docs:
            if _matches(d, query):
                for k, v in update.get("$set", {}).items():
                    d[k] = copy.deepcopy(v)
                for k, v in update.get("$inc", {}).items():
                    d[k] = d.get(k, 0) + v
                for k, v in update.get("$push", {}).items():
                    d.setdefault(k, []).append(copy.deepcopy(v))
                return types.SimpleNamespace(matched_count=1, modified_count=1)
        if upsert:
            doc = {k: v for k, v in query.items() if not k.startswith("$")}
            doc.update(copy.deepcopy(update.get("$set", {})))
            doc.update(copy.deepcopy(update.get("$setOnInsert", {})))
            for k, v in update.get("$push", {}).items():
                doc.setdefault(k, []).append(copy.deepcopy(v))
            self.docs.append(doc)
            return types.SimpleNamespace(matched_count=0, modified_count=0)
        return types.SimpleNamespace(matched_count=0, modified_count=0)

    async def update_many(self, query, update, upsert=False):
        n = 0
        for d in self.docs:
            if _matches(d, query):
                for k, v in update.get("$set", {}).items():
                    d[k] = copy.deepcopy(v)
                n += 1
        return types.SimpleNamespace(matched_count=n, modified_count=n)

    async def replace_one(self, query, doc, upsert=False):
        for i, d in enumerate(self.docs):
            if _matches(d, query):
                self.docs[i] = copy.deepcopy(doc)
                return types.SimpleNamespace(matched_count=1, modified_count=1)
        if upsert:
            self.docs.append(copy.deepcopy(doc))
        return types.SimpleNamespace(matched_count=0, modified_count=0)

    async def delete_one(self, query):
        for i, d in enumerate(self.docs):
            if _matches(d, query):
                del self.docs[i]
                return types.SimpleNamespace(deleted_count=1)
        return types.SimpleNamespace(deleted_count=0)

    async def delete_many(self, query):
        keep = [d for d in self.docs if not _matches(d, query)]
        n = len(self.docs) - len(keep)
        self.docs = keep
        return types.SimpleNamespace(deleted_count=n)

    async def count_documents(self, query=None):
        return len([d for d in self.docs if _matches(d, query or {})])

    async def distinct(self, key):
        return sorted({d.get(key) for d in self.docs if d.get(key) is not None})

    def aggregate(self, pipeline):
        group = next((p["$group"] for p in pipeline if "$group" in p), None)
        rows = []
        if group and str(group.get("_id", "")).startswith("$"):
            field = group["_id"][1:]
            counts: dict = {}
            for d in self.docs:
                counts[d.get(field)] = counts.get(d.get(field), 0) + 1
            rows = [{"_id": k, "n": v} for k, v in counts.items()]
        return _Cursor(rows, None)


class MemDb:
    """Collections spring into existence on first access, like Mongo's."""

    def __init__(self):
        self._cols: dict[str, MemCol] = {}

    def __getattr__(self, name: str) -> MemCol:
        if name.startswith("__"):
            raise AttributeError(name)
        cols = self.__dict__.setdefault("_cols", {})
        if name not in cols:
            cols[name] = MemCol()
        return cols[name]

    def __getitem__(self, name: str) -> MemCol:
        return getattr(self, name)
