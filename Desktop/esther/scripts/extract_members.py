"""Extract FIDA member list from the source .docx into a clean CSV.

Output columns match the target Google Sheet schema:
    id, name, designation, phone, email, matric_no, level,
    amount, paid, paid_at, receipt_no, created_at

Existing members only have id/name/designation/phone/email populated;
the remaining columns are left blank and filled in at payment time.
"""
import csv
import re
from docx import Document

SRC = "fida.docx"
OUT = "fida_members.csv"

HEADER = [
    "id", "name", "designation", "phone", "email",
    "matric_no", "level", "amount", "paid", "paid_at",
    "receipt_no", "created_at",
]


def clean_name(s: str) -> str:
    s = s.replace("\u00a0", " ")
    # Strip the stray replacement chars produced by odd encodings in the source doc.
    s = s.replace("\ufffd", "").replace("?", "")
    return re.sub(r"\s+", " ", s).strip()


def clean_phone(s: str) -> str:
    digits = re.sub(r"\D", "", s or "")
    return digits


def clean_email(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", "", s)
    # Flag empties / known-broken sentinels by returning empty string.
    if not s or s == "@gmail.com":
        return ""
    # Looks like "foo gmail.com" (missing @) — leave as-is for manual review but still return.
    return s


def is_valid_email(s: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", s))


def main() -> None:
    doc = Document(SRC)
    rows = []
    seen_header = False
    for table in doc.tables:
        for row in table.rows:
            cells = [c.text for c in row.cells]
            if len(cells) < 5:
                continue
            first = cells[0].strip()
            # Skip the single header row that appears in the first table.
            if not seen_header and first.upper() == "NO":
                seen_header = True
                continue
            name = clean_name(cells[1])
            if not name:
                continue
            id_raw = first.rstrip(".").strip()
            rows.append({
                # Sentinel -1 for rows with blank "NO" — reassigned below.
                "id": int(id_raw) if id_raw.isdigit() else -1,
                "name": name,
                "designation": clean_name(cells[2]) or "Member",
                "phone": clean_phone(cells[3]),
                "email": clean_email(cells[4]),
            })

    # Reassign sequential ids to rows that had a blank "NO" column.
    max_id = max((r["id"] for r in rows if r["id"] > 0), default=0)
    next_id = max_id + 1
    for r in rows:
        if r["id"] == -1:
            r["id"] = next_id
            next_id += 1
    rows.sort(key=lambda r: r["id"])

    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=HEADER)
        w.writeheader()
        for r in rows:
            w.writerow({
                "id": r["id"],
                "name": r["name"],
                "designation": r["designation"],
                "phone": r["phone"],
                "email": r["email"],
                "matric_no": "",
                "level": "",
                "amount": "",
                "paid": "FALSE",
                "paid_at": "",
                "receipt_no": "",
                "created_at": "",
            })

    broken = [r for r in rows if not is_valid_email(r["email"])]
    print(f"Wrote {len(rows)} members to {OUT}")
    print(f"Members with missing/invalid email: {len(broken)}")
    for r in broken:
        print(f"  id={r['id']:>3}  {r['name']:<35}  email={r['email']!r}")


if __name__ == "__main__":
    main()
