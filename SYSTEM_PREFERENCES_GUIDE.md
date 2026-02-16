# System Preferences Implementation Guide

## Overview

System Preferences in EduTrack are **system-wide academic standards** that define institutional requirements and thresholds. They serve as reference values for evaluating student performance across the entire school.

---

## The Three System Preferences

### 1. **Minimum Attendance Percentage** (Default: 75%)
**Purpose:** Defines the minimum attendance rate required for a student to be considered in good standing.

**Database Column:** `SystemSettings.minimum_attendance_percentage` (Float)

**Current Implementation:**
- ✅ Stored in database
- ✅ Configurable via admin settings modal
- ✅ Validated (0-100 range)
- ❌ Not yet used for automatic student flagging

**How It Should Work:**
```python
# Example usage in analytics
def get_student_status(student):
    settings = SystemSettings.query.first()
    min_attendance = settings.minimum_attendance_percentage if settings else 75.0
    
    attendance_percentage = calculate_attendance(student)
    
    if attendance_percentage < min_attendance:
        return {
            'status': 'at_risk',
            'reason': f'Attendance below minimum ({attendance_percentage}% < {min_attendance}%)',
            'flag': '⚠️ Low Attendance'
        }
    return {'status': 'good'}
```

**Use Cases:**
- Flag students with low attendance for intervention
- Generate "at-risk student" reports
- Display warnings in student profiles
- Filter students needing attendance counseling
- Parent notification triggers

---

### 2. **Passing Grade** (Default: 60.0)
**Purpose:** Minimum grade required to pass a course or subject.

**Database Column:** `SystemSettings.passing_grade` (Float)

**Current Implementation:**
- ✅ Stored in database
- ✅ Configurable via admin settings
- ✅ Validated (0-100 range, must be ≤ honor roll grade)
- ❌ Not yet used in grade evaluation

**How It Should Work:**
```python
# Example usage in grade evaluation
def evaluate_student_performance(student_id):
    settings = SystemSettings.query.first()
    passing_grade = settings.passing_grade if settings else 60.0
    
    analytics = get_student_analytics()
    student = next((s for s in analytics if s['student_id'] == student_id), None)
    
    if student:
        avg_score = student['average_score']
        
        if avg_score < passing_grade:
            return {
                'status': 'failing',
                'grade': avg_score,
                'message': f'Below passing grade ({avg_score} < {passing_grade})',
                'flag': '❌ Failing'
            }
        elif avg_score >= passing_grade:
            return {
                'status': 'passing',
                'grade': avg_score,
                'message': f'Meeting passing standard ({avg_score} ≥ {passing_grade})',
                'flag': '✅ Passing'
            }
```

**Use Cases:**
- Determine if student passes/fails a subject
- Calculate promotion eligibility
- Generate failing student reports
- Display pass/fail status in dashboards
- Academic probation determination
- Grade report generation

---

### 3. **Honor Roll Grade** (Default: 90.0)
**Purpose:** Minimum grade required to qualify for honor roll or academic distinction.

**Database Column:** `SystemSettings.honor_roll_grade` (Float)

**Current Implementation:**
- ✅ Stored in database
- ✅ Configurable via admin settings
- ✅ Validated (0-100 range, must be ≥ passing grade)
- ❌ Not yet used in student recognition

**How It Should Work:**
```python
# Example usage in honors determination
def check_honor_roll_status(student_id):
    settings = SystemSettings.query.first()
    honor_roll_grade = settings.honor_roll_grade if settings else 90.0
    
    analytics = get_student_analytics()
    student = next((s for s in analytics if s['student_id'] == student_id), None)
    
    if student:
        avg_score = student['average_score']
        
        if avg_score >= honor_roll_grade:
            return {
                'status': 'honor_roll',
                'grade': avg_score,
                'message': f'Qualifies for honor roll ({avg_score} ≥ {honor_roll_grade})',
                'flag': '🎖️ Honor Roll',
                'distinction': 'High Honors' if avg_score >= 95 else 'Honors'
            }
```

**Use Cases:**
- Identify honor roll students
- Generate dean's list / honor roll reports
- Display achievement badges in profiles
- Calculate academic distinctions
- Award certificates and recognition
- Scholarship eligibility determination

---

## Current Architecture

### Database Model
**Location:** `SmartC/Sub_app/models.py`

```python
class SystemSettings(db.Model):
    # ... other fields ...
    
    # System Preferences
    minimum_attendance_percentage = db.Column(db.Float, default=75.0, nullable=False)
    passing_grade = db.Column(db.Float, default=60.0, nullable=False)
    honor_roll_grade = db.Column(db.Float, default=90.0, nullable=False)
```

### API Endpoints
**Location:** `SmartC/Sub_app/admin.py`

**GET `/admin/api/settings`** - Retrieve all system settings
```json
{
  "success": true,
  "settings": {
    "minimum_attendance_percentage": 75.0,
    "passing_grade": 60.0,
    "honor_roll_grade": 90.0,
    // ... other settings
  }
}
```

**POST `/admin/api/settings`** - Update system settings
```json
{
  "minimum_attendance_percentage": 80.0,
  "passing_grade": 65.0,
  "honor_roll_grade": 92.0
}
```

### Admin UI
**Location:** `SmartC/templates/admin.html`

- Three numeric input fields (0-100 range)
- Real-time validation
- Help text explaining each preference
- Saves to database on form submission

### JavaScript Validation
**Location:** `SmartC/static/js/admin-settings.js`

```javascript
// Validation rules:
// 1. All values must be 0-100
// 2. Honor roll grade ≥ Passing grade
// 3. All fields required

if (honor < passing) {
  showNotification("⚠️ Honor roll grade should be higher than passing grade", "error");
  return;
}
```

---

## How System Preferences Work Together

### Example Scenario: Student Performance Levels

Let's say your system preferences are set to:
- Minimum Attendance: **80%**
- Passing Grade: **60**
- Honor Roll: **90**

**Student A:**
- Attendance: 95%
- Average Score: 92

**Status:**
- ✅ Meets attendance requirement (95% ≥ 80%)
- ✅ Passing (92 ≥ 60)
- 🎖️ **Honor Roll** (92 ≥ 90)

**Student B:**
- Attendance: 75%
- Average Score: 65

**Status:**
- ⚠️ Below attendance requirement (75% < 80%)
- ✅ Passing (65 ≥ 60)
- ❌ Not honor roll (65 < 90)
- **Flag:** At-risk due to low attendance

**Student C:**
- Attendance: 85%
- Average Score: 55

**Status:**
- ✅ Meets attendance requirement (85% ≥ 80%)
- ❌ **Failing** (55 < 60)
- ❌ Not honor roll (55 < 90)
- **Flag:** Academic intervention needed

---

## Implementation Status

### ✅ Completed:
1. Database schema with three preference columns
2. Admin settings UI for configuration
3. API endpoints (GET/POST)
4. JavaScript validation and form handling
5. Settings persistence to database
6. Help text and user guidance

### ❌ Pending Implementation:

#### 1. Student Status Evaluation Function
**Create:** `SmartC/Sub_app/models.py`

```python
def evaluate_student_status(student_id):
    """Evaluate student against system preferences."""
    settings = SystemSettings.query.first()
    
    # Get defaults if no settings exist
    min_attendance = settings.minimum_attendance_percentage if settings else 75.0
    passing_grade = settings.passing_grade if settings else 60.0
    honor_roll_grade = settings.honor_roll_grade if settings else 90.0
    
    # Get student analytics
    analytics = get_student_analytics()
    student = next((s for s in analytics if s['student_id'] == student_id), None)
    
    if not student:
        return None
    
    flags = []
    status = {
        'attendance_status': 'good',
        'grade_status': 'passing',
        'honors': False
    }
    
    # Check attendance
    if student['attendance'] < min_attendance:
        status['attendance_status'] = 'low'
        flags.append({
            'type': 'warning',
            'icon': '⚠️',
            'message': f"Attendance below minimum ({student['attendance']}% < {min_attendance}%)"
        })
    
    # Check grades
    avg_score = student['average_score']
    
    if avg_score < passing_grade:
        status['grade_status'] = 'failing'
        flags.append({
            'type': 'danger',
            'icon': '❌',
            'message': f"Below passing grade ({avg_score} < {passing_grade})"
        })
    elif avg_score >= honor_roll_grade:
        status['honors'] = True
        flags.append({
            'type': 'success',
            'icon': '🎖️',
            'message': f"Honor Roll ({avg_score} ≥ {honor_roll_grade})"
        })
    
    return {
        'student': student,
        'status': status,
        'flags': flags,
        'thresholds': {
            'min_attendance': min_attendance,
            'passing_grade': passing_grade,
            'honor_roll_grade': honor_roll_grade
        }
    }
```

#### 2. Dashboard Integration

**Update:** `SmartC/templates/dashboard/components/student.html`

```html
<!-- Add status badges based on system preferences -->
<div class="student-flags">
  {% if student.attendance < system_prefs.min_attendance %}
    <span class="badge badge-warning">⚠️ Low Attendance</span>
  {% endif %}

  {% if student.average_score < system_prefs.passing_grade %}
    <span class="badge badge-danger">❌ Below Passing</span>
  {% elif student.average_score >= system_prefs.honor_roll_grade %}
    <span class="badge badge-success">🎖️ Honor Roll</span>
  {% endif %}
</div>
```

#### 3. Filtered Reports

**Add routes:** `SmartC/main.py` or `SmartC/Sub_app/admin.py`

```python
@app.route('/reports/at-risk-students')
def at_risk_students():
    """Get students below minimum attendance."""
    settings = SystemSettings.query.first()
    min_attendance = settings.minimum_attendance_percentage if settings else 75.0
    
    analytics = get_student_analytics()
    at_risk = [s for s in analytics if s['attendance'] < min_attendance]
    
    return jsonify({
        'threshold': min_attendance,
        'count': len(at_risk),
        'students': at_risk
    })

@app.route('/reports/failing-students')
def failing_students():
    """Get students below passing grade."""
    settings = SystemSettings.query.first()
    passing = settings.passing_grade if settings else 60.0
    
    analytics = get_student_analytics()
    failing = [s for s in analytics if s['average_score'] < passing]
    
    return jsonify({
        'threshold': passing,
        'count': len(failing),
        'students': failing
    })

@app.route('/reports/honor-roll')
def honor_roll():
    """Get honor roll students."""
    settings = SystemSettings.query.first()
    honor_grade = settings.honor_roll_grade if settings else 90.0
    
    analytics = get_student_analytics()
    honors = [s for s in analytics if s['average_score'] >= honor_grade]
    
    return jsonify({
        'threshold': honor_grade,
        'count': len(honors),
        'students': honors
    })
```

#### 4. Visual Indicators in Dashboard

**Update:** `SmartC/static/js/dashboard/dashboard-core.js`

```javascript
// Load system preferences
let systemPreferences = null;

async function loadSystemPreferences() {
  const response = await fetch('/admin/api/settings');
  const data = await response.json();
  if (data.success) {
    systemPreferences = {
      minAttendance: data.settings.minimum_attendance_percentage,
      passingGrade: data.settings.passing_grade,
      honorRollGrade: data.settings.honor_roll_grade
    };
  }
}

// Check student status
function getStudentStatusBadges(student) {
  const badges = [];
  
  if (systemPreferences) {
    // Low attendance check
    if (student.attendance < systemPreferences.minAttendance) {
      badges.push({
        class: 'bg-yellow-500',
        icon: '⚠️',
        text: 'Low Attendance'
      });
    }
    
    // Grade status check
    if (student.average_score < systemPreferences.passingGrade) {
      badges.push({
        class: 'bg-red-500',
        icon: '❌',
        text: 'Below Passing'
      });
    } else if (student.average_score >= systemPreferences.honorRollGrade) {
      badges.push({
        class: 'bg-green-500',
        icon: '🎖️',
        text: 'Honor Roll'
      });
    }
  }
  
  return badges;
}
```

---

## Testing Checklist

- [ ] Admin can view current system preferences
- [ ] Admin can update preferences and save successfully
- [ ] Validation prevents honor roll < passing grade
- [ ] Validation prevents values outside 0-100 range
- [ ] Settings persist correctly to database
- [ ] Dashboard shows student flags based on preferences
- [ ] Reports filter students by preference thresholds
- [ ] Changing preferences updates student status display
- [ ] Honor roll students show achievement badges
- [ ] At-risk students show warning indicators

---

## Benefits of System Preferences

### For Administrators:
- **Standardization:** Consistent academic standards across all classes
- **Flexibility:** Easy to adjust thresholds as policies change
- **Reporting:** Automated identification of at-risk and high-achieving students
- **Accountability:** Clear, system-wide benchmarks

### For Teachers:
- **Clarity:** Know institutional standards for grading
- **Automation:** System flags students needing attention
- **Recognition:** Easy identification of honor roll students
- **Intervention:** Early warning for struggling students

### For Students:
- **Transparency:** Clear expectations for success
- **Motivation:** Visible goals for honor roll achievement
- **Support:** Early identification of academic challenges
- **Recognition:** Automatic honors designation

---

## Real-World Example

**Scenario:** St. Mary's High School sets:
- Minimum Attendance: 85%
- Passing Grade: 70
- Honor Roll: 93

**Quarter Results:**
- 450 total students
- 23 students below 85% attendance → counseling referrals generated
- 15 students below 70 average → tutoring program enrollment
- 42 students at/above 93 → honor roll certificates printed
- 370 students passing with good attendance → no intervention needed

The system automatically categorizes all students, generates reports, and helps staff focus on students who need support or recognition.

---

## Current Status Summary

**System Preferences are:**
- ✅ **Defined** in the database model
- ✅ **Configurable** through the admin interface
- ✅ **Validated** for correctness
- ✅ **Stored** persistently
- ❌ **Not yet used** for automated student evaluation
- ❌ **Not yet displayed** in student dashboards
- ❌ **Not yet used** for filtering reports

**Next Steps:**
1. Implement `evaluate_student_status()` function
2. Add status badges to student cards/profiles
3. Create filtered report endpoints
4. Update dashboard to show preference-based flags
5. Add notification triggers for threshold breaches
