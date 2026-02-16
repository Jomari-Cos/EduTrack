# Default Scoring Formula Implementation Guide

## Overview
The Default Scoring Formula in System Settings acts as a system-wide default that:
1. **New teachers inherit** when they're created
2. **Teachers can customize** their own formula (if `allow_teacher_override` is enabled)
3. **Can be applied to all teachers** at once to reset everyone to system defaults
4. **Controls teacher permissions** via the `allow_teacher_override` flag

---

## Current Architecture

### Database Models

**SystemSettings Model:**
- `default_score_weight` (Float, default: 0.7) - System default: 70% weight for scores
- `default_attendance_weight` (Float, default: 0.3) - System default: 30% weight for attendance
- `allow_teacher_override` (Boolean, default: True) - Whether teachers can customize their formula

**Teacher Model:**
- `score_weight` (Float, default: 0.7) - Individual teacher's score weight
- `attendance_weight` (Float, default: 0.3) - Individual teacher's attendance weight

---

## Implementation Steps

### 1. Helper Function to Get System Defaults

Add this to `SmartC/Sub_app/models.py`:

```python
def get_system_formula_defaults():
    """Get the system-wide default formula weights from settings."""
    from Sub_app.models import SystemSettings
    settings = SystemSettings.query.first()
    
    if settings:
        return {
            'score_weight': settings.default_score_weight,
            'attendance_weight': settings.default_attendance_weight,
            'allow_override': settings.allow_teacher_override
        }
    else:
        # Fallback defaults if no settings exist
        return {
            'score_weight': 0.7,
            'attendance_weight': 0.3,
            'allow_override': True
        }
```

### 2. Update Teacher Creation to Use System Defaults

**In `SmartC/main.py` (@app.route('/add-teacher')):**

```python
from Sub_app.models import SystemSettings

@app.route('/add-teacher', methods=['POST'])
def add_teacher():
    try:
        # ... existing code ...
        
        # Get system default formula settings
        system_settings = SystemSettings.query.first()
        default_score_weight = system_settings.default_score_weight if system_settings else 0.7
        default_attendance_weight = system_settings.default_attendance_weight if system_settings else 0.3
        
        # Create new teacher with system defaults
        new_teacher = Teacher(
            teacher_id=teacher_id,
            name=teacher_name,
            email=teacher_email,
            assigned_classes=json.dumps(assigned_classes),
            rfid_code=rfid_code,
            image=photo_filename,
            score_weight=default_score_weight,  # ✅ Use system default
            attendance_weight=default_attendance_weight  # ✅ Use system default
        )
        
        # ... rest of existing code ...
```

**In `SmartC/Sub_app/admin.py` (@admin_bp.route('/add-teacher')):**

```python
# After creating new_teacher object:

# Get system default formula settings
system_settings = SystemSettings.query.first()
if system_settings:
    new_teacher.score_weight = system_settings.default_score_weight
    new_teacher.attendance_weight = system_settings.default_attendance_weight

# ... rest of code ...
```

### 3. Add API Endpoint to Apply Defaults to All Teachers

**In `SmartC/Sub_app/admin.py`:**

```python
@admin_bp.route('/api/apply-default-formula', methods=['POST'])
def apply_default_formula():
    """Apply system default formula to all teachers."""
    try:
        # Get system settings
        system_settings = SystemSettings.query.first()
        if not system_settings:
            return jsonify({
                'success': False,
                'message': 'System settings not found'
            }), 404
        
        # Get all teachers
        teachers = Teacher.query.all()
        
        # Apply default formula to all teachers
        for teacher in teachers:
            teacher.score_weight = system_settings.default_score_weight
            teacher.attendance_weight = system_settings.default_attendance_weight
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Default formula applied to {len(teachers)} teacher(s)',
            'defaults': {
                'score_weight': system_settings.default_score_weight,
                'attendance_weight': system_settings.default_attendance_weight
            }
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500
```

### 4. Update System Settings Modal

**In `SmartC/templates/admin.html` (System Settings Modal):**

Add a button to apply defaults to all teachers:

```html
<!-- After the formula sliders section -->
<div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
  <div class="flex items-center justify-between">
    <div>
      <p class="text-sm font-semibold text-blue-900">Apply to All Teachers</p>
      <p class="text-xs text-blue-700 mt-1">Reset all teachers to use this default formula</p>
    </div>
    <button 
      type="button" 
      onclick="applyDefaultFormulaToTeachers()"
      class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium">
      Apply Now
    </button>
  </div>
</div>

<!-- Allow Teacher Override Toggle -->
<div class="mt-4">
  <label class="flex items-center space-x-3 cursor-pointer">
    <input 
      type="checkbox" 
      id="allowTeacherOverride" 
      name="allow_teacher_override"
      checked
      class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
    <div>
      <span class="text-sm font-medium text-gray-900">Allow Teacher Override</span>
      <p class="text-xs text-gray-600">Let teachers customize their own scoring formula</p>
    </div>
  </label>
</div>
```

### 5. Add JavaScript Functions

**In `SmartC/static/js/admin-settings.js`:**

```javascript
// Apply default formula to all teachers
async function applyDefaultFormulaToTeachers() {
  if (!confirm('⚠️ This will reset all teachers to use the system default formula. Continue?')) {
    return;
  }
  
  try {
    const response = await fetch('/admin/api/apply-default-formula', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ ${data.message}`);
    } else {
      alert(`❌ ${data.message}`);
    }
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Update loadSettings() to include allow_teacher_override
async function loadSettings() {
  // ... existing code ...
  
  if (data.success) {
    const settings = data.settings;
    // ... existing code ...
    
    // Load allow_teacher_override checkbox
    document.getElementById('allowTeacherOverride').checked = settings.allow_teacher_override !== false;
    
    // ... rest of code ...
  }
}

// Update saveSettings() to include allow_teacher_override
async function saveSettings() {
  // ... existing validation code ...
  
  const settingsData = {
    // ... existing fields ...
    allow_teacher_override: document.getElementById('allowTeacherOverride').checked
  };
  
  // ... rest of save logic ...
}
```

### 6. Teacher Settings Panel (Dashboard)

**Add to dashboard for teachers to customize their formula:**

```html
<!-- In dashboard.html or create a teacher settings modal -->
<div id="teacherFormulaSettings" class="hidden">
  <h3 class="text-lg font-semibold mb-4">My Scoring Formula</h3>
  
  <div class="space-y-4">
    <div>
      <label class="text-sm font-medium">Scores Weight: <span id="teacherScoreWeight">70</span>%</label>
      <input 
        type="range" 
        id="teacherScoreSlider" 
        min="0" 
        max="100" 
        value="70" 
        class="w-full"
        oninput="updateTeacherFormula()">
    </div>
    
    <div>
      <label class="text-sm font-medium">Attendance Weight: <span id="teacherAttendanceWeight">30</span>%</label>
      <input 
        type="range" 
        id="teacherAttendanceSlider" 
        min="0" 
        max="100" 
        value="30" 
        class="w-full"
        oninput="updateTeacherFormula()">
    </div>
    
    <button onclick="saveTeacherFormula()" class="btn btn-primary">Save My Formula</button>
    <button onclick="resetToSystemDefault()" class="btn btn-secondary">Use System Default</button>
  </div>
</div>
```

**JavaScript for teacher settings:**

```javascript
// Auto-sync sliders (same as system settings)
function updateTeacherFormula() {
  const scoreSlider = document.getElementById('teacherScoreSlider');
  const attendanceSlider = document.getElementById('teacherAttendanceSlider');
  
  const scoreWeight = parseInt(scoreSlider.value);
  const attendanceWeight = 100 - scoreWeight;
  
  document.getElementById('teacherScoreWeight').textContent = scoreWeight;
  document.getElementById('teacherAttendanceWeight').textContent = attendanceWeight;
  attendanceSlider.value = attendanceWeight;
}

// Save teacher's custom formula
async function saveTeacherFormula() {
  const scoreWeight = parseInt(document.getElementById('teacherScoreSlider').value) / 100;
  const attendanceWeight = (100 - parseInt(document.getElementById('teacherScoreSlider').value)) / 100;
  
  try {
    const response = await fetch('/api/teacher/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score_weight: scoreWeight,
        attendance_weight: attendanceWeight
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ Your formula has been saved!');
      location.reload(); // Refresh to apply new formula
    } else {
      alert('❌ ' + data.message);
    }
  } catch (error) {
    alert('❌ Error saving formula: ' + error.message);
  }
}

// Reset to system default
async function resetToSystemDefault() {
  if (!confirm('Reset to system default formula?')) return;
  
  try {
    // Get system defaults
    const response = await fetch('/admin/api/settings');
    const data = await response.json();
    
    if (data.success) {
      const defaults = data.settings;
      
      // Apply defaults to teacher
      await fetch('/api/teacher/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score_weight: defaults.default_score_weight,
          attendance_weight: defaults.default_attendance_weight
        })
      });
      
      alert('✅ Reset to system default!');
      location.reload();
    }
  } catch (error) {
    alert('❌ Error: ' + error.message);
  }
}
```

---

## How It All Works Together

### Workflow Example:

1. **Admin sets system defaults:**
   - Goes to System Settings
   - Sets "Default Scoring Formula" to 60% scores, 40% attendance
   - Enables "Allow Teacher Override"
   - Saves settings

2. **New teacher is created:**
   - Teacher automatically gets 60% scores, 40% attendance (system default)

3. **Existing teacher wants custom formula:**
   - Goes to dashboard settings
   - Changes to 80% scores, 20% attendance
   - Saves their custom formula
   - Their analytics now use their custom weights

4. **Admin wants to reset everyone:**
   - Goes to System Settings
   - Clicks "Apply to All Teachers"
   - All teachers now use 60% scores, 40% attendance

5. **Admin disables teacher override:**
   - Unchecks "Allow Teacher Override" in System Settings
   - Teachers can no longer customize their formula
   - Everyone uses system default (enforced)

---

## Database Migration Note

No migration needed! The columns already exist:
- `Teacher.score_weight` ✅
- `Teacher.attendance_weight` ✅
- `SystemSettings.default_score_weight` ✅
- `SystemSettings.default_attendance_weight` ✅
- `SystemSettings.allow_teacher_override` ✅

---

## Testing Checklist

- [ ] Create new teacher → verify they get system default formula
- [ ] Teacher changes their formula → verify it saves correctly
- [ ] Dashboard shows correct weighted scores using teacher's formula
- [ ] Admin applies defaults → all teachers get updated
- [ ] Disable override → teachers can't change their formula
- [ ] System settings modal shows correct defaults
- [ ] Auto-syncing sliders work (score + attendance = 100%)

---

## Security Considerations

1. **Permission Check:** Only admins can access system settings
2. **Override Check:** Verify `allow_teacher_override` before letting teachers change formula
3. **Validation:** Ensure score_weight + attendance_weight = 1.0
4. **Session Check:** Verify teacher is logged in before accessing their settings

---

## Current Status

✅ **Already Implemented:**
- Teacher model has score_weight and attendance_weight
- SystemSettings model has default weights and allow_override flag
- Dashboard uses teacher's formula for analytics
- Teacher settings API endpoints exist (/api/teacher/settings)

❌ **Needs Implementation:**
- New teachers don't inherit system defaults (use hardcoded 0.7/0.3)
- No "Apply to All Teachers" button in settings
- No teacher settings panel in dashboard UI
- No enforcement of allow_teacher_override flag
