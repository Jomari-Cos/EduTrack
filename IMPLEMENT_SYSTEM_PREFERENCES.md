# Implementation Guide: System Preferences Features

## Overview
This guide provides step-by-step instructions to implement:
1. Automatic student status evaluation
2. Visual flags/badges in dashboard
3. Filtered reports (at-risk, failing, honor roll)
4. Notification triggers

---

## PART 1: Automatic Student Status Evaluation

### Step 1: Add Helper Function to models.py

**File:** `SmartC/Sub_app/models.py`

Add this function after the `get_student_analytics()` function:

```python
def evaluate_student_status(student_id=None):
    """
    Evaluate student(s) against system preferences.
    
    Args:
        student_id: Specific student ID to evaluate, or None for all students
    
    Returns:
        Single student evaluation dict if student_id provided, else list of all evaluations
    """
    from Sub_app.models import SystemSettings
    
    # Get system preferences
    settings = SystemSettings.query.first()
    min_attendance = settings.minimum_attendance_percentage if settings else 75.0
    passing_grade = settings.passing_grade if settings else 60.0
    honor_roll_grade = settings.honor_roll_grade if settings else 90.0
    
    # Get student analytics
    analytics = get_student_analytics()
    
    # Filter for specific student if requested
    if student_id:
        analytics = [s for s in analytics if s['student_id'] == student_id]
    
    results = []
    
    for student in analytics:
        attendance = student.get('attendance', 0)
        avg_score = student.get('average_score', 0)
        
        # Initialize status
        status = {
            'student_id': student['student_id'],
            'name': f"{student.get('first_name', '')} {student.get('last_name', '')}",
            'attendance_status': 'good',
            'grade_status': 'passing',
            'honors': False,
            'at_risk': False,
            'needs_intervention': False
        }
        
        flags = []
        
        # Check attendance
        if attendance < min_attendance:
            status['attendance_status'] = 'low'
            status['at_risk'] = True
            flags.append({
                'type': 'warning',
                'icon': '⚠️',
                'color': 'yellow',
                'message': f"Low Attendance: {attendance}% (min: {min_attendance}%)"
            })
        
        # Check grades
        if avg_score < passing_grade:
            status['grade_status'] = 'failing'
            status['needs_intervention'] = True
            flags.append({
                'type': 'danger',
                'icon': '❌',
                'color': 'red',
                'message': f"Below Passing: {avg_score}% (min: {passing_grade}%)"
            })
        elif avg_score >= honor_roll_grade:
            status['honors'] = True
            flags.append({
                'type': 'success',
                'icon': '🎖️',
                'color': 'green',
                'message': f"Honor Roll: {avg_score}% (min: {honor_roll_grade}%)"
            })
        
        # Overall risk determination
        if status['at_risk'] or status['needs_intervention']:
            status['overall_status'] = 'at_risk'
        elif status['honors']:
            status['overall_status'] = 'honors'
        else:
            status['overall_status'] = 'good'
        
        results.append({
            'student': student,
            'status': status,
            'flags': flags,
            'thresholds': {
                'min_attendance': min_attendance,
                'passing_grade': passing_grade,
                'honor_roll_grade': honor_roll_grade
            }
        })
    
    # Return single result if specific student, else all results
    if student_id and results:
        return results[0]
    elif student_id:
        return None
    return results
```

### Step 2: Add Quick Evaluation Function

Add this helper function for quick checks:

```python
def get_student_flags(student_id):
    """
    Quick function to get just the flags for a student.
    
    Args:
        student_id: Student ID
    
    Returns:
        List of flag dictionaries
    """
    evaluation = evaluate_student_status(student_id)
    if evaluation:
        return evaluation['flags']
    return []
```

---

## PART 2: Visual Flags/Badges in Dashboard

### Step 1: Add Status Badges to Student Cards

**File:** `SmartC/templates/dashboard/components/student.html` (or wherever student cards are rendered)

Add this badge component HTML:

```html
<!-- Student Status Badges -->
<div class="student-badges flex gap-2 mt-2 flex-wrap">
  {% if student.flags %}
    {% for flag in student.flags %}
      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                   {% if flag.color == 'red' %}bg-red-100 text-red-800
                   {% elif flag.color == 'yellow' %}bg-yellow-100 text-yellow-800
                   {% elif flag.color == 'green' %}bg-green-100 text-green-800
                   {% else %}bg-gray-100 text-gray-800{% endif %}">
        <span class="mr-1">{{ flag.icon }}</span>
        {{ flag.type|title }}
      </span>
    {% endfor %}
  {% endif %}
</div>
```

### Step 2: Update Dashboard Route to Include Evaluations

**File:** `SmartC/main.py`

Update the dashboard route:

```python
@app.route("/dashboard")
def dashboard():
    # Only allow teachers
    if session.get("role") != "teacher":
        return redirect(url_for("index"))

    # Get current teacher
    current_teacher_id = session.get("teacher_id")
    teacher = Teacher.query.filter_by(teacher_id=current_teacher_id).first()

    # Get teacher's formula settings (defaults if not found)
    score_weight = teacher.score_weight if teacher else 0.7
    attendance_weight = teacher.attendance_weight if teacher else 0.3

    # Analytics data with status evaluations
    from Sub_app.models import evaluate_student_status
    raw_student = get_student_analytics(score_weight=score_weight, attendance_weight=attendance_weight)
    
    # Add status evaluations to each student
    student_evaluations = evaluate_student_status()
    for student in raw_student:
        # Find corresponding evaluation
        eval_data = next((e for e in student_evaluations if e['student']['student_id'] == student['student_id']), None)
        if eval_data:
            student['flags'] = eval_data['flags']
            student['status'] = eval_data['status']
        else:
            student['flags'] = []
            student['status'] = {'overall_status': 'good'}

    # Get all students
    students = Student.query.all()
    today = datetime.now().date()

    # Attach today's attendance status to each student
    for s in students:
        attendance_record = Attendance.query.filter_by(student_id=s.id, date=today).first()
        s.status = attendance_record.status if attendance_record else "Absent"
        s.is_present = True if s.status == "Present" else False

    return render_template(
        "dashboard.html",
        students=students,
        teacher=teacher,
        raw_student=raw_student,
        today=today,
        timestamp=int(time.time())
    )
```

### Step 3: Add JavaScript to Show Badges Dynamically

**File:** `SmartC/static/js/dashboard/dashboard-core.js` (or main dashboard JS)

```javascript
// Load system preferences for client-side validation
let systemPreferences = null;

async function loadSystemPreferences() {
  try {
    const response = await fetch('/admin/api/settings');
    const data = await response.json();
    if (data.success) {
      systemPreferences = {
        minAttendance: data.settings.minimum_attendance_percentage || 75,
        passingGrade: data.settings.passing_grade || 60,
        honorRollGrade: data.settings.honor_roll_grade || 90
      };
      console.log('✅ System preferences loaded:', systemPreferences);
    }
  } catch (error) {
    console.error('Error loading system preferences:', error);
  }
}

// Generate status badges HTML
function getStudentBadgesHTML(student) {
  if (!systemPreferences) return '';
  
  const badges = [];
  const attendance = student.attendance || 0;
  const avgScore = student.average_score || 0;
  
  // Low attendance badge
  if (attendance < systemPreferences.minAttendance) {
    badges.push({
      icon: '⚠️',
      text: 'Low Attendance',
      class: 'bg-yellow-100 text-yellow-800'
    });
  }
  
  // Grade status badges
  if (avgScore < systemPreferences.passingGrade) {
    badges.push({
      icon: '❌',
      text: 'Below Passing',
      class: 'bg-red-100 text-red-800'
    });
  } else if (avgScore >= systemPreferences.honorRollGrade) {
    badges.push({
      icon: '🎖️',
      text: 'Honor Roll',
      class: 'bg-green-100 text-green-800'
    });
  }
  
  // Generate HTML
  return badges.map(badge => `
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.class}">
      <span class="mr-1">${badge.icon}</span>
      ${badge.text}
    </span>
  `).join('');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadSystemPreferences();
});
```

---

## PART 3: Filtered Reports

### Step 1: Add Report API Endpoints

**File:** `SmartC/main.py` or `SmartC/Sub_app/admin.py`

Add these routes:

```python
@app.route('/api/reports/at-risk-students')
def report_at_risk_students():
    """Get students with attendance below minimum threshold."""
    try:
        from Sub_app.models import SystemSettings, evaluate_student_status
        
        settings = SystemSettings.query.first()
        min_attendance = settings.minimum_attendance_percentage if settings else 75.0
        
        # Get all student evaluations
        evaluations = evaluate_student_status()
        
        # Filter at-risk students (low attendance)
        at_risk = [
            {
                'student_id': e['student']['student_id'],
                'name': f"{e['student']['first_name']} {e['student']['last_name']}",
                'grade': e['student']['grade_level'],
                'section': e['student']['section'],
                'attendance': e['student']['attendance'],
                'average_score': e['student']['average_score'],
                'flags': e['flags'],
                'reason': 'Low Attendance'
            }
            for e in evaluations 
            if e['status']['at_risk']
        ]
        
        return jsonify({
            'success': True,
            'threshold': min_attendance,
            'count': len(at_risk),
            'students': at_risk
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/reports/failing-students')
def report_failing_students():
    """Get students below passing grade."""
    try:
        from Sub_app.models import SystemSettings, evaluate_student_status
        
        settings = SystemSettings.query.first()
        passing = settings.passing_grade if settings else 60.0
        
        # Get all student evaluations
        evaluations = evaluate_student_status()
        
        # Filter failing students
        failing = [
            {
                'student_id': e['student']['student_id'],
                'name': f"{e['student']['first_name']} {e['student']['last_name']}",
                'grade': e['student']['grade_level'],
                'section': e['student']['section'],
                'attendance': e['student']['attendance'],
                'average_score': e['student']['average_score'],
                'flags': e['flags'],
                'reason': 'Below Passing Grade'
            }
            for e in evaluations 
            if e['status']['needs_intervention']
        ]
        
        return jsonify({
            'success': True,
            'threshold': passing,
            'count': len(failing),
            'students': failing
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/reports/honor-roll')
def report_honor_roll():
    """Get honor roll students."""
    try:
        from Sub_app.models import SystemSettings, evaluate_student_status
        
        settings = SystemSettings.query.first()
        honor_grade = settings.honor_roll_grade if settings else 90.0
        
        # Get all student evaluations
        evaluations = evaluate_student_status()
        
        # Filter honor roll students
        honors = [
            {
                'student_id': e['student']['student_id'],
                'name': f"{e['student']['first_name']} {e['student']['last_name']}",
                'grade': e['student']['grade_level'],
                'section': e['student']['section'],
                'attendance': e['student']['attendance'],
                'average_score': e['student']['average_score'],
                'flags': e['flags'],
                'distinction': 'High Honors' if e['student']['average_score'] >= 95 else 'Honors'
            }
            for e in evaluations 
            if e['status']['honors']
        ]
        
        return jsonify({
            'success': True,
            'threshold': honor_grade,
            'count': len(honors),
            'students': honors
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/reports/all-status')
def report_all_status():
    """Get summary of all student statuses."""
    try:
        from Sub_app.models import evaluate_student_status
        
        evaluations = evaluate_student_status()
        
        # Categorize students
        summary = {
            'total': len(evaluations),
            'at_risk': sum(1 for e in evaluations if e['status']['at_risk']),
            'failing': sum(1 for e in evaluations if e['status']['needs_intervention']),
            'honor_roll': sum(1 for e in evaluations if e['status']['honors']),
            'good_standing': sum(1 for e in evaluations if e['status']['overall_status'] == 'good')
        }
        
        return jsonify({
            'success': True,
            'summary': summary,
            'evaluations': evaluations
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
```

### Step 2: Create Reports Page UI

**File:** `SmartC/templates/dashboard/reports.html`

Add a new reports section or update existing one:

```html
<!-- Student Status Reports -->
<div class="bg-white rounded-lg shadow-md p-6 mb-6">
  <h2 class="text-2xl font-bold mb-4">📊 Student Status Reports</h2>
  
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <!-- At-Risk Students Card -->
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 cursor-pointer hover:shadow-lg transition" onclick="loadReport('at-risk')">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-yellow-800">At-Risk Students</p>
          <p id="atRiskCount" class="text-3xl font-bold text-yellow-900">-</p>
        </div>
        <span class="text-4xl">⚠️</span>
      </div>
      <p class="text-xs text-yellow-700 mt-2">Low attendance</p>
    </div>
    
    <!-- Failing Students Card -->
    <div class="bg-red-50 border border-red-200 rounded-lg p-4 cursor-pointer hover:shadow-lg transition" onclick="loadReport('failing')">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-red-800">Failing Students</p>
          <p id="failingCount" class="text-3xl font-bold text-red-900">-</p>
        </div>
        <span class="text-4xl">❌</span>
      </div>
      <p class="text-xs text-red-700 mt-2">Below passing grade</p>
    </div>
    
    <!-- Honor Roll Card -->
    <div class="bg-green-50 border border-green-200 rounded-lg p-4 cursor-pointer hover:shadow-lg transition" onclick="loadReport('honor-roll')">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-green-800">Honor Roll</p>
          <p id="honorRollCount" class="text-3xl font-bold text-green-900">-</p>
        </div>
        <span class="text-4xl">🎖️</span>
      </div>
      <p class="text-xs text-green-700 mt-2">Excellent performance</p>
    </div>
    
    <!-- Good Standing Card -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-blue-800">Good Standing</p>
          <p id="goodCount" class="text-3xl font-bold text-blue-900">-</p>
        </div>
        <span class="text-4xl">✅</span>
      </div>
      <p class="text-xs text-blue-700 mt-2">Meeting standards</p>
    </div>
  </div>
  
  <!-- Report Details Container -->
  <div id="reportDetails" class="hidden">
    <h3 id="reportTitle" class="text-xl font-semibold mb-4"></h3>
    <div id="reportContent" class="overflow-x-auto"></div>
  </div>
</div>

<script>
// Load report counts on page load
async function loadReportCounts() {
  try {
    const response = await fetch('/api/reports/all-status');
    const data = await response.json();
    
    if (data.success) {
      document.getElementById('atRiskCount').textContent = data.summary.at_risk;
      document.getElementById('failingCount').textContent = data.summary.failing;
      document.getElementById('honorRollCount').textContent = data.summary.honor_roll;
      document.getElementById('goodCount').textContent = data.summary.good_standing;
    }
  } catch (error) {
    console.error('Error loading report counts:', error);
  }
}

// Load specific report
async function loadReport(type) {
  const endpoints = {
    'at-risk': '/api/reports/at-risk-students',
    'failing': '/api/reports/failing-students',
    'honor-roll': '/api/reports/honor-roll'
  };
  
  const titles = {
    'at-risk': '⚠️ At-Risk Students',
    'failing': '❌ Failing Students',
    'honor-roll': '🎖️ Honor Roll Students'
  };
  
  try {
    const response = await fetch(endpoints[type]);
    const data = await response.json();
    
    if (data.success) {
      document.getElementById('reportTitle').textContent = titles[type];
      document.getElementById('reportDetails').classList.remove('hidden');
      
      // Generate table
      const html = `
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade-Section</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Average Score</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${data.students.map(student => `
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${student.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${student.grade}-${student.section}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${student.attendance}%</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${student.average_score}%</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  ${student.flags.map(flag => `
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${flag.color}-100 text-${flag.color}-800">
                      ${flag.icon} ${flag.type}
                    </span>
                  `).join(' ')}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      
      document.getElementById('reportContent').innerHTML = html;
    }
  } catch (error) {
    console.error('Error loading report:', error);
  }
}

// Load counts on page load
document.addEventListener('DOMContentLoaded', loadReportCounts);
</script>
```

---

## PART 4: Notification Triggers

### Step 1: Add Notification System

**File:** `SmartC/Sub_app/models.py`

Add a simple notification model:

```python
class StudentNotification(db.Model):
    __tablename__ = 'student_notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(50), db.ForeignKey('students.student_id'), nullable=False)
    notification_type = db.Column(db.String(50), nullable=False)  # 'at_risk', 'failing', 'honor_roll'
    message = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(20), nullable=False)  # 'info', 'warning', 'danger', 'success'
    read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    student = db.relationship('Student', backref='notifications')
```

### Step 2: Add Notification Trigger Function

**File:** `SmartC/Sub_app/models.py`

```python
def trigger_student_notifications():
    """
    Check all students and create notifications for status changes.
    Should be called periodically (e.g., daily cron job or after grade updates).
    """
    evaluations = evaluate_student_status()
    notifications_created = 0
    
    for eval_data in evaluations:
        student_id = eval_data['student']['student_id']
        flags = eval_data['flags']
        
        for flag in flags:
            # Check if notification already exists today
            today = datetime.utcnow().date()
            existing = StudentNotification.query.filter(
                StudentNotification.student_id == student_id,
                StudentNotification.notification_type == flag['type'],
                func.date(StudentNotification.created_at) == today
            ).first()
            
            if not existing:
                # Create new notification
                notification = StudentNotification(
                    student_id=student_id,
                    notification_type=flag['type'],
                    message=flag['message'],
                    severity=flag['type'],  # 'warning', 'danger', 'success'
                    read=False
                )
                db.session.add(notification)
                notifications_created += 1
    
    db.session.commit()
    return notifications_created
```

### Step 3: Add Notification API Endpoints

**File:** `SmartC/main.py`

```python
@app.route('/api/notifications/<student_id>')
def get_student_notifications(student_id):
    """Get notifications for a specific student."""
    try:
        from Sub_app.models import StudentNotification
        
        notifications = StudentNotification.query.filter_by(
            student_id=student_id
        ).order_by(StudentNotification.created_at.desc()).limit(10).all()
        
        return jsonify({
            'success': True,
            'count': len(notifications),
            'notifications': [{
                'id': n.id,
                'type': n.notification_type,
                'message': n.message,
                'severity': n.severity,
                'read': n.read,
                'created_at': n.created_at.isoformat()
            } for n in notifications]
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/notifications/<int:notification_id>/mark-read', methods=['POST'])
def mark_notification_read(notification_id):
    """Mark a notification as read."""
    try:
        from Sub_app.models import StudentNotification
        
        notification = StudentNotification.query.get(notification_id)
        if notification:
            notification.read = True
            db.session.commit()
            return jsonify({'success': True})
        return jsonify({'success': False, 'message': 'Notification not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/notifications/trigger', methods=['POST'])
def trigger_notifications():
    """Manually trigger notification check (admin only)."""
    try:
        if session.get('role') != 'admin':
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        from Sub_app.models import trigger_student_notifications
        
        count = trigger_student_notifications()
        return jsonify({
            'success': True,
            'message': f'Created {count} new notification(s)'
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
```

### Step 4: Add Notification Bell UI

**File:** `SmartC/templates/dashboard/header.html` or `dashboard.html`

```html
<!-- Notification Bell -->
<div class="relative">
  <button id="notificationBell" class="relative p-2 text-gray-600 hover:text-gray-900">
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
    </svg>
    <span id="notificationCount" class="hidden absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">0</span>
  </button>
  
  <!-- Notification Dropdown -->
  <div id="notificationDropdown" class="hidden absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50">
    <div class="p-4 border-b">
      <h3 class="font-semibold">Notifications</h3>
    </div>
    <div id="notificationList" class="max-h-96 overflow-y-auto">
      <!-- Notifications will be inserted here -->
    </div>
  </div>
</div>

<script>
// Notification system
async function loadNotifications(studentId) {
  try {
    const response = await fetch(`/api/notifications/${studentId}`);
    const data = await response.json();
    
    if (data.success) {
      const unreadCount = data.notifications.filter(n => !n.read).length;
      
      // Update bell badge
      const badge = document.getElementById('notificationCount');
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
      
      // Update notification list
      const list = document.getElementById('notificationList');
      list.innerHTML = data.notifications.map(n => `
        <div class="p-4 border-b hover:bg-gray-50 ${n.read ? 'opacity-60' : ''}" 
             onclick="markNotificationRead(${n.id})">
          <div class="flex items-start">
            <span class="text-2xl mr-3">
              ${n.type === 'warning' ? '⚠️' : n.type === 'danger' ? '❌' : '🎖️'}
            </span>
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900">${n.message}</p>
              <p class="text-xs text-gray-500 mt-1">${new Date(n.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}

async function markNotificationRead(notificationId) {
  try {
    await fetch(`/api/notifications/${notificationId}/mark-read`, {
      method: 'POST'
    });
    // Reload notifications
    loadNotifications(currentStudentId);
  } catch (error) {
    console.error('Error marking notification:', error);
  }
}

// Toggle dropdown
document.getElementById('notificationBell')?.addEventListener('click', () => {
  document.getElementById('notificationDropdown').classList.toggle('hidden');
});
</script>
```

---

## DATABASE MIGRATION

Don't forget to create the notifications table. Run these commands:

```python
# In Python shell or migration script
from SmartC.main import app, db
from Sub_app.models import StudentNotification

with app.app_context():
    db.create_all()
    print("✅ StudentNotification table created")
```

---

## TESTING CHECKLIST

- [ ] `evaluate_student_status()` returns correct flags for test students
- [ ] Dashboard shows status badges for at-risk students
- [ ] Dashboard shows honor roll badges for high achievers
- [ ] At-risk report endpoint returns correct students
- [ ] Failing students report works
- [ ] Honor roll report works
- [ ] All-status summary shows accurate counts
- [ ] Notifications are created when running trigger
- [ ] Notification bell shows unread count
- [ ] Notifications can be marked as read
- [ ] System works with different preference thresholds

---

## OPTIONAL ENHANCEMENTS

### 1. Email Notifications
Add email sending when notifications are triggered:

```python
def send_notification_email(student_id, notification):
    student = Student.query.filter_by(student_id=student_id).first()
    if student and student.email:
        # Use your existing email sending code
        subject = f"Student Status Alert: {notification.notification_type}"
        # Send email...
```

### 2. Scheduled Notification Checks
Use a cron job or task scheduler:

```python
# Add to a scheduled task (runs daily)
@app.cli.command()
def check_student_status():
    """CLI command to check student status and trigger notifications."""
    from Sub_app.models import trigger_student_notifications
    count = trigger_student_notifications()
    print(f"✅ Created {count} notifications")
```

### 3. Parent/Guardian Notifications
Extend to send alerts to guardians:

```python
# Add guardian_email to Student model
# Send to both student.email and student.guardian_email
```

---

## SUMMARY

You've now implemented:
1. ✅ **Auto evaluation** - `evaluate_student_status()` checks all students
2. ✅ **Visual badges** - Color-coded flags in dashboard
3. ✅ **Filtered reports** - API endpoints for at-risk, failing, honor roll
4. ✅ **Notifications** - Database model, triggers, and UI

Students are now automatically categorized based on system preferences, with visual indicators and actionable reports!
