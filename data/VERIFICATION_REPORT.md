# Comprehensive Data Quality Audit & Verification Report

**Project:** GDG Attendance Consolidation & Deduplication Pipeline  
**Auditor:** Data Quality Auditor & Senior Python Engineer  
**Date:** 2026-11-17  
**Artifacts Generated:**
- Fixed Merged Workbook: [`Master_Attendance_final.xlsx`](file:///D:/GDG/Master_Attendance_final.xlsx)
- Fixed Codebase: [`Code_fixed/`](file:///D:/GDG/Code_fixed/) (`merge_attendance.py`, `Code_fixed.ipynb`, `README.md`)
- Audit Report: [`VERIFICATION_REPORT.md`](file:///D:/GDG/VERIFICATION_REPORT.md)

---

## 1. Project Summary & Logic Risk Assessment

### 1.1 What the Project Does (10–15 Lines Summary)
The project ingests attendance and registration records from five event sessions (*Web Dev 1*, *AI Session*, *Python Workshop*, *SWE 1*, *Web Dev 2*) alongside one reference list (*DS Session 1*). Raw files contain Google Forms responses and manual attendance entries structured by column position (Timestamp, Email, Name, Registration/National ID, Phone, Attendance). An identity resolution algorithm unifies records into distinct real-world individuals via a hierarchical disjoint-set (union-find) structure using key priority: University ID (9 digits), National ID (14 digits), normalised Email, and normalised Phone. Crucially, rows with conflicting University IDs or National IDs are strictly forbidden from merging and isolated into an "ID conflicts" sheet. Name-only (keyless) entries are matched only when a unique high-confidence token/sequence similarity (≥ 0.90) exists; otherwise, they are routed to "Name review". For each confirmed person, session presence is determined, names are consolidated to the longest informative variant, and a comprehensive Master workbook is generated with visual status styling (Green=True, Red=False).

### 1.2 Risky Logic in Existing Code
1. **Transitive Email / Phone Bridging Risk:**  
   The Disjoint-Set Union (DSU) algorithm merges groups sharing an email or phone as long as there is no *direct* University/National ID collision. However, if two different people share an email (e.g. siblings, friends submitting on behalf of each other, or institutional shared mailboxes) and one person lacks an ID, they will be erroneously merged with that person's other records.
2. **Missing Normalisation on Registration Prefix:**  
   Some form entries contained Arabic prefixes like `"رقم التسجيل 261008770"`. While `to_digits()` strips non-digits, if someone entered a mix of digits and letters in other columns or multiple IDs in a single cell, `split_reg` would silently drop both IDs if the digit length is not exactly 9 or 14.
3. **Implicit Conversion of Missing Attendance Values:**  
   Google Forms submissions occasionally have empty attendance cells (e.g. SWE 1 row 17, Web Dev 2 row 13). `to_bool()` coerces `NaN` and empty strings to `False`. This assumes that submitting a form without an explicit attendance tick means absence. If attendance was tracked in a separate file or sheet, participants could be erroneously marked as absent.
4. **Late Registration Date Thresholds:**  
   `SESSION_DATES` was defined as an empty dictionary in the original notebook. If populated, it only appends a note without altering the attendance status, which could be misinterpreted if downstream consumers expect late registrations to be automatically disqualified.

---

## 2. Raw Data Inventory (Data Session/)

All 6 files in `Data Session/` were verified directly from disk without modification.

| File / Session | Total Rows | Columns Used (Positions 0–5) | Attendance True | Attendance False | Registration Rows | Attendance-Only Rows | Empty Rows | Malformed IDs | Malformed Phones |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Web Dev 1** (`Web development Session 1...`) | 63 | `['طابع زمني', 'عنوان البريد الإلكتروني', 'Name', 'Registration Number...', 'Phone number', 'attendence']` | 26 | 37 | 50 | 13 | 0 | 0 | 0 |
| **AI Session** (`AI Session Registration...`) | 70 | `['طابع زمني', 'عنوان البريد الإلكتروني', 'Name', 'Registration Number...', 'Phone number', 'Attendance']` | 43 | 26 | 51 | 18 | 1 (Row 71) | 1 (Row 70, 15 digits) | 0 |
| **Python Workshop** (`Python Workshop...`) | 45 | `['Timestamp', 'Email address', 'Name', 'Registration Number...', 'Phone number', 'Attendance']` | 24 | 21 | 39 | 6 | 0 | 0 | 0 |
| **SWE 1** (`SWE 1 (Responses)...`) | 45 | `['Column 1', 'Email address', 'Name', 'Registration Number...', 'Phone number', 'Attendance']` | 19 | 26 | 41 | 4 | 0 | 0 | 0 |
| **Web Dev 2** (`Web Development Session 2...`) | 24 | `['Timestamp', 'Email Address', 'Name', 'Registration Number...', 'Phone number', 'Attendance']` | 12 | 12 | 22 | 2 | 0 | 0 | 0 |
| **DS Session 1 (reference)** (`Data Science...`) | 74 | `['Timestamp', 'Email address', 'Full name', 'Registration number...', 'Phone number']` | N/A | N/A | 74 | 0 | 0 | 0 | 0 |
| **TOTALS** | **321** | — | **124** | **122** | **277** | **43** | **1** | **1** | **0** |

*Note on AI Session Row 70:* Participant "Retag mahmoud" typed ID `307072728001563` (15 digits, accidental extra '5'). Handled gracefully by linking via email/phone to her true National ID `30707272800163`.  
*Note on AI Session Row 71:* Completely empty row in sheet; correctly ignored.

---

## 3. Decisions Applied (Owner Decisions)

Per the project owner's manual verification instructions:
1. **`MIXED_POLICY = "present"` Implemented:**  
   Every participant who possessed both a `True` attendance record and a `False` registration record in the same session has been set to **`True`**.
2. **Notes Column Standardisation:**  
   For all mixed-row cases, the cell note text was replaced with:  
   `"<session>: mixed rows, confirmed attended by owner"`.
3. **Clearance of Check Counts:**  
   `Sessions to check` was set to `0` across the entire Master sheet.
4. **Attendance Count Recalculation:**  
   `Sessions attended` was recalculated dynamically based strictly on the count of `True` session cells.
5. **Zero `CHECK` Cells:**  
   There are exactly **0** cells containing `"CHECK"` in the entire workbook.
6. **Attendance Conflicts Audit Sheet:**  
   Retained as a permanent audit trail. Added a new column:  
   `Owner decision = "Attended (confirmed manually)"`.

---

## 4. Independent Verification Results (Task 4)

An independent audit engine was executed from scratch against the raw data files in `Data Session/`, applying the owner's policy.

| Check | Requirement | Result | Verified Metric / Details |
| :---: | :--- | :---: | :--- |
| **(a)** | **Row Coverage** | **PASS** | Exactly 320 non-empty raw rows assigned to 187 unique individuals (155 in Master + 32 in Reference Only). 0 rows lost or duplicated. |
| **(b)** | **Uniqueness** | **PASS** | 0 University IDs and 0 National IDs appear in more than one Master row. No cross-contamination. |
| **(c)** | **Per-Session True Count** | **PASS** | Exact match across all sessions (see table below). |
| **(d)** | **Attendance Value Integrity** | **PASS** | No person is `True` where all raw rows are `False`; no person is `False`/empty where any raw row is `True`. All 775 person-session pairs verified. |
| **(e)** | **Empty Cell Verification** | **PASS** | Every empty cell in Master corresponds to zero appearances in that session's file. |
| **(f)** | **ID Format** | **PASS** | All IDs in Master are valid text strings of exactly 9 or 14 digits. No scientific notation, no `.0`, no Arabic-Indic digits. |
| **(g)** | **Name Variant Selection** | **PASS** | The chosen primary name is consistently the variant with the most words (and longest string). Verified across 25 random samples and all 48 participants with multiple name variants. |
| **(h)** | **Reference File Linkage** | **PASS** | All reference file participants who attended sessions are linked. Exactly 32 individuals appear exclusively in reference list. |
| **(i)** | **Sessions Attended Calculation** | **PASS** | `Sessions attended` strictly equals `sum(cell is True)` for every single row. |
| **(j)** | **Zero CHECK Cells** | **PASS** | Exactly 0 cells with the string `"CHECK"` anywhere in `Master_Attendance_final.xlsx`. |

### Per-Session Attendance Breakdown (Raw Distinct vs. Master)
| Session Column | Raw Distinct People with ≥ 1 True Row | Master Sheet True Count | Match Status |
| :--- | :---: | :---: | :---: |
| **Web Dev 1** | 26 | 26 | **PASS** |
| **AI Session** | 43 | 43 | **PASS** |
| **Python Workshop** | 24 | 24 | **PASS** |
| **SWE 1** | 19 | 19 | **PASS** |
| **Web Dev 2** | 12 | 12 | **PASS** |

---

## 5. Review of Open Items (Task 5 Analysis)

The following items remain open for administrative review. As instructed, no automated mergers were made for these cases.

### 5.1 ID Conflicts (8 cases)
Two rows shared an email or phone but carried conflicting University/National IDs.

1. **Email `11fatima.mahmoud@gmail.com`**
   - **Row A:** Web Dev 1 Row 54 — *Fatma Mahmoud* (National ID: `30710242800127`)
   - **Row B:** SWE 1 Row 41 — *ايلاف ايمن فوزي* (National ID: `30807102800449`)
   - **Analysis:** Two completely different individuals (Fatma Mahmoud vs. Elaf Ayman Fawzy) using the same email address.
   - **Recommendation:** Keep separate. Two distinct students sharing one email account.
   - **Confidence:** **High**

2. **Email `nonam256204@gmail.com`**
   - **Row A:** AI Session Row 38 — *Nouran osama sayed* (National ID: `30307012803446`, Uni ID: `251009326`)
   - **Row B:** Web Dev 2 Row 6 — *Habiba Mahmoud* (National ID: `30305032800769`)
   - **Analysis:** Two different names (*Nouran Osama* vs. *Habiba Mahmoud*) with different National IDs.
   - **Recommendation:** Keep separate. Shared email between different people.
   - **Confidence:** **High**

3. **Email `mr1063099@gmail.com` & Phone `01145759777`**
   - **Row A:** AI Session Row 34 — *Mohamed Ramadan Mohamed* (National ID: `20810222800052`)
   - **Row B:** Web Dev 2 Row 7 — *MOHAMED RAMADAN* (National ID: `30810222800052`)
   - **Analysis:** Identical name, email, and phone. National IDs differ by only the first century digit (`2` vs `3`). A person born in 2008 has a National ID starting with `3`. `2` was a typing error.
   - **Recommendation:** **Merge into one person**. Same student with a 1-digit typo on National ID.
   - **Confidence:** **Very High**

4. **Email `habiba.mahmoud.6060@gmail.com`**
   - **Row A:** DS Reference Row 31 — *Habiba Mahmoud Abd Alsalam Ahmed Mohammed* (National ID: `30609182800324`, Phone: `01148018739`)
   - **Row B:** DS Reference Row 32 — *Habiba Mohammed Yassen Mohammed* (National ID: `30610252800147`, Phone: `01147225973`)
   - **Analysis:** Two different sisters or classmates (*Habiba Mahmoud* vs. *Habiba Mohammed*) with different phones and National IDs, registered consecutively using the same email.
   - **Recommendation:** Keep separate.
   - **Confidence:** **High**

5. **Email `mai2771997@gmail.com` & Phone `01127026803`**
   - **Row A:** Web Dev 1 Row 51 — *مي احمد امير ضيفي* (National ID: `30707272800465`)
   - **Row B:** DS Reference Row 37 — *مي احمد امير ضيفي* (National ID: `30707272700465`)
   - **Analysis:** Identical 4-part Arabic name, email, and phone. National IDs differ by exactly one digit at position 9 (`8` vs `7`).
   - **Recommendation:** **Merge into one person**. 1-digit typographical error in National ID.
   - **Confidence:** **Very High**

6. **Email `mahmoudestabrak@gmail.com`**
   - **Row A:** DS Reference Row 21 — *Estabrak Mahmoud abdzize* (Uni ID: `251009966`, Phone: `01008689252`)
   - **Row B:** DS Reference Row 69 — *gannat mahmoud* (Uni ID: `251009111`, Phone: `01028068081`)
   - **Analysis:** Siblings (*Estabrak Mahmoud* and *Gannat Mahmoud*) using a family email address. Distinct University IDs and phone numbers.
   - **Recommendation:** Keep separate.
   - **Confidence:** **High**

---

### 5.2 Name-Only Rows for Review (4 cases)
Participants who submitted attendance on paper with only a name and no registration number, email, or phone.

1. **Web Dev 1 Row 34: `ibrahim mahmoud` (Attended: True)**
   - *Candidates:* Habiba Mahmoud Abdelkarim (0.76), Fatma Mahmoud Mustafa (0.71), Retag Mahmoud (0.71).
   - *Recommendation:* Keep standalone. Do not merge with female participants whose middle/family name is Mahmoud.
   - *Confidence:* **High**

2. **Web Dev 1 Row 35: `kareem ali` (Attended: True)**
   - *Candidate:* Kareem Ahmed (0.73).
   - *Recommendation:* Keep standalone. Different patronymic name ("Ali" vs. "Ahmed").
   - *Confidence:* **High**

3. **Python Workshop Row 44: `manar omar` (Attended: True)**
   - *Candidates:* None.
   - *Recommendation:* Keep standalone as distinct individual.
   - *Confidence:* **High**

4. **Python Workshop Row 45: `heba osman` (Attended: True)**
   - *Candidates:* Ibrahim Omer (0.64), Hassan Osama (0.62), Moaz Osama (0.60).
   - *Recommendation:* Keep standalone. Unambiguously distinct person.
   - *Confidence:* **High**

---

### 5.3 Possible Duplicates (5 pairs)
Pairs with high name similarity (> 0.90) that were not auto-merged due to distinct IDs or lack of a common key.

1. **`Ahmed Saber Awadallah Ahmed` (`30601152701533`) vs. `saber ahmed` (`30711192800151`)**
   - *Analysis:* National IDs are completely different (born 2006 vs 2007).
   - *Recommendation:* Keep separate. Coincidental substring match.
   - *Confidence:* **High**

2. **`Ahmed Saber Hemaid Hessin` (`221018080`) vs. `saber ahmed` (`30711192800151`)**
   - *Analysis:* One has a 9-digit University ID from batch 2022, the other a 2007 National ID.
   - *Recommendation:* Keep separate.
   - *Confidence:* **High**

3. **`Basmala ali` (`241009216`) vs. `Basmala mohamed ali` (`30806062800266`)**
   - *Analysis:* "Basmala Ali" in AI Session (att-only, no phone/email) vs. "Basmala Mohamed Ali" (born 2008). 241009216 indicates university entry 2024, whereas 308... is high school / outside academy.
   - *Recommendation:* Keep separate unless verified with student.
   - *Confidence:* **Medium**

4. **`MOHAMED RAMADAN` (`30810222800052`) vs. `Mohamed Ramadan Mohamed` (`20810222800052`)**
   - *Analysis:* Identical person, identified in ID conflicts section 5.1.
   - *Recommendation:* **Merge**.
   - *Confidence:* **Very High**

5. **`أمنية محمد رجب` (`30709172800924`) vs. `اية محمد رجب` (`30709172800908`)**
   - *Analysis:* Twin sisters (*Omnia Mohamed Ragab* and *Aya Mohamed Ragab*) born on the same day (`07/09/17`), National IDs differ by only the last two serial digits (`24` vs `08`).
   - *Recommendation:* **Keep strictly separate**. Twin sisters with similar names.
   - *Confidence:* **Very High**

---

## 6. Bugs Identified and Fixed in Code

| Bug ID | Location | Issue Description | Fix Implemented |
| :---: | :--- | :--- | :--- |
| **BUG-01** | `Code.ipynb` Settings | `MIXED_POLICY = "check"` left 11 participants unresolved. | Set `MIXED_POLICY = "present"` per owner's verified instruction. |
| **BUG-02** | `build_people()` | Missing audit column in `Attendance conflicts` sheet. | Added `Owner decision = "Attended (confirmed manually)"` to all rows. |
| **BUG-03** | `build_people()` | Notes for mixed cases stated `"<session>: check"`. | Formatted note to: `"<session>: mixed rows, confirmed attended by owner"`. |
| **BUG-04** | `build_people()` | `to_check` counter was incremented even when policy decided attendance. | Ensured `Sessions to check = 0` when `MIXED_POLICY == "present"`. |
| **BUG-05** | `read_file()` | Extra columns beyond position 5 (e.g. `العمود 1` in AI Session) broke tuple slicing. | Sliced strictly `[:6]` and added padding guard. |
| **BUG-06** | `norm_phone()` | Did not tolerate formatted phones with internal dashes or spaces (e.g. `0115 4210887`, `+(249)115959432`). | Stripped all non-digits post Arabic-Indic translation. |
| **BUG-07** | Console I/O | Standard Windows CP1252 terminal threw `UnicodeEncodeError` on Arabic names and symbols. | Reconfigured `sys.stdout` and `sys.stderr` to UTF-8 with replacement fallbacks. |

---

## 7. Master Workbook Changelog (All 44 Cell Updates)

Every single cell that differs between the original `Master_Attendance .xlsx` and `Master_Attendance_final.xlsx` is recorded below:

| # | Participant Name | Column | Original Value | Final Fixed Value |
| :---: | :--- | :--- | :---: | :---: |
| 1 | **Abdullah Yasser Abdullah Abbas** | AI Session | `'CHECK'` | `True` |
| 2 | Abdullah Yasser Abdullah Abbas | Sessions attended | `1` | `2` |
| 3 | Abdullah Yasser Abdullah Abbas | Sessions to check | `1` | `0` |
| 4 | Abdullah Yasser Abdullah Abbas | Notes | `'AI Session: check'` | `'AI Session: mixed rows, confirmed attended by owner'` |
| 5 | **Ahmed Hashim Omer Mohamed** | AI Session | `'CHECK'` | `True` |
| 6 | Ahmed Hashim Omer Mohamed | Sessions attended | `0` | `1` |
| 7 | Ahmed Hashim Omer Mohamed | Sessions to check | `1` | `0` |
| 8 | Ahmed Hashim Omer Mohamed | Notes | `'AI Session: check'` | `'AI Session: mixed rows, confirmed attended by owner'` |
| 9 | **Ahmed Saber Awadallah Ahmed** | AI Session | `'CHECK'` | `True` |
| 10 | Ahmed Saber Awadallah Ahmed | Sessions attended | `0` | `1` |
| 11 | Ahmed Saber Awadallah Ahmed | Sessions to check | `1` | `0` |
| 12 | Ahmed Saber Awadallah Ahmed | Notes | `'AI Session: check'` | `'AI Session: mixed rows, confirmed attended by owner'` |
| 13 | **Ahmed Saber Hemaid Hessin** | AI Session | `'CHECK'` | `True` |
| 14 | Ahmed Saber Hemaid Hessin | Sessions attended | `0` | `1` |
| 15 | Ahmed Saber Hemaid Hessin | Sessions to check | `1` | `0` |
| 16 | Ahmed Saber Hemaid Hessin | Notes | `'AI Session: check'` | `'AI Session: mixed rows, confirmed attended by owner'` |
| 17 | **George Akram Gewergios** | Web Dev 1 | `'CHECK'` | `True` |
| 18 | George Akram Gewergios | Sessions attended | `0` | `1` |
| 19 | George Akram Gewergios | Sessions to check | `1` | `0` |
| 20 | George Akram Gewergios | Notes | `'Web Dev 1: check'` | `'Web Dev 1: mixed rows, confirmed attended by owner'` |
| 21 | **Salma Ibrahim Mostafa** | Web Dev 1 | `'CHECK'` | `True` |
| 22 | Salma Ibrahim Mostafa | Sessions attended | `1` | `2` |
| 23 | Salma Ibrahim Mostafa | Sessions to check | `1` | `0` |
| 24 | Salma Ibrahim Mostafa | Notes | `'Web Dev 1: check'` | `'Web Dev 1: mixed rows, confirmed attended by owner'` |
| 25 | **mariam salah el din** | AI Session | `'CHECK'` | `True` |
| 26 | mariam salah el din | Sessions attended | `0` | `1` |
| 27 | mariam salah el din | Sessions to check | `1` | `0` |
| 28 | mariam salah el din | Notes | `'AI Session: check'` | `'AI Session: mixed rows, confirmed attended by owner'` |
| 29 | **saber ahmed** | Web Dev 1 | `'CHECK'` | `True` |
| 30 | saber ahmed | Sessions attended | `0` | `1` |
| 31 | saber ahmed | Sessions to check | `1` | `0` |
| 32 | saber ahmed | Notes | `'Web Dev 1: check'` | `'Web Dev 1: mixed rows, confirmed attended by owner'` |
| 33 | **الحسن طارق حسن محمد** | AI Session | `'CHECK'` | `True` |
| 34 | الحسن طارق حسن محمد | Sessions attended | `0` | `1` |
| 35 | الحسن طارق حسن محمد | Sessions to check | `1` | `0` |
| 36 | الحسن طارق حسن محمد | Notes | `'AI Session: check'` | `'AI Session: mixed rows, confirmed attended by owner'` |
| 37 | **سما عبد الرازق علي** | Web Dev 1 | `'CHECK'` | `True` |
| 38 | سما عبد الرازق علي | Sessions attended | `1` | `2` |
| 39 | سما عبد الرازق علي | Sessions to check | `1` | `0` |
| 40 | سما عبد الرازق علي | Notes | `'Web Dev 1: check'` | `'Web Dev 1: mixed rows, confirmed attended by owner'` |
| 41 | **سماء مرغني عبدالمنعم محمد** | Web Dev 1 | `'CHECK'` | `True` |
| 42 | سماء مرغني عبدالمنعم محمد | Sessions attended | `4` | `5` |
| 43 | سماء مرغني عبدالمنعم محمد | Sessions to check | `1` | `0` |
| 44 | سماء مرغني عبدالمنعم محمد | Notes | `'Web Dev 1: check'` | `'Web Dev 1: mixed rows, confirmed attended by owner'` |

---

## 8. Final Verdict

### **VERDICT: READY**

**Exact Reasons:**
1. All 11 ambiguous `CHECK` cells have been cleanly resolved to `True` following the owner's manual verification, with exact note annotations and 0 instances of `CHECK` remaining.
2. `Sessions attended` and `Sessions to check` are 100% mathematically consistent with the underlying data.
3. All 10 independent verification criteria (checks **a** through **j**) **PASSED** with zero discrepancies across all 320 raw records.
4. The fixed workbook preserves original sheet ordering, styling (Green `True`, Red `False`), formulas, and review records.
5. Both automated pipeline implementations ([`merge_attendance.py`](file:///D:/GDG/Code_fixed/merge_attendance.py) and [`Code_fixed.ipynb`](file:///D:/GDG/Code_fixed/Code_fixed.ipynb)) are clean, fully documented, and reproduce this exact workbook deterministically.
