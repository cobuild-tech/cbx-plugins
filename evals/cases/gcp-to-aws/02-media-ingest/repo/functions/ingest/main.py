import datetime
import json
import os

import functions_framework
from google.cloud import pubsub_v1, tasks_v2
from google.protobuf import timestamp_pb2

tasks = tasks_v2.CloudTasksClient()
publisher = pubsub_v1.PublisherClient()

# Uploads are held for 2 hours so editors can replace a file before it is
# transcoded. A replacement re-triggers this function with a new generation.
HOLD = datetime.timedelta(hours=2)


@functions_framework.cloud_event
def on_upload(event):
    obj = event.data
    name = obj["name"]                     # e.g. "Season 2/Episode 01 – Pilot.mov"
    generation = obj["generation"]
    if not name.lower().endswith((".mov", ".mp4", ".mxf")):
        return

    run_at = timestamp_pb2.Timestamp()
    run_at.FromDatetime(datetime.datetime.utcnow() + HOLD)

    tasks.create_task(
        parent=os.environ["TASKS_QUEUE"],
        task={
            # Named per generation: a re-upload creates a new task, the old one
            # becomes stale and the transcoder skips it.
            "name": f"{os.environ['TASKS_QUEUE']}/tasks/{abs(hash((name, generation)))}",
            "schedule_time": run_at,
            "dispatch_deadline": {"seconds": 1800},
            "http_request": {
                "http_method": tasks_v2.HttpMethod.POST,
                "url": os.environ["TRANSCODE_URL"],
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps(
                    {"bucket": obj["bucket"], "name": name, "generation": generation}
                ).encode(),
                "oidc_token": {"service_account_email": os.environ.get("SA_EMAIL", "")},
            },
        },
    )

    publisher.publish(
        os.environ["EVENTS_TOPIC"],
        b"",
        event="queued",
        bucket=obj["bucket"],
        name=name,
        generation=str(generation),
        content_type=obj.get("contentType", ""),
        size=str(obj.get("size", 0)),
        md5=obj.get("md5Hash", ""),
        crc32c=obj.get("crc32c", ""),
        uploader=obj.get("metadata", {}).get("uploader", ""),
        show=obj.get("metadata", {}).get("show", ""),
        season=obj.get("metadata", {}).get("season", ""),
        episode=obj.get("metadata", {}).get("episode", ""),
    )
