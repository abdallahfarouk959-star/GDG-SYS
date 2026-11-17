# 📊 GDG on Campus Aswan — Attendance Data Architecture & Pipeline

Welcome to the data engineering hub for **Google Developer Groups on Campus — AAST Aswan (GDG Aswan)**. This directory documents the full lifecycle of workshop registration and attendance data: from raw Google Forms exports, through the automated identity resolution and cleaning pipeline, to the verified master dataset and interactive analytics dashboard.

---

## 🗂️ Directory Architecture

```text
data/
├── raw/                      # Unaltered raw files directly exported from forms
│   ├── AI Session Registration  (الردود).xlsx
│   ├── Data Science Session1 Registration  (Responses).xlsx
│   ├── Python Workshop Data Science x AI.xlsx
│   ├── SWE 1 (Responses).xlsx
│   ├── Web development Session 1 Registration (الردود).xlsx
│   ├── Web Development Session 2 (Responses).xlsx
│   ├── Initial_Uncleaned_Master_Attendance.xlsx
│   └── README.md
│
├── scripts/                  # Automated Python pipeline and Jupyter notebooks
│   ├── merge_attendance.py   # Standalone data merger & entity resolution engine
│   ├── Code_fixed.ipynb      # Step-by-step exploratory analysis & verification notebook
│   ├── requirements.txt      # Python dependencies (pandas, openpyxl)
│   └── README.md
│
├── processed/                # Production verified outputs
│   ├── Master_Attendance_final.xlsx  # Cleaned, audited multi-sheet master workbook
│   └── VERIFICATION_REPORT.md       # Complete 10-point audit & validation report
│
├── Master_Attendance_final.xlsx  # Mirrored at data root for direct access
├── VERIFICATION_REPORT.md       # Mirrored at data root for direct access
└── README.md                    # Data architecture overview (this file)
```

---

## 📈 Key Dataset Metrics

- **Unique Real-World Individuals:** **155** participants (100% verified and deduplicated).
- **Total Confirmed Attendances:** **124** session attendances across all 5 technical workshops.
- **Repeat / Loyal Attendees:** **21** participants attended 2 or more workshops.
- **Overall Workshop Show-Up Rate:** **50.4%**.
- **Gender Balance:** **49.7%** Male (77 participants) / **50.3%** Female (78 participants).
- **Academic Cohorts:** Identified from university registration prefix (e.g. `241...` = Cohort 2024, `251...` = Cohort 2025).

---

## 🔬 Multi-Sheet Master Workbook Structure

The output workbook [`Master_Attendance_final.xlsx`](Master_Attendance_final.xlsx) contains 8 structured sheets:

| Sheet Name | Contents |
| :--- | :--- |
| **`Master`** | Primary production table of all 155 participants with consolidated name, university ID, national ID, email, phone, gender, and boolean presence for each of the 5 workshops. |
| **`Attendance conflicts`** | 11 audit records where participants had conflicting registration rows, with owner decision confirmed as attended. |
| **`Evidence`** | Complete audit trail mapping every single raw submission row to its assigned master individual. |
| **`ID conflicts`** | 8 isolated entries with identical email/phone but differing IDs, kept separated to prevent false merges. |
| **`Name review`** | 4 name-only submissions lacking unique identifiers, isolated for manual inspection. |
| **`Name links`** | Records where name variants were linked with high-confidence string similarity (≥ 0.90). |
| **`Possible duplicates`** | 5 flagged potential duplicates for manual oversight. |
| **`Reference only`** | 32 participants from the DS Session 1 reference list who did not attend any technical workshop. |

---

## 🖥️ Interactive Analytics Dashboard

For a complete business intelligence report view (Power BI style layout), visit the [`../dashboard/`](../dashboard/) directory:
- Open [`dashboard/index.html`](../dashboard/index.html) directly in any browser (no server needed).
- Includes interactive KPI cards, chronological timeline, commitment rates, cross-track engagement matrix, gender loyalty charts, and real-time attendee search.
