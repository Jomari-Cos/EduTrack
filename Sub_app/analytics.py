from flask import Blueprint, jsonify
from sqlalchemy import func
from SmartC.database import db
from SmartC.Sub_app.models import Student, Score, Attendance

analytics_bp = Blueprint("analytics", __name__)

@analytics_bp.route("/api/analytics/scores")
def get_average_scores():
    results = db.session.query(
        Score.subject, func.avg(Score.points)
    ).group_by(Score.subject).all()
    data = [{"subject": s, "average": float(avg)} for s, avg in results]
    return jsonify(data)

@analytics_bp.route("/api/analytics/attendance")
def get_attendance_rates():
    results = db.session.query(
        Student.student_id,
        func.avg(Attendance.status * 100)
    ).group_by(Student.student_id).all()
    data = [{"student_id": sid, "rate": float(rate)} for sid, rate in results]
    return jsonify(data)
