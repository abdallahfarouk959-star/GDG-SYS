"""
export_data.py
Exports Master_Attendance_final.xlsx into an enriched JSON / JS object
for the GDG Interactive Analytics Dashboard.
(Updated with advanced analytical diagrams and cleaned from location/audit clutter)
"""

import os
import re
import json
import openpyxl

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Check for Master file in current directory, fallback to ../data/
MASTER_FILE = os.path.join(BASE_DIR, "Master_Attendance_final.xlsx")
if not os.path.exists(MASTER_FILE):
    MASTER_FILE = os.path.join(BASE_DIR, "..", "data", "Master_Attendance_final.xlsx")

OUTPUT_JS = os.path.join(BASE_DIR, "dashboard_data.js")
OUTPUT_JSON = os.path.join(BASE_DIR, "dashboard_data.json")

SESSIONS = ["Web Dev 1", "AI Session", "Python Workshop", "SWE 1", "Web Dev 2"]

MALE_NAMES = {
    'ahmed', 'mohamed', 'mahmoud', 'abdelrahman', 'abdallah', 'abdullah', 'ali',
    'youssef', 'youssif', 'george', 'isam', 'mark', 'moaz', 'kareem', 'karim',
    'ibrahim', 'hassan', 'hosny', 'mostafa', 'mustafa', 'omar', 'hazem', 'mina',
    'amonious', 'bavly', 'makarious', 'waleed', 'andro', 'harby', 'abdalrhman',
    'abdelrhman', 'abdo', 'ebrhaim', 'yamen', 'marwan', 'eyad', 'hany', 'ammar',
    'yousef', 'abobakr', 'mayer', 'hossam', 'abdelfath', 'mohamad', 'mohammed',
    'moller',
    'الحسن', 'حسن', 'عبدالعزيز', 'امين', 'محمد', 'احمد', 'محمود', 'عبدالرحمن',
    'عبدالله', 'علي', 'يوسف', 'كريم', 'معاذ', 'عمر', 'مصطفى', 'ابراهيم', 'جورج',
    'مروان', 'حازم', 'مينا', 'مايكل', 'وليد', 'بيشوي', 'شنودة', 'حسام', 'عبدالفتاح'
}

FEMALE_NAMES = {
    'salma', 'heba', 'basmala', 'minnatallah', 'mennatallah', 'shahenda', 'hanin',
    'habiba', 'mai', 'mayar', 'yara', 'rana', 'rawya', 'rawyadahab', 'jowayria',
    'rodina', 'rodeahmed', 'aya', 'shahd', 'maryem', 'mariam', 'meryem', 'ghsoon',
    'sama', 'samaa', 'nohira', 'sandra', 'fatma', 'fatima', 'retag', 'roaa', 'amira',
    'ethar', 'haneen', 'ghada', 'gehad', 'naira', 'jana', 'radwa', 'rania',
    'bassant', 'basant', 'elaf', 'monica', 'madona', 'rawda', 'omnia', 'shimaa',
    'ola', 'arwa', 'jojomedhat', 'hala', 'hla', 'nouran', 'waad', 'farida',
    'demyana', 'dona', 'rehab', 'sahar', 'nonam', 'menna', 'mennaallah',
    'aghapy', 'razan',
    'سلمى', 'سلمي', 'حلا', 'رويدا', 'رنا', 'راوية', 'رودينه', 'آية', 'اية', 'شهد',
    'مي', 'ميار', 'مريم', 'غصون', 'منة', 'منه', 'جنى', 'جني', 'نوهيرا', 'سماء',
    'سما', 'حنين', 'اسراء', 'تهاني', 'فاطمة', 'فاطمه', 'إيلاف', 'ايلاف', 'ريتاج',
    'رؤى', 'روان', 'أميرة', 'اميرة', 'أمينة', 'امينة', 'اميره', 'أمنية', 'امنية',
    'بسنت', 'بسمة', 'بسملة', 'مادونا', 'ندى', 'ندي', 'شروق', 'حبيبة', 'سارة',
    'فريدة', 'وعد', 'أروى', 'اروى', 'جنى', 'جنه', 'جنات', 'رحاب', 'سحر', 'رضوى'
}

def infer_gender(name, nid):
    """Determine gender using National ID (ground truth) or name heuristics."""
    if nid and nid != 'None':
        nids = [x.strip() for x in str(nid).split('|') if len(x.strip()) == 14]
        if nids:
            digit = int(nids[0][12])
            return ('Male', 'National ID') if digit % 2 != 0 else ('Female', 'National ID')
    
    first = re.sub(r'[^\w\s]', '', name.strip().split()[0].lower())
    if first in MALE_NAMES:
        return ('Male', 'Name Match')
    if first in FEMALE_NAMES:
        return ('Female', 'Name Match')
        
    for token in [re.sub(r'[^\w\s]', '', t.lower()) for t in name.strip().split()]:
        if token in FEMALE_NAMES:
            return ('Female', 'Token Match')
        if token in MALE_NAMES:
            return ('Male', 'Token Match')
            
    return ('Unknown', 'Unspecified')

def parse_uni_cohort(uni):
    """Extract academic entry year from 9-digit University ID."""
    if not uni or uni == 'None':
        return None
    valid = [x.strip() for x in str(uni).split('|') if len(x.strip()) == 9]
    if not valid:
        return None
    prefix = valid[0][:2]
    if prefix == '26':
        return 'دفعة 2026 (سنة أولى - Freshmen)'
    elif prefix == '25':
        return 'دفعة 2025 (سنة ثانية - Sophomores)'
    elif prefix == '24':
        return 'دفعة 2024 (سنة ثالثة - Juniors)'
    elif prefix in ('22', '23'):
        return f'دفعة 20{prefix} (سنوات متقدمة)'
    return f'دفعة 20{prefix}'

def parse_short_cohort(uni):
    """Short label for charts."""
    if not uni or uni == 'None':
        return 'خارج الأكاديمية (قومي)'
    valid = [x.strip() for x in str(uni).split('|') if len(x.strip()) == 9]
    if not valid:
        return 'خارج الأكاديمية (قومي)'
    prefix = valid[0][:2]
    if prefix in ('26', '25', '24'):
        return f'دفعة 20{prefix}'
    return 'دفعات سابقة (2022-2023)'

def build_data():
    wb = openpyxl.load_workbook(MASTER_FILE, data_only=True)
    master_ws = wb['Master']
    master_rows = list(master_ws.iter_rows(values_only=True))
    headers = master_rows[0]

    attendees = []
    for r in master_rows[1:]:
        d = dict(zip(headers, r))
        name = str(d['Name'] or '').strip()
        if not name:
            continue
            
        uni = str(d.get('University ID') or '').strip()
        if uni == 'None': uni = ''
        nid = str(d.get('National ID') or '').strip()
        if nid == 'None': nid = ''
        email = str(d.get('Email') or '').strip()
        if email == 'None': email = ''
        phone = str(d.get('Phone') or '').strip()
        if phone == 'None': phone = ''
        other_names = str(d.get('Other name spellings') or '').strip()
        if other_names == 'None': other_names = ''
        notes = str(d.get('Notes') or '').strip()
        if notes == 'None': notes = ''
        in_ref = bool(d.get('In reference list'))
        
        # ID Category
        has_uni = bool(uni)
        has_nid = bool(nid)
        if has_uni and has_nid:
            id_category = "Both IDs (جامعة + قومي)"
        elif has_uni:
            id_category = "University ID Only (طالب أكاديمية)"
        elif has_nid:
            id_category = "National ID Only (رقم قومي / خارجي)"
        else:
            id_category = "Name Only (بدون رقم تسلسلي)"
            
        gender, gender_src = infer_gender(name, nid)
        uni_cohort = parse_uni_cohort(uni)
        short_cohort = parse_short_cohort(uni)
        
        sessions_status = {}
        for s in SESSIONS:
            val = d.get(s)
            sessions_status[s] = val if val in (True, False) else None
            
        attended_count = sum(1 for s in SESSIONS if sessions_status.get(s) is True)
        registered_count = sum(1 for s in SESSIONS if sessions_status.get(s) is not None)
        
        attendees.append({
            'name': name,
            'uni_id': uni,
            'national_id': nid,
            'email': email,
            'phone': phone,
            'other_names': other_names,
            'notes': notes,
            'in_ref_list': in_ref,
            'id_category': id_category,
            'gender': gender,
            'gender_source': gender_src,
            'uni_cohort': uni_cohort,
            'short_cohort': short_cohort,
            'sessions': sessions_status,
            'attended_count': attended_count,
            'registered_count': registered_count,
        })

    # Aggregates
    total_people = len(attendees)
    total_attendances = sum(a['attended_count'] for a in attendees)
    
    # Session Breakdown
    sessions_summary = {}
    for s in SESSIONS:
        reg_count = sum(1 for a in attendees if a['sessions'].get(s) is not None)
        att_count = sum(1 for a in attendees if a['sessions'].get(s) is True)
        abs_count = sum(1 for a in attendees if a['sessions'].get(s) is False)
        rate = round((att_count / reg_count * 100), 1) if reg_count > 0 else 0
        no_show_rate = round((abs_count / reg_count * 100), 1) if reg_count > 0 else 0
        
        m_count = sum(1 for a in attendees if a['sessions'].get(s) is True and a['gender'] == 'Male')
        f_count = sum(1 for a in attendees if a['sessions'].get(s) is True and a['gender'] == 'Female')
        
        uni_count = sum(1 for a in attendees if a['sessions'].get(s) is True and ('University' in a['id_category'] or 'Both' in a['id_category']))
        nid_count = sum(1 for a in attendees if a['sessions'].get(s) is True and 'National ID Only' in a['id_category'])
        
        sessions_summary[s] = {
            'session_name': s,
            'registered': reg_count,
            'attended': att_count,
            'absent': abs_count,
            'attendance_rate': rate,
            'no_show_rate': no_show_rate,
            'male_attended': m_count,
            'female_attended': f_count,
            'uni_id_attended': uni_count,
            'national_id_attended': nid_count
        }

    # Demographics Aggregates
    gender_counts = {'Male': 0, 'Female': 0}
    for a in attendees:
        gender_counts[a['gender']] = gender_counts.get(a['gender'], 0) + 1
        
    id_cat_counts = {}
    for a in attendees:
        id_cat_counts[a['id_category']] = id_cat_counts.get(a['id_category'], 0) + 1
        
    cohort_counts = {}
    for a in attendees:
        if a['uni_cohort']:
            cohort_counts[a['uni_cohort']] = cohort_counts.get(a['uni_cohort'], 0) + 1

    loyalty_counts = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for a in attendees:
        cnt = a['attended_count']
        loyalty_counts[cnt] = loyalty_counts.get(cnt, 0) + 1

    # 1. Cross-Track Overlap Matrix (Heatmap)
    overlap_matrix = {s1: {s2: 0 for s2 in SESSIONS} for s1 in SESSIONS}
    for a in attendees:
        for s1 in SESSIONS:
            if a['sessions'].get(s1) is True:
                for s2 in SESSIONS:
                    if a['sessions'].get(s2) is True:
                        overlap_matrix[s1][s2] += 1

    # 2. Academic Cohorts per Track Breakdown
    cohorts_list = ['دفعة 2026', 'دفعة 2025', 'دفعة 2024', 'دفعات سابقة (2022-2023)', 'خارج الأكاديمية (قومي)']
    cohort_per_track = {s: {c: 0 for c in cohorts_list} for s in SESSIONS}
    for a in attendees:
        for s in SESSIONS:
            if a['sessions'].get(s) is True:
                sc = a['short_cohort']
                cohort_per_track[s][sc] = cohort_per_track[s].get(sc, 0) + 1

    # 3. Gender vs Loyalty (Multi-session commitment by gender)
    gender_loyalty = {
        '1': {'Male': 0, 'Female': 0},
        '2': {'Male': 0, 'Female': 0},
        '3': {'Male': 0, 'Female': 0},
        '4': {'Male': 0, 'Female': 0},
        '5': {'Male': 0, 'Female': 0}
    }
    for a in attendees:
        cnt = str(a['attended_count'])
        if cnt in gender_loyalty:
            g = a['gender']
            if g in gender_loyalty[cnt]:
                gender_loyalty[cnt][g] += 1

    # 4. Chronological Attendance Timeline
    timeline_data = {
        'sessions': SESSIONS,
        'attendance': [sessions_summary[s]['attended'] for s in SESSIONS],
        'registrations': [sessions_summary[s]['registered'] for s in SESSIONS],
        'rates': [sessions_summary[s]['attendance_rate'] for s in SESSIONS]
    }

    dashboard_bundle = {
        'overview': {
            'total_attendees': total_people,
            'total_attendances': total_attendances,
            'total_conflicts_resolved': 11,
            'avg_sessions_per_person': round(total_attendances / total_people, 2),
            'unique_repeat_attendees': sum(1 for a in attendees if a['attended_count'] >= 2),
        },
        'gender_stats': gender_counts,
        'id_category_stats': id_cat_counts,
        'cohort_stats': cohort_counts,
        'loyalty_stats': loyalty_counts,
        'sessions_summary': sessions_summary,
        'analytics': {
            'overlap_matrix': overlap_matrix,
            'cohort_per_track': cohort_per_track,
            'gender_loyalty': gender_loyalty,
            'timeline': timeline_data
        },
        'attendees': attendees
    }

    # Save JSON and JS
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(dashboard_bundle, f, ensure_ascii=False, indent=2)

    with open(OUTPUT_JS, 'w', encoding='utf-8') as f:
        f.write("window.GDG_DASHBOARD_DATA = ")
        json.dump(dashboard_bundle, f, ensure_ascii=False, indent=2)
        f.write(";\n")

    print(f"Data exported successfully:\n  - {OUTPUT_JSON}\n  - {OUTPUT_JS}")
    return dashboard_bundle

if __name__ == '__main__':
    build_data()
