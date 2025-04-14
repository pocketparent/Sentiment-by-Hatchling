from flask import Flask
from routes.entry import entry_bp
from routes.auth import auth_bp
from routes.invite import invite_bp
from routes.export import export_bp

app = Flask(__name__)
app.register_blueprint(entry_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(invite_bp)
app.register_blueprint(export_bp)

if __name__ == '__main__':
    app.run(debug=True)