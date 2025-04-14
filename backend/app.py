from flask import Flask
from flask_cors import CORS
from routes.entry import entry_bp
from routes.auth import auth_bp
from routes.invite import invite_bp
from routes.export import export_bp

app = Flask(__name__)
CORS(app, origins=["https://myhatchling.ai"])

@app.route("/", methods=["GET"])
def index():
    return {"status": "ok", "message": "Hatchling API is live"}, 200

app.register_blueprint(entry_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(invite_bp)
app.register_blueprint(export_bp)

if __name__ == '__main__':
    app.run(debug=True)
