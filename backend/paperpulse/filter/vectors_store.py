"""LanceDB-backed paper vector cache.

Schema: paper_id (str, logical PK), text_hash (str), vector (list[float32], 1024).
``get()`` returns the stored record; callers pass the current text_hash to
detect stale entries (abstract edited, etc.) and recompute on mismatch.
"""
from __future__ import annotations

from dataclasses import dataclass

import lancedb  # type: ignore[import-untyped]
import numpy as np
import pyarrow as pa

from paperpulse.paths import data_dir

_TABLE = "paper_vectors"
_SCHEMA = pa.schema(
    [
        pa.field("paper_id", pa.string()),
        pa.field("text_hash", pa.string()),
        pa.field("vector", pa.list_(pa.float32(), 1024)),
    ]
)


@dataclass
class PaperVector:
    paper_id: str
    text_hash: str
    vector: np.ndarray


class PaperVectorStore:
    def __init__(self) -> None:
        self._db = lancedb.connect(str(data_dir() / "papers.lance"))
        if _TABLE not in self._db.table_names():
            self._db.create_table(_TABLE, schema=_SCHEMA)
        self._tbl = self._db.open_table(_TABLE)

    def get(self, paper_id: str) -> PaperVector | None:
        escaped = paper_id.replace("'", "''")
        rows = (
            self._tbl.search()
            .where(f"paper_id = '{escaped}'")
            .limit(1)
            .to_list()
        )
        if not rows:
            return None
        r = rows[0]
        return PaperVector(
            paper_id=str(r["paper_id"]),
            text_hash=str(r["text_hash"]),
            vector=np.asarray(r["vector"], dtype=np.float32),
        )

    def put(self, paper_id: str, text_hash: str, vector: np.ndarray) -> None:
        escaped = paper_id.replace("'", "''")
        self._tbl.delete(f"paper_id = '{escaped}'")
        self._tbl.add(
            [
                {
                    "paper_id": paper_id,
                    "text_hash": text_hash,
                    "vector": vector.astype(np.float32).tolist(),
                }
            ]
        )
