from flask import Blueprint, render_template, jsonify, request, session
from flask_login import login_required, current_user

dashboard_bp = Blueprint('dashboard', __name__, 
                         template_folder='templates/dashboard',
                         static_folder='static')

@dashboard_bp.route('/')
@login_required
def dashboard():
    """Render main dashboard page"""
    teacher = get_current_teacher()  # Your function to get teacher
    students = get_students_for_class()  # Your function
    
    return render_template('dashboard.html',
                         teacher=teacher,
                         students=students)

@dashboard_bp.route('/reports')
@login_required
def reports():
    """Render reports page"""
    raw_student = get_all_students_data()  # Your function
    return render_template('reports.html',
                         raw_student=raw_student)

@dashboard_bp.route('/live')
@login_required
def live_monitoring():
    """Render live monitoring page"""
    return render_template('live_monitoring.html')

@dashboard_bp.route('/api/attendance', methods=['GET'])
@login_required
def get_attendance():
    """API endpoint for attendance data"""
    class_id = request.args.get('class_id')
    # Fetch attendance data from database
    return jsonify({
        'attendance': [],
        'stats': {'present': 0, 'absent': 0, 'late': 0, 'excused': 0}
    })

# Register blueprint in your main app
# app.register_blueprint(dashboard_bp, url_prefix='/dashboard')