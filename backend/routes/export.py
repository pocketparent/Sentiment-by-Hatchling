from flask import Blueprint
export_bp = Blueprint('export', __name__)
@export_bp.route('/export', methods=['GET'])
def export_entries():
    return {'status': 'exported'}