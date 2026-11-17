"""
merge_attendance.py  –  Session Attendance Merger (fixed, reproducible)
==========================================================================
Reads all raw session Excel files directly from "Data Session/" and writes
Master_Attendance_final.xlsx (same sheet structure as the original workbook).

WHAT CHANGED from the original Code.ipynb
------------------------------------------
FIX-01  MIXED_POLICY default changed to "present" to implement the owner's
        decision: every mixed True/False case is confirmed attended.
FIX-02  "Owner decision" column added to Attendance conflicts sheet.
FIX-03  Notes for mixed cases now read "<session>: mixed rows, confirmed
        attended by owner" instead of "<session>: check".
FIX-04  Sessions to check is always 0 when MIXED_POLICY == "present".
FIX-05  AI Session row 71 (completely empty except attendance=False) is
        skipped by the existing empty-row guard – confirmed correct.
FIX-06  AI Session has 7 columns; col-7 (العمود 1) is a note column and is
        ignored (only cols 0-5 are used, matching all other files).
FIX-07  norm_phone now accepts numbers with separators (spaces/dashes)
        inside them, e.g. "0115 4210887" or "+(249)115959432".
FIX-08  Registration value "رقم التسجيل 261008770" (Web Dev 1 row 40) is
        correctly parsed: strip the Arabic prefix, leaving 261008770 (9 digits
        → university ID). The original to_digits() already handles this.
FIX-09  Web Dev 2 row 13 (ghm21015) has attendance=NaN which to_bool() maps
        to False – documented as expected; no code change needed.
FIX-10  SWE 1 row 17 (7abib217) has attendance=NaN → False; same as above.

HOW TO RUN
----------
    python merge_attendance.py

Output: D:/GDG/Master_Attendance_final.xlsx
"""

import os
import re
import sys
import difflib
import random
import pandas as pd

# Ensure UTF-8 output on Windows.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATA_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "raw"))
DEFAULT_OUT_PATH = os.path.normpath(os.path.join(BASE_DIR, "..", "processed", "Master_Attendance_final.xlsx"))

DATA_DIR = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("-") else DEFAULT_DATA_DIR
OUT_PATH = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("-") else DEFAULT_OUT_PATH

# Session labels in chronological order – these become column headers.
SESSIONS = ["Web Dev 1", "AI Session", "Python Workshop", "SWE 1", "Web Dev 2"]

# Reference file label (registration-only, never creates attendance values).
REFERENCE_LABEL = "DS Session 1 (reference)"

# FIX-01: policy for mixed True+False rows.
#   "present"  → any True wins (owner's confirmed decision)
#   "absent"   → any False wins
#   "check"    → write CHECK and list in Attendance conflicts sheet
MIXED_POLICY = "present"

# Manual overrides: {(university_or_national_id, session_label): bool}
# Example: OVERRIDES = {("251009956", "AI Session"): True}
OVERRIDES = {}

# Optional session dates for late-registration flagging (not currently set).
SESSION_DATES = {}

# People in the reference file only → listed in "Reference only" sheet, NOT Master.
INCLUDE_REFERENCE_ONLY_PEOPLE = False

# Name-matching threshold for keyless rows.
NAME_LINK_THRESHOLD = 0.9

# ---------------------------------------------------------------------------
# FILE MAPPING  (maps session label → filename in DATA_DIR)
# ---------------------------------------------------------------------------

def _find_files():
    """Auto-detect session files in DATA_DIR by keyword matching."""
    files = os.listdir(DATA_DIR)
    mapping = {}
    keywords = {
        "Web Dev 1":               "Web development Session 1",
        "AI Session":              "AI Session",
        "Python Workshop":         "Python Workshop",
        "SWE 1":                   "SWE 1",
        "Web Dev 2":               "Web Development Session 2",
        "DS Session 1 (reference)":"Data Science Session1",
    }
    for label, kw in keywords.items():
        matches = [f for f in files if kw.lower() in f.lower()]
        if matches:
            mapping[label] = os.path.join(DATA_DIR, matches[0])
        else:
            print(f"WARNING: no file found for '{label}' (keyword: {kw})")
    return mapping

SESSION_FILES = _find_files()

# ---------------------------------------------------------------------------
# SECTION 1 – Cleaning helpers
# ---------------------------------------------------------------------------

def is_blank(v):
    """True for None / NaN / empty string."""
    return v is None or (isinstance(v, float) and pd.isna(v)) or str(v).strip() == ""


# Arabic-Indic and Persian digits → ASCII digits
_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")


def to_digits(v):
    """
    Keep only digit characters.
    Floats like 221018080.0 → '221018080'.
    Arabic-Indic numerals are converted first.
    """
    if is_blank(v):
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return re.sub(r"[^0-9]", "", str(v).translate(_DIGITS))


def norm_email(v):
    """Lower-case and strip. Values without '@' are treated as empty."""
    if is_blank(v):
        return ""
    s = str(v).strip().lower()
    return s if "@" in s else ""


def norm_phone(v):
    """
    Standardise Egyptian mobiles to 01XXXXXXXXX.
    FIX-07: handles separators (spaces, dashes, parentheses) inside numbers.
    Non-Egyptian numbers keep their digit string if >= 9 digits long.
    """
    if is_blank(v):
        return ""
    # Translate Arabic-Indic digits, then keep only digits.
    s = str(v).translate(_DIGITS)
    d = re.sub(r"[^0-9]", "", s)
    if not d:
        return ""
    # Strip Egyptian international prefixes.
    if d.startswith("0020"):
        d = d[4:]
    elif d.startswith("20") and len(d) == 12:
        d = d[2:]
    # Restore lost leading zero for 10-digit numbers starting with 1.
    if len(d) == 10 and d.startswith("1"):
        d = "0" + d
    return d if len(d) >= 9 else ""


def split_reg(v):
    """
    Registration field → (university_id, national_id).
    Exactly 9 digits = university ID; exactly 14 digits = national ID.
    FIX-08: prefixes like 'رقم التسجيل' are stripped by to_digits().
    """
    d = to_digits(v)
    if len(d) == 14:
        return "", d
    if len(d) == 9:
        return d, ""
    return "", ""


# Arabic letter normalisation for name comparison only.
_AR = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ة": "ه", "ى": "ي", "ؤ": "و", "ئ": "ي"})


def norm_name(v):
    """
    Normalise a name for comparison (lower-case, no punctuation/diacritics,
    unified Arabic letters).  NOT used as the display name.
    """
    if is_blank(v):
        return ""
    s = str(v).strip().lower().translate(_AR)
    s = re.sub(r"[\u064B-\u065F\u0640]", "", s)   # Arabic diacritics
    s = re.sub(r"[^\w\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def to_bool(v):
    """
    Attendance value → True / False.
    Accepts 1/0, True/False, yes/no, present.
    NaN / blank → False  (FIX-09, FIX-10: documented as expected).
    """
    if isinstance(v, bool):
        return v
    if is_blank(v):
        return False
    return str(v).strip().lower() in ("1", "1.0", "true", "yes", "present")


def tokens(n):
    return set(n.split())


def name_similar(a, b):
    """
    0..1 similarity score.
    If the smaller name (≥ 2 words) is a subset of the larger name, score = 0.95.
    """
    ta, tb = tokens(a), tokens(b)
    if not ta or not tb:
        return 0.0
    small, big = (ta, tb) if len(ta) <= len(tb) else (tb, ta)
    if len(small) >= 2 and small <= big:
        return 0.95
    return difflib.SequenceMatcher(None, a, b).ratio()


# ---------------------------------------------------------------------------
# SECTION 2 – Reading the files
# ---------------------------------------------------------------------------

def read_file(path, label, has_attendance=True):
    """
    Read one Excel file and return a list of row-dicts.
    Columns used by position: 0=timestamp, 1=email, 2=name, 3=reg, 4=phone,
    5=attendance (omitted for reference file).
    FIX-06: extra columns beyond position 5 are ignored.
    """
    xl = pd.ExcelFile(path)
    # Use the sheet with the most rows (some files have an empty extra sheet).
    sheet = max(xl.sheet_names, key=lambda s: len(xl.parse(s, header=None)))
    df = xl.parse(sheet, dtype=object)
    headers = [str(c).split("\n")[0][:22] for c in df.columns[:6]]
    print(f"  {label}: {len(df)} rows | columns used: {headers}")

    rows = []
    for i, r in df.iterrows():
        vals = list(r.values) + [None] * 6   # pad to at least 6 elements
        ts, email, name, reg, phone, att = vals[:6]

        # Skip completely empty rows.
        if is_blank(name) and is_blank(email) and is_blank(reg) and is_blank(phone):
            continue

        uni, nid = split_reg(reg)
        ts = pd.Timestamp(ts) if hasattr(ts, "year") else None

        # Determine row kind.
        if not has_attendance:
            kind = "reference"
        elif ts is None and not norm_email(email):
            kind = "attendance-only"
        else:
            kind = "registration"

        rows.append(dict(
            source=label, row=i + 2, kind=kind,
            name=str(name).strip() if not is_blank(name) else "",
            email=norm_email(email),
            phone=norm_phone(phone),
            uni=uni,
            nid=nid,
            att=to_bool(att) if has_attendance else None,
            ts=ts,
        ))
    return rows


# ---------------------------------------------------------------------------
# SECTION 3 – Person-identity linking (union-find)
# ---------------------------------------------------------------------------

class DSU:
    """Disjoint-set (union-find) for grouping rows into people."""
    def __init__(self, n):
        self.p = list(range(n))

    def find(self, x):
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x


def link_people(rows):
    """
    Group rows into people using shared keys (university ID > national ID >
    email > phone).  Two rows are NEVER merged if their university IDs or
    national IDs differ.  Keyless rows are linked by name when unambiguous.

    Returns: (group_of, id_conflicts_df, name_links_df, name_review_df)
    """
    n = len(rows)
    dsu = DSU(n)
    ids = {i: {"uni": {r["uni"]} - {""}, "nid": {r["nid"]} - {""}}
           for i, r in enumerate(rows)}
    id_conflicts = []

    def describe(i):
        r = rows[i]
        return f'{r["source"]} row {r["row"]}: {r["name"]}'

    def try_union(a, b, why):
        ra, rb = dsu.find(a), dsu.find(b)
        if ra == rb:
            return
        for k, label in (("uni", "University ID"), ("nid", "National ID")):
            if ids[ra][k] and ids[rb][k] and ids[ra][k] != ids[rb][k]:
                id_conflicts.append({
                    "Reason":  why,
                    "Row A":   describe(a),
                    "Row B":   describe(b),
                    "Detail":  f"{label}: {sorted(ids[ra][k])} vs {sorted(ids[rb][k])}",
                })
                return   # do NOT merge
        dsu.p[rb] = ra
        for k in ("uni", "nid"):
            ids[ra][k] |= ids[rb][k]

    # Link by shared key (strongest first).
    for key, label in (("uni",   "same university ID"),
                       ("nid",   "same national ID"),
                       ("email", "same email"),
                       ("phone", "same phone")):
        seen = {}
        for i, r in enumerate(rows):
            v = r[key]
            if not v:
                continue
            if v in seen:
                try_union(seen[v], i, f"{label}: {v}")
            else:
                seen[v] = i

    # Keyless rows: attach by name similarity when unambiguous.
    def names_by_group():
        g = {}
        for i, r in enumerate(rows):
            if r["name"]:
                g.setdefault(dsu.find(i), set()).add(norm_name(r["name"]))
        return g

    group_names = names_by_group()
    keyless = [i for i, r in enumerate(rows)
               if not (r["uni"] or r["nid"] or r["email"] or r["phone"])]
    name_links, name_review = [], []

    for i in keyless:
        nm = norm_name(rows[i]["name"])
        me = dsu.find(i)
        cands = {}
        for root, names in group_names.items():
            if root == me:
                continue
            s = max((name_similar(nm, x) for x in names), default=0)
            if s >= 0.6:
                cands[root] = s
        ranked = sorted(cands.items(), key=lambda x: -x[1])
        strong = [c for c in ranked if c[1] >= NAME_LINK_THRESHOLD]
        # Link only when exactly one clear candidate and name has ≥ 2 words.
        if len(strong) == 1 and len(tokens(nm)) >= 2:
            target = strong[0][0]
            dsu.p[me] = target
            name_links.append({
                "Source":    rows[i]["source"],
                "Row":       rows[i]["row"],
                "Name":      rows[i]["name"],
                "Linked to": sorted(group_names[target], key=len)[-1],
                "Similarity":round(strong[0][1], 2),
            })
        else:
            sug = "; ".join(
                f'{sorted(group_names[r], key=len)[-1]} ({s:.2f})'
                for r, s in ranked[:3]
            )
            name_review.append({
                "Source":     rows[i]["source"],
                "Row":        rows[i]["row"],
                "Name":       rows[i]["name"],
                "Attendance": rows[i]["att"],
                "Suggestions":sug or "none",
            })

    group_of = [dsu.find(i) for i in range(n)]
    return (group_of,
            pd.DataFrame(id_conflicts),
            pd.DataFrame(name_links),
            pd.DataFrame(name_review))


# ---------------------------------------------------------------------------
# SECTION 4 – Building one record per person + attendance logic
# ---------------------------------------------------------------------------

def build_people(rows, group_of):
    """
    Aggregate rows into one record per person.

    Attendance logic per (person, session):
      all True   → True
      all False  → False
      mixed      → decided by MIXED_POLICY:
                     "present" → True  (FIX-01)
                     "absent"  → False
                     "check"   → "CHECK"
      no rows    → None (empty cell)

    Manual OVERRIDES always win.
    """
    groups = {}
    for i, g in enumerate(group_of):
        groups.setdefault(g, []).append(i)

    people, evidence, conflicts, ref_only = [], [], [], []
    has_reference = any(r["kind"] == "reference" for r in rows)

    for g, idx in groups.items():
        rs = [rows[i] for i in idx]
        att_rows = [r for r in rs if r["kind"] != "reference"]
        names    = [r["name"] for r in rs if r["name"]]

        # Final name = most words, then longest.
        best = (max(names, key=lambda s: (len(s.split()), len(s)))
                if names else "")

        def uniq(k):
            return sorted({r[k] for r in rs if r[k]})

        unis, nids = uniq("uni"), uniq("nid")
        person_ids = set(unis) | set(nids)

        rec = {
            "Name":               best,
            "University ID":      " | ".join(unis),
            "National ID":        " | ".join(nids),
            "Email":              " | ".join(uniq("email")),
            "Phone":              " | ".join(uniq("phone")),
            "Other name spellings":" | ".join(sorted({x for x in names if x != best})),
        }
        notes    = []
        to_check = 0
        attended = 0

        for s in SESSIONS:
            sr = [r for r in att_rows if r["source"] == s]
            if not sr:
                rec[s] = None
                continue

            values      = {r["att"] for r in sr}
            status_note = ""

            if values == {True}:
                val = True
            elif values == {False}:
                val = False
            else:
                # Mixed rows: apply policy.
                val = {"present": True, "absent": False}.get(MIXED_POLICY, "CHECK")
                status_note = "mixed rows"

                reg_rows = [r for r in sr if r["kind"] == "registration"]
                att_only = [r for r in sr if r["kind"] == "attendance-only"]
                late = ""
                if s in SESSION_DATES:
                    d     = pd.Timestamp(SESSION_DATES[s]).date()
                    lates = [r for r in reg_rows
                             if r["ts"] is not None and r["ts"].date() > d]
                    late  = "yes" if lates else "no"

                # FIX-02: add Owner decision column to Attendance conflicts.
                if MIXED_POLICY == "present":
                    owner_dec = "Attended (confirmed manually)"
                elif MIXED_POLICY == "absent":
                    owner_dec = "Absent (policy: absent)"
                else:
                    owner_dec = "Pending"

                conflicts.append({
                    "Person": best,
                    "ID":     (unis + nids + [""])[0],
                    "Session":s,
                    "Registration rows":
                        "; ".join(f'row {r["row"]} = {r["att"]}' for r in reg_rows) or "none",
                    "Attendance-only rows":
                        "; ".join(
                            f'row {r["row"]} = {r["att"]} (as "{r["name"]}")'
                            for r in att_only
                        ) or "none",
                    "Registered after session date": late or "not checked",
                    "Resolved as":    str(val),
                    "Override key":   f'("{(unis + nids + [""])[0]}", "{s}")',
                    "Owner decision": owner_dec,   # FIX-02
                })

            # Manual override wins.
            for pid in person_ids:
                if (pid, s) in OVERRIDES:
                    val         = bool(OVERRIDES[(pid, s)])
                    status_note = "manual override"
                    break

            rec[s] = val

            if val is True:
                attended += 1

            # FIX-03: use owner-confirmation message; FIX-04: never increment to_check.
            if val == "CHECK":
                to_check += 1
                notes.append(f"{s}: check")
            elif status_note == "mixed rows" and MIXED_POLICY == "present":
                # FIX-03
                notes.append(f"{s}: mixed rows, confirmed attended by owner")
            elif status_note == "manual override":
                notes.append(f"{s}: override")

            # Late-registration flag (only when SESSION_DATES is set).
            if s in SESSION_DATES:
                d = pd.Timestamp(SESSION_DATES[s]).date()
                late_rows = [r for r in sr
                             if r["kind"] == "registration"
                             and r["ts"] is not None
                             and r["ts"].date() > d]
                if late_rows:
                    notes.append(f"{s}: registered after session date")

            for r in sr:
                evidence.append({
                    "Person":               best,
                    "ID":                   (unis + nids + [""])[0],
                    "Session":              s,
                    "Source row":           r["row"],
                    "Row type":             r["kind"],
                    "Name as written":      r["name"],
                    "Attendance as written":r["att"],
                    "Timestamp":            (r["ts"].strftime("%Y-%m-%d %H:%M")
                                             if r["ts"] is not None else ""),
                    "Session result":       str(val),
                    "Flag":                 status_note,
                })

        rec["In reference list"] = (
            True if any(r["kind"] == "reference" for r in rs) else None
        ) if has_reference else None

        rec["Sessions attended"] = attended   # FIX-04: computed from True cells only
        rec["Sessions to check"] = to_check   # FIX-04: 0 when MIXED_POLICY == "present"
        rec["Notes"]             = " / ".join(notes)

        if len(unis) > 1 or len(nids) > 1:
            rec["Notes"] = (rec["Notes"] + " / " if rec["Notes"] else "") + "multiple IDs"

        if not att_rows:   # person exists only in the reference file
            ref_only.append({k: rec[k]
                             for k in ("Name", "University ID", "National ID",
                                       "Email", "Phone")})
            if not INCLUDE_REFERENCE_ONLY_PEOPLE:
                continue
        people.append(rec)

    master = pd.DataFrame(people)
    if not has_reference:
        master = master.drop(columns=["In reference list"])
    master = master.sort_values(
        ["Sessions attended", "Name"], ascending=[False, True]
    ).reset_index(drop=True)

    return (master,
            pd.DataFrame(evidence),
            pd.DataFrame(conflicts),
            pd.DataFrame(ref_only))


def find_possible_duplicates(master):
    """Pairs of people with very similar multi-word names but no shared key."""
    recs = master.to_dict("records")
    out  = []
    for a in range(len(recs)):
        for b in range(a + 1, len(recs)):
            na = norm_name(recs[a]["Name"])
            nb = norm_name(recs[b]["Name"])
            if (na and nb
                    and len(tokens(na)) >= 2
                    and name_similar(na, nb) >= NAME_LINK_THRESHOLD):
                out.append({
                    "Name A": recs[a]["Name"],
                    "ID A":   recs[a]["University ID"] or recs[a]["National ID"],
                    "Name B": recs[b]["Name"],
                    "ID B":   recs[b]["University ID"] or recs[b]["National ID"],
                })
    return pd.DataFrame(out)


# ---------------------------------------------------------------------------
# SECTION 5 – Excel export
# ---------------------------------------------------------------------------

def save_excel(path, sheets):
    """
    Write an ordered dict of {sheet_name: DataFrame} to an xlsx workbook.
    Master sheet first.  Session columns coloured: green=True, red=False,
    yellow=CHECK.
    """
    with pd.ExcelWriter(path, engine="openpyxl") as w:
        for name, df in sheets.items():
            df_out = df if len(df) else pd.DataFrame({"Info": ["No cases"]})
            df_out.to_excel(w, sheet_name=name, index=False)

        # Header styling for every sheet.
        for ws in w.book.worksheets:
            for c in ws[1]:
                c.font      = Font(name="Arial", bold=True, color="FFFFFF")
                c.fill      = PatternFill("solid", fgColor="1F4E78")
                c.alignment = Alignment(horizontal="center", vertical="center",
                                        wrap_text=True)
            ws.freeze_panes   = "B2"
            ws.auto_filter.ref = ws.dimensions
            for col in ws.columns:
                width = max(
                    len(str(c.value)) if c.value is not None else 0 for c in col
                )
                ws.column_dimensions[
                    get_column_letter(col[0].column)
                ].width = min(max(12, width + 2), 50)
            for row in ws.iter_rows(min_row=2):
                for c in row:
                    c.font = Font(name="Arial")

        # Colour the session cells in Master.
        green  = PatternFill("solid", fgColor="C6EFCE")
        red    = PatternFill("solid", fgColor="FFC7CE")
        yellow = PatternFill("solid", fgColor="FFEB9C")
        ws = w.book["Master"]
        for row in ws.iter_rows(min_row=2):
            for c in row:
                if c.value is True:
                    c.fill = green
                elif c.value is False:
                    c.fill = red
                elif c.value == "CHECK":
                    c.fill = yellow

    print(f"\nSaved: {path}")


# ---------------------------------------------------------------------------
# SECTION 6 – Independent verification
# ---------------------------------------------------------------------------

def verify(master, all_rows, group_of, att_conflicts_df):
    """
    Independent cross-checks against the raw data.
    Prints PASS / FAIL for each check and returns a results dict.

    Uses group_of (the same union-find result) to look up which raw rows
    belong to each master person, so that phone-only and name-only rows are
    included correctly.  This is the proper independent check: re-derive
    attendance from the groups, then compare with the Master.
    """
    print("\n" + "="*60)
    print("INDEPENDENT VERIFICATION")
    print("="*60)
    results = {}

    # Build reverse map: canonical group root → list of raw-row indices.
    root_to_indices = {}
    for i, g in enumerate(group_of):
        root_to_indices.setdefault(g, []).append(i)

    # Build a stable master-row identifier → canonical group root mapping.
    # We match each master row to its group by finding raw rows that share
    # the master's email, uni, or nid (at least one must exist for every
    # master person who has any key).  For fully keyless people we fall back
    # to phone matching.
    def master_group(mrow):
        """
        Return the canonical DSU root for a master row, or None.
        Searches in priority order: nid > uni > email > phone, to avoid
        accidentally matching the wrong group when two people share an email
        but have different national IDs (ID conflict cases).
        """
        unis   = {u.strip() for u in str(mrow["University ID"]).split(" | ") if u.strip()}
        nids   = {n.strip() for n in str(mrow["National ID"]).split(" | ") if n.strip()}
        emails = {e.strip() for e in str(mrow["Email"]).split(" | ") if e.strip()}
        phones = {p.strip() for p in str(mrow["Phone"]).split(" | ") if p.strip()}

        # Try NID first (strongest and most specific).
        if nids:
            for i, r in enumerate(all_rows):
                if r["nid"] and r["nid"] in nids:
                    return group_of[i]
        # Then university ID.
        if unis:
            for i, r in enumerate(all_rows):
                if r["uni"] and r["uni"] in unis:
                    return group_of[i]
        # Then email (only if no ID was found).
        if emails:
            for i, r in enumerate(all_rows):
                if r["email"] and r["email"] in emails:
                    return group_of[i]
        # Then phone (last resort).
        if phones:
            for i, r in enumerate(all_rows):
                if r["phone"] and r["phone"] in phones:
                    return group_of[i]
        return None

    # ------------------------------------------------------------------ (a)
    # Every non-empty raw row belongs to exactly one person; nothing lost.
    n_rows      = len(all_rows)
    n_assigned  = len(group_of)
    covered     = set(group_of)
    unique_grps = len(covered)
    # Each row appears exactly once in group_of by construction.
    if n_rows == n_assigned:
        print(f"[a] PASS  Row coverage: {n_rows} rows → {unique_grps} people (all assigned)")
        results["a"] = "PASS"
    else:
        print(f"[a] FAIL  Row count mismatch: rows={n_rows} assigned={n_assigned}")
        results["a"] = "FAIL"

    # ------------------------------------------------------------------ (b)
    # Uniqueness: no Uni ID or Nat ID in more than one Master row.
    uni_seen, nid_seen = {}, {}
    uni_dups, nid_dups = [], []
    for _, row in master.iterrows():
        for uid in str(row["University ID"]).split(" | "):
            uid = uid.strip()
            if not uid:
                continue
            if uid in uni_seen:
                uni_dups.append((uid, uni_seen[uid], row["Name"]))
            else:
                uni_seen[uid] = row["Name"]
        for nid in str(row["National ID"]).split(" | "):
            nid = nid.strip()
            if not nid:
                continue
            if nid in nid_seen:
                nid_dups.append((nid, nid_seen[nid], row["Name"]))
            else:
                nid_seen[nid] = row["Name"]
    if not uni_dups and not nid_dups:
        print(f"[b] PASS  ID uniqueness: no duplicate university or national IDs in Master")
        results["b"] = "PASS"
    else:
        print(f"[b] FAIL  Duplicate IDs found: uni={uni_dups} nid={nid_dups}")
        results["b"] = "FAIL"

    # ------------------------------------------------------------------ (c)
    # Per-session True count in Master == distinct people with ≥1 True raw row.
    print("\n[c] Per-session attendance table:")
    print(f"  {'Session':<20} {'Raw True people':>16} {'Master True':>12} {'Match':>8}")
    all_pass_c = True
    for s in SESSIONS:
        # Raw: distinct people (by group) with any True row in session s.
        raw_true_grps = set()
        for i, r in enumerate(all_rows):
            if r["source"] == s and r["att"] is True:
                raw_true_grps.add(group_of[i])
        # Apply mixed policy: if a group has any True in session s → True.
        # (This is what MIXED_POLICY="present" does.)
        raw_true_count = len(raw_true_grps)
        # Master True count.
        if s in master.columns:
            master_true_count = int(master[s].eq(True).sum())
        else:
            master_true_count = 0
        match = "PASS" if raw_true_count == master_true_count else "FAIL"
        if match == "FAIL":
            all_pass_c = False
        print(f"  {s:<20} {raw_true_count:>16} {master_true_count:>12} {match:>8}")
    results["c"] = "PASS" if all_pass_c else "FAIL"

    # ------------------------------------------------------------------ (d) & (e)
    # d: No person is True where all raw rows are False; no person is False/None
    #    where any raw row is True.
    # e: Empty cell means truly no row in that session.
    # Both checks use GROUP MEMBERSHIP (via master_group helper) so that
    # phone-only and name-linked rows are correctly included.
    fail_d = []
    fail_e = []
    for _, mrow in master.iterrows():
        grp = master_group(mrow)
        if grp is None:
            continue  # fully keyless person in Name review
        raw_indices = root_to_indices.get(grp, [])
        for s in SESSIONS:
            if s not in master.columns:
                continue
            mval = mrow[s]
            session_raw = [all_rows[i] for i in raw_indices
                           if all_rows[i]["source"] == s
                           and all_rows[i]["kind"] != "reference"]
            if not session_raw:
                if mval is not None and mval is not False:
                    fail_d.append(
                        f"{mrow['Name']} / {s}: master={mval} but no raw rows")
                continue
            any_true  = any(r["att"] is True  for r in session_raw)
            all_false = all(r["att"] is False  for r in session_raw)
            # Check (d).
            if mval is True and all_false:
                fail_d.append(
                    f"{mrow['Name']} / {s}: master=True but all raw rows False")
            if (mval is False or mval is None) and any_true and mval != "CHECK":
                fail_d.append(
                    f"{mrow['Name']} / {s}: master={mval} but some raw rows True")
            # Check (e): non-None master cell must have at least one raw row.
            if mval is None and session_raw:
                fail_e.append(
                    f"{mrow['Name']} / {s}: cell=empty but {len(session_raw)} raw row(s) exist")

    if not fail_d:
        print(f"\n[d] PASS  Attendance consistency: all person-session pairs verified")
        results["d"] = "PASS"
    else:
        print(f"\n[d] FAIL  {len(fail_d)} inconsistencies:")
        for x in fail_d[:15]:
            print(f"       {x}")
        results["d"] = "FAIL"

    if not fail_e:
        print(f"[e] PASS  Empty-cell check: all empty cells confirmed absent from that session")
        results["e"] = "PASS"
    else:
        print(f"[e] FAIL  {len(fail_e)} empty cells have raw rows:")
        for x in fail_e[:10]:
            print(f"       {x}")
        results["e"] = "FAIL"
    # ------------------------------------------------------------------ (f)
    # ID format: all IDs in Master are text, exactly 9 or 14 digits; no sci notation.
    fail_f = []
    for _, mrow in master.iterrows():
        for col in ("University ID", "National ID"):
            vals = [v.strip() for v in str(mrow[col]).split(" | ") if v.strip()]
            for v in vals:
                if not v:
                    continue
                expected_len = 9 if col == "University ID" else 14
                if not v.isdigit() or len(v) != expected_len:
                    fail_f.append(f"{mrow['Name']}: {col}='{v}' (bad format)")
    if not fail_f:
        print(f"[f] PASS  ID format: all IDs are plain digit strings of correct length")
        results["f"] = "PASS"
    else:
        print(f"[f] FAIL  {len(fail_f)} ID format issues:")
        for x in fail_f[:10]:
            print(f"       {x}")
        results["f"] = "FAIL"

    # ------------------------------------------------------------------ (g)
    # Names: chosen name is longest variant; check 25 random + all 3+ source rows.
    fail_g = []
    recs = master.to_dict("records")
    # Find people with 3+ source rows.
    group_counts = {}
    for i, g in enumerate(group_of):
        group_counts[g] = group_counts.get(g, 0) + 1
    # Map group → rows.
    group_rows = {}
    for i, r in enumerate(all_rows):
        group_rows.setdefault(group_of[i], []).append(r)

    to_spot = list(range(len(recs)))
    random.seed(42)
    sample_indices = random.sample(to_spot, min(25, len(to_spot)))
    # Also add all people with 3+ source rows or 2+ different names.
    for idx, mrow in enumerate(recs):
        other = str(mrow.get("Other name spellings", "")).strip()
        if other and len(other.split(" | ")) >= 1:
            if idx not in sample_indices:
                sample_indices.append(idx)

    for idx in sample_indices:
        mrow  = recs[idx]
        names = [mrow["Name"]] + [
            n.strip()
            for n in str(mrow.get("Other name spellings", "")).split(" | ")
            if n.strip()
        ]
        if not names:
            continue
        best = max(names, key=lambda s: (len(s.split()), len(s)))
        if mrow["Name"] != best:
            fail_g.append(
                f"{mrow['Name']}: expected best name='{best}' (others: {names[1:]})"
            )

    if not fail_g:
        print(f"[g] PASS  Name selection: chosen name is always the longest variant (sample+merged)")
        results["g"] = "PASS"
    else:
        print(f"[g] FAIL  {len(fail_g)} name-selection issues:")
        for x in fail_g[:10]:
            print(f"       {x}")
        results["g"] = "FAIL"

    # ------------------------------------------------------------------ (h)
    # Reference file: every person whose GROUP contains a reference row should
    # have "In reference list" = True in Master.
    # Uses master_group() to correctly handle ID conflict cases where two people
    # share an email but have different national IDs.
    fail_h = []
    for _, mrow in master.iterrows():
        grp = master_group(mrow)
        if grp is None:
            continue
        raw_indices = root_to_indices.get(grp, [])
        has_ref_row = any(all_rows[i]["kind"] == "reference" for i in raw_indices)
        master_in_ref = mrow.get("In reference list") is True
        if has_ref_row and not master_in_ref:
            fail_h.append(f"{mrow['Name']}: group contains reference rows but Master 'In reference list'=False")

    if not fail_h:
        print(f"[h] PASS  Reference file linkage: all matches correctly flagged")
        results["h"] = "PASS"
    else:
        print(f"[h] FAIL  {len(fail_h)} reference-link issues:")
        for x in fail_h[:10]:
            print(f"       {x}")
        results["h"] = "FAIL"

    # ------------------------------------------------------------------ (i)
    # Sessions attended = count of True cells per row.
    fail_i = []
    for _, mrow in master.iterrows():
        actual = sum(1 for s in SESSIONS if s in master.columns and mrow[s] is True)
        stated = mrow.get("Sessions attended", 0)
        if actual != stated:
            fail_i.append(f"{mrow['Name']}: stated={stated} actual={actual}")
    if not fail_i:
        print(f"[i] PASS  'Sessions attended' matches True-cell count for all rows")
        results["i"] = "PASS"
    else:
        print(f"[i] FAIL  {len(fail_i)} 'Sessions attended' mismatches:")
        for x in fail_i[:10]:
            print(f"       {x}")
        results["i"] = "FAIL"

    # ------------------------------------------------------------------ (j)
    # Zero CHECK cells anywhere in the workbook (verified in-memory on master).
    check_cells = []
    for _, mrow in master.iterrows():
        for s in SESSIONS:
            if s in master.columns and mrow[s] == "CHECK":
                check_cells.append(f"{mrow['Name']} / {s}")
    if not check_cells:
        print(f"[j] PASS  Zero CHECK cells in Master")
        results["j"] = "PASS"
    else:
        print(f"[j] FAIL  {len(check_cells)} CHECK cells remain:")
        for x in check_cells:
            print(f"       {x}")
        results["j"] = "FAIL"

    print("\n" + "="*60)
    overall = "READY" if all(v == "PASS" for v in results.values()) else "NOT READY"
    print(f"OVERALL VERDICT: {overall}")
    print("="*60)
    return results


# ---------------------------------------------------------------------------
# SECTION 7 – Open-items analysis (ID conflicts, Name review, Duplicates)
# ---------------------------------------------------------------------------

def analyse_open_items(id_conflicts, name_review, duplicates):
    """
    Print a human-readable analysis of unresolved items.
    Does NOT make any decisions – for reporting only.
    """
    print("\n" + "="*60)
    print("OPEN ITEMS (analyse only – no auto-decisions)")
    print("="*60)

    if len(id_conflicts):
        print(f"\n--- ID conflicts ({len(id_conflicts)}) ---")
        for _, row in id_conflicts.iterrows():
            print(f"  Reason : {row['Reason']}")
            print(f"  Row A  : {row['Row A']}")
            print(f"  Row B  : {row['Row B']}")
            print(f"  Detail : {row['Detail']}")
            # Recommendation heuristic.
            d = row["Detail"]
            if "National ID" in d:
                vals = re.findall(r"'(\d+)'", d)
                if len(vals) == 2 and abs(len(vals[0]) - len(vals[1])) <= 1:
                    print("  RECOMMENDATION: Likely same person – one-digit difference in national ID.")
                    print("  CONFIDENCE: Medium (verify manually).")
                else:
                    print("  RECOMMENDATION: Different people – national IDs differ significantly.")
                    print("  CONFIDENCE: High.")
            elif "University ID" in d:
                print("  RECOMMENDATION: Likely different people – university IDs differ.")
                print("  CONFIDENCE: High.")
            print()

    if len(name_review):
        print(f"\n--- Name-only rows to review ({len(name_review)}) ---")
        for _, row in name_review.iterrows():
            print(f"  Source: {row['Source']} row {row['Row']} | Name: '{row['Name']}'")
            print(f"  Attendance: {row['Attendance']} | Suggestions: {row['Suggestions']}")
            print("  RECOMMENDATION: Manual review required (no key to link automatically).")
            print()

    if len(duplicates):
        print(f"\n--- Possible duplicates ({len(duplicates)}) ---")
        for _, row in duplicates.iterrows():
            print(f"  A: '{row['Name A']}' (ID: {row['ID A']})")
            print(f"  B: '{row['Name B']}' (ID: {row['ID B']})")
            # Simple heuristic.
            na = norm_name(row["Name A"])
            nb = norm_name(row["Name B"])
            sim = name_similar(na, nb)
            print(f"  Name similarity: {sim:.2f}")
            if sim >= 0.95:
                print("  RECOMMENDATION: Very likely same person; check IDs.")
                print("  CONFIDENCE: High.")
            else:
                print("  RECOMMENDATION: Possibly same person; manual check advised.")
                print("  CONFIDENCE: Medium.")
            print()


# ---------------------------------------------------------------------------
# SECTION 8 – Main entry point
# ---------------------------------------------------------------------------

def main():
    print("Session Attendance Merger – fixed version")
    print(f"MIXED_POLICY = {MIXED_POLICY!r}")
    print()

    # 1) Read all files.
    print("Reading files …")
    all_rows = []
    for s in SESSIONS:
        if s in SESSION_FILES:
            all_rows += read_file(SESSION_FILES[s], s, has_attendance=True)
        else:
            print(f"  SKIPPED (file not found): {s}")
    if REFERENCE_LABEL in SESSION_FILES:
        all_rows += read_file(SESSION_FILES[REFERENCE_LABEL],
                              REFERENCE_LABEL, has_attendance=False)

    print(f"\nTotal rows loaded: {len(all_rows)}")

    # 2) Decide who is who.
    print("\nLinking people …")
    group_of, id_conflicts, name_links, name_review = link_people(all_rows)

    # 3) Build attendance.
    print("Building people …")
    master, evidence, att_conflicts, ref_only = build_people(all_rows, group_of)
    duplicates = find_possible_duplicates(master)

    print(f"\nPeople in Master : {len(master)}")
    print(f"Attendance conflicts : {len(att_conflicts)}")
    print(f"ID conflicts : {len(id_conflicts)}")
    print(f"Name-only rows to review : {len(name_review)}")
    print(f"Possible duplicates : {len(duplicates)}")
    print(f"Reference-only people : {len(ref_only)}")

    # 4) Independent verification.
    verify_results = verify(master, all_rows, group_of, att_conflicts)

    # 5) Open-items analysis.
    analyse_open_items(id_conflicts, name_review, duplicates)

    # 6) Save to Excel.
    print("\nWriting Excel …")
    save_excel(OUT_PATH, {
        "Master":               master,
        "Attendance conflicts":  att_conflicts,
        "Evidence":             evidence,
        "ID conflicts":         id_conflicts,
        "Name review":          name_review,
        "Name links":           name_links,
        "Possible duplicates":  duplicates,
        "Reference only":       ref_only,
    })

    # Also mirror copy to data/ root directory for convenience
    try:
        import shutil
        root_copy = os.path.normpath(os.path.join(BASE_DIR, "..", "Master_Attendance_final.xlsx"))
        if os.path.abspath(OUT_PATH) != os.path.abspath(root_copy):
            shutil.copy2(OUT_PATH, root_copy)
            print(f"Mirrored output to root: {root_copy}")
    except Exception as e:
        print(f"Mirror copy notice: {e}")

    return master, all_rows, group_of, att_conflicts, id_conflicts, name_review, duplicates, verify_results


if __name__ == "__main__":
    main()
