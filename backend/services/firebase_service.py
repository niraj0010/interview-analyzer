import firebase_admin
from firebase_admin import credentials, storage
import uuid, os

cred = credentials.Certificate("firebase-service-account.json")
firebase_admin.initialize_app(cred, {"storageBucket": "your-project-id.appspot.com"})
bucket = storage.bucket()

async def upload_to_firebase(file):
    temp_file = f"temp_{uuid.uuid4()}_{file.filename}"
    with open(temp_file, "wb") as f:
        f.write(await file.read())

    blob = bucket.blob(f"uploads/{file.filename}")
    blob.upload_from_filename(temp_file)
    blob.make_public()
    os.remove(temp_file)
    return blob.public_url
