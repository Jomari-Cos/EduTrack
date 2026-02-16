# Teacher Formula Settings Feature

## Overview
This feature allows teachers to customize the formula used to calculate student average scores. Teachers can adjust the weights given to academic scores vs. attendance in the final calculation.

---

## What Was Implemented

### 1. Database Changes
**File**: [SmartC/Sub_app/models.py](../SmartC/Sub_app/models.py)

Added two new columns to the `Teacher` model:
- `score_weight` (Float, default: 0.7) - Weight for academic scores (70%)
- `attendance_weight` (Float, default: 0.3) - Weight for attendance (30%)

### 2. Backend API Routes
**File**: [SmartC/main.py](../SmartC/main.py)

#### GET `/api/teacher/settings`
Retrieves the current teacher's formula settings.

**Response**:
```json
{
  "success": true,
  "settings": {
    "score_weight": 0.7,
    "attendance_weight": 0.3
  }
}
```

#### POST `/api/teacher/settings`
Updates the teacher's formula settings.

**Request Body**:
```json
{
  "score_weight": 0.8,
  "attendance_weight": 0.2
}
```

**Validation**:
- Weights must sum to 1.0 (100%)
- Weights must be positive
- Invalid values return 400 error with explanation

### 3. Updated Analytics Function
**File**: [SmartC/Sub_app/models.py](../SmartC/Sub_app/models.py)

The `get_student_analytics()` function now accepts custom weight parameters:
```python
def get_student_analytics(grade="", section="", subject="", 
                         score_weight=0.7, attendance_weight=0.3)
```

**Formula**:
```
Weighted Score = (Average Score × Score Weight) + (Attendance % × Attendance Weight)
```

### 4. User Interface
**File**: [SmartC/templates/dashboard.html](../SmartC/templates/dashboard.html)

#### Settings Button
Added a "Settings" button in the dashboard header with a gear icon.

#### Settings Modal
A comprehensive modal interface featuring:
- **Current Formula Display**: Shows the active formula
- **Interactive Sliders**: Adjust weights with real-time validation
- **Quick Presets**: 
  - Balanced (70/30)
  - Score Focus (80/20)
  - Attendance Focus (60/40)
- **Validation**: Ensures weights always sum to 100%
- **Reset to Default**: Restore 70/30 split

### 5. JavaScript Controller
**File**: [SmartC/static/js/dashboard/settings.js](../SmartC/static/js/dashboard/settings.js)

Features:
- Loads current settings from the server
- Real-time slider synchronization
- Automatic validation
- Saves settings via API
- Shows success/error notifications
- Reloads dashboard with new calculations

---

## Installation & Setup

### Step 1: Run Database Migration
Execute the migration script to add the new columns:

```powershell
# From the EduTrack directory
& .venv\Scripts\Activate.ps1
python migrate_teacher_settings.py
```

### Step 2: Restart Flask Server
Restart your Flask application to load the new code:

```powershell
cd SmartC
python main.py
```

---

## How Teachers Use This Feature

### 1. Access Settings
1. Log into the dashboard
2. Click the **"Settings"** button in the top-right header (gear icon)
3. The settings modal will open

### 2. Adjust Formula Weights
- Use the **Score Weight** slider to adjust academic score importance
- Use the **Attendance Weight** slider to adjust attendance importance
- The sliders automatically adjust each other to maintain 100% total
- Watch the formula display update in real-time

### 3. Use Quick Presets (Optional)
Click any preset button for common configurations:
- **Balanced (70/30)**: Standard balance
- **Score Focus (80/20)**: Emphasizes academic performance
- **Attendance Focus (60/40)**: Emphasizes attendance

### 4. Save Changes
1. Review your custom formula
2. Click **"Save Changes"**
3. The page will reload with updated calculations

### 5. Reset to Default (Optional)
Click **"Reset to Default"** to restore the 70/30 formula

---

## Example Use Cases

### Scenario 1: Academic-Focused Class
**Situation**: Teaching advanced students where test scores matter most

**Settings**:
- Score Weight: 85%
- Attendance Weight: 15%

**Result**: Student averages heavily reflect academic performance

### Scenario 2: Attendance-Critical Class
**Situation**: Participation and attendance are crucial

**Settings**:
- Score Weight: 55%
- Attendance Weight: 45%

**Result**: Regular attendance significantly boosts averages

### Scenario 3: Balanced Approach (Default)
**Settings**:
- Score Weight: 70%
- Attendance Weight: 30%

**Result**: Standard balance between academics and attendance

---

## Technical Details

### How Calculations Work

For each student:
1. Calculate attendance percentage
2. Calculate average score per subject
3. Apply custom weights: `(Score × score_weight) + (Attendance × attendance_weight)`
4. Display weighted average

### Data Flow
```
Teacher adjusts settings in UI
    ↓
JavaScript saves to API endpoint
    ↓
Database updates teacher record
    ↓
All analytics queries use teacher's custom weights
    ↓
Dashboard displays recalculated averages
```

### Files Modified

| File | Changes |
|------|---------|
| `SmartC/Sub_app/models.py` | Added weights to Teacher model, updated analytics function |
| `SmartC/main.py` | Added API routes, updated analytics calls |
| `SmartC/templates/dashboard.html` | Added settings button and modal UI |
| `SmartC/static/js/dashboard/settings.js` | Created settings controller |
| `migrate_teacher_settings.py` | Database migration script |

---

## Troubleshooting

### Settings Not Saving
**Issue**: Changes don't persist after refresh

**Solution**:
1. Check browser console for errors
2. Verify teacher is logged in (check session)
3. Confirm database migration was run successfully

### Weights Don't Sum to 100%
**Issue**: Save button is disabled

**Solution**: The UI automatically adjusts sliders to sum to 100%. Manually verify both sliders add up correctly.

### Old Calculations Still Showing
**Issue**: Dashboard shows old averages after saving

**Solution**: Click save and wait for page reload. If issue persists, manually refresh the page (F5).

---

## Future Enhancements

Potential additions:
- Per-subject custom weights
- Time-based formula changes (e.g., different weights per semester)
- Formula templates library
- Import/export formula settings
- Admin override capability

---

## Support

For issues or questions about this feature, check:
1. Browser console for JavaScript errors
2. Flask server logs for API errors
3. Database schema to confirm migration success

---

**Last Updated**: February 2026  
**Version**: 1.0.0
