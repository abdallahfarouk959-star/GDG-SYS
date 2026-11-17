# 📥 Raw Attendance & Registration Data

This folder contains the original, unaltered registration and attendance exports collected from Google Forms and on-site check-in sheets during the technical workshops of **GDG on Campus AAST Aswan**.

---

## 📂 Raw Files Inventory

| Raw File | Event / Workshop | Raw Rows | Attendance True | Attendance False | Notes |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`Web development Session 1 Registration (الردود).xlsx`** | Web Development 1 | 63 | 26 | 37 | Initial track kick-off |
| **`AI Session Registration  (الردود).xlsx`** | AI Session | 70 | 43 | 26 | Contains 1 empty row (Row 71) correctly ignored by pipeline |
| **`Python Workshop Data Science x AI.xlsx`** | Python Workshop | 45 | 24 | 21 | Joint Data Science & AI session |
| **`SWE 1 (Responses).xlsx`** | Software Engineering 1 | 45 | 19 | 26 | Foundation workshop |
| **`Web Development Session 2 (Responses).xlsx`** | Web Development 2 | 24 | 12 | 12 | Follow-up project session |
| **`Data Science Session1 Registration  (Responses).xlsx`** | DS Session 1 (Reference) | 74 | N/A | N/A | Reference list (registration only; no attendance tracked) |
| **`Initial_Uncleaned_Master_Attendance.xlsx`** | Legacy Uncleaned Master | 320 | — | — | Initial manual consolidation containing unresolved conflicts |

---

## ⚠️ Known Raw Data Quality Anomalies (Resolved in Pipeline)
1. **AI Session Row 70:** Participant entered an accidental 15-digit number (`307072728001563`). Successfully linked via email and phone to verified 14-digit National ID (`30707272800163`).
2. **AI Session Row 71:** Entire row is blank with no timestamp, name, or email. Correctly filtered out by pipeline.
3. **Registration Prefix:** Some entries contained text prefix `"رقم التسجيل 261008770"`. Stripped by pipeline to isolate the 9-digit University Student ID.
4. **Phone Formatting:** Inconsistent use of country codes (`+20`, `002`), internal spaces (`0115 4210887`), and dashes. Standardised to clean numeric strings.
