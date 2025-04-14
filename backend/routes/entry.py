from flask import Blueprint
entry_bp = Blueprint('entry', __name__)
@entry_bp.route('/entry', methods=['POST'])
def create_entry():
    return {'status': 'entry created'}