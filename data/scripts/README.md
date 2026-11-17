# ⚙️ Data Cleaning & Consolidation Pipeline

This directory contains the automated data engineering scripts and exploratory analysis notebooks used to ingest, clean, resolve identities, and consolidate multi-session workshop attendance for **Google Developer Groups on Campus — AAST Aswan**.

---

## 📁 Directory Contents

| File | Description |
| :--- | :--- |
| **`merge_attendance.py`** | Standalone production Python script that executes the complete automated data pipeline: raw Excel ingestion, entity resolution (Disjoint-Set Union), phone/ID normalisation, conflict auditing, and formatted Excel generation. |
| **`Code_fixed.ipynb`** | Jupyter / Google Colab Notebook containing interactive exploratory data analysis, step-by-step entity resolution walkthrough, and verification checks. |
| **`requirements.txt`** | Python environment dependencies (`pandas`, `openpyxl`). |

---

## 🛠️ Pipeline Architecture & Algorithms

1. **Schema Ingestion & Normalisation**:
   - Ingests all 6 raw session files from `../raw/` using structural position-based indexing (Timestamp, Email, Name, ID, Phone, Attendance).
   - Strips non-standard prefixes (e.g. Arabic registration prefixes like `"رقم التسجيل"`).
   - Cleans Egyptian national numbers and international mobile numbers into standard E.164-compatible digit strings.
2. **Disjoint-Set Union (DSU) Identity Resolution**:
   - Links records across sessions using a strict priority hierarchy:
     - 🎓 **University Student ID** (9 digits) — Primary key.
     - 🆔 **National ID** (14 digits) — Strict secondary key.
     - 📧 **Normalised Email** (lowercase, trimmed).
     - 📱 **Normalised Mobile Number** (11 digits).
   - Strict safety rule: Direct collisions between different University or National IDs are never merged automatically; they are isolated in the `ID conflicts` audit sheet.
3. **Attendance Conflict Resolution (`MIXED_POLICY = "present"`)**:
   - When a participant has multiple submissions for the same session with conflicting flags (`True` vs `False`), manual verification confirmed physical presence, marking them as attended (`True`).
   - All 11 conflicting cases are preserved with audit notes in the `Attendance conflicts` sheet.
4. **Independent 10-Point Verification**:
   - Automated post-merge verification suite verifying row coverage, ID uniqueness, per-session counts, and zero unresolved states.

---

## 🚀 How to Run the Pipeline

### Prerequisites
Install Python 3.10+ and dependencies:
```bash
pip install -r requirements.txt
```

### Execution
Run the standalone pipeline script:
```bash
python merge_attendance.py
```

Optional custom paths:
```bash
python merge_attendance.py [path_to_raw_dir] [path_to_output_file]
```

### Output
Generates the verified master Excel workbook at:
- `../processed/Master_Attendance_final.xlsx`
- Mirrored to `../Master_Attendance_final.xlsx`
