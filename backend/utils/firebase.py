import firebase_admin
from firebase_admin import credentials, firestore, storage
import os

# Avoid re-initializing if already done
if not firebase_admin._apps:
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": os.environ["FIREBASE_PROJECT_ID"],
        "private_key": os.environ["FIREBASE_PRIVATE_KEY"].replace('\\n', '\n'),
        "client_email": os.environ["FIREBASE_CLIENT_EMAIL"],
        "token_uri": "https://oauth2.googleapis.com/token"
    })
    firebase_admin.initialize_app(cred, {
        'storageBucket': os.environ["FIREBASE_STORAGE_BUCKET"]
    })

db = firestore.client()
bucket = storage.bucket()
