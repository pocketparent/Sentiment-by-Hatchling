from flask import Blueprint
invite_bp = Blueprint('invite', __name__)
@invite_bp.route('/invite/send', methods=['POST'])
def send_invite():
    return {'status': 'invite sent'}