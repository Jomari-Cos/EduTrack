from flask import Blueprint, request, jsonify
from datetime import date
from .models import db, Student, Attendance
from sqlalchemy.exc import IntegrityError

# ✅ Blueprint for attendance
attendance_bp = Blueprint("attendance", __name__)


# -----------------------------
# 🔹 Update or Create Attendance (using real student_id)
# -----------------------------
@attendance_bp.route("/update_attendance", methods=["POST"])
def update_attendance():
    """
    Update or create today's attendance record for a student.
    Handles JSON payload from the frontend (AJAX).
    """
    try:
        data = request.get_json(force=True)
        student_id = data.get("student_id")  # real student ID
        status = data.get("status")
    except Exception:
        return jsonify({"success": False, "message": "Invalid or missing JSON body"}), 400

    # Validate inputs
    if not student_id or not status:
        return jsonify({"success": False, "message": "Missing student_id or status"}), 400

    valid_statuses = {"Present", "Absent", "Late", "Excused"}
    if status not in valid_statuses:
        return jsonify({"success": False, "message": f"Invalid status '{status}'"}), 400

    # Find student by real student_id
    student = Student.query.filter_by(student_id=student_id).first()
    if not student:
        return jsonify({"success": False, "message": "Student not found"}), 404

    today = date.today()

    try:
        # Find existing attendance or create new
        record = Attendance.query.filter_by(student_id=student.id, date=today).first()

        if record:
            if record.status != status:
                record.status = status
        else:
            record = Attendance(student_id=student.id, date=today, status=status)
            db.session.add(record)

        db.session.commit()

        full_name = f"{student.first_name} {student.middle_initial + '. ' if student.middle_initial else ''}{student.last_name}"

        return jsonify({
            "success": True,
            "message": f"Attendance saved for {full_name}",
            "student_id": student.student_id,   # real student ID
            "name": full_name,
            "date": str(today),
            "status": record.status
        }), 200

    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Duplicate attendance entry detected for this date."
        }), 409

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error updating attendance: {e}")
        return jsonify({
            "success": False,
            "message": "Database error while updating attendance",
            "error": str(e)
        }), 500



# -----------------------------
# 🔹 Get Student Attendance (Today)
# -----------------------------
@attendance_bp.route("/get_attendance/<int:student_id>", methods=["GET"])
def get_attendance(student_id):
    """
    Returns today's attendance status for the given student_id.
    Defaults to 'Absent' if no record exists.
    """
    today = date.today()
    record = Attendance.query.filter_by(student_id=student_id, date=today).first()

    return jsonify({
        "student_id": student_id,
        "date": str(today),
        "status": record.status if record else "Absent"
    }), 200


# -----------------------------
# 🔹 Get All Attendance Records (Today)
# -----------------------------
@attendance_bp.route("/get_all_attendance", methods=["GET"])
def get_all_attendance():
    today = date.today()
    records = Attendance.query.filter_by(date=today).all()

    attendance_list = [
        {
            "student_id": r.student_id,
            "student_name": f"{r.student.first_name} {r.student.last_name}",
            "grade_level": r.student.grade_level,
            "section": r.student.section,
            "status": r.status,
            "date": str(r.date)
        }
        for r in records
    ]

    return jsonify({
        "date": str(today),
        "records": attendance_list,
        "count": len(attendance_list)
    }), 200
