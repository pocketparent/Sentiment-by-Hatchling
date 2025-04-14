from flask import Blueprint
auth_bp = Blueprint('auth', __name__)
@auth_bp.route('/auth/request-login', methods=['POST'])
def request_login():
    return {'status': 'login link sent'}