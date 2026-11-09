import functions_framework
from flask import Request
from google.cloud import storage

gcs = storage.Client()


@functions_framework.http
def transcode(request: Request):
    job = request.get_json()
    blob = gcs.bucket(job["bucket"]).get_blob(job["name"])
    if blob is None or str(blob.generation) != str(job["generation"]):
        return ("stale", 200)               # file was replaced or deleted
    # ... run ffmpeg, write renditions ...
    return ("ok", 200)
