import datetime, json, os
from google.cloud import storage, pubsub_v1, bigquery
from flask import Flask, request
app = Flask(__name__)
gcs = storage.Client(); pub = pubsub_v1.PublisherClient(publisher_options=pubsub_v1.types.PublisherOptions(enable_message_ordering=True))
TOPIC = pub.topic_path(os.environ["GOOGLE_CLOUD_PROJECT"], "orders")

@app.post("/upload-url")
def upload_url():
    blob = gcs.bucket(os.environ["BUCKET"]).blob(request.json["name"])
    return {"url": blob.generate_signed_url(version="v4", expiration=datetime.timedelta(days=7), method="PUT")}

@app.post("/orders")
def create_order():
    o = request.json
    pub.publish(TOPIC, json.dumps(o).encode(), ordering_key=o["customer_id"]).result()
    return {"ok": True}

@app.post("/jobs/rollup")
def rollup():
    sql = open("sql/rollup.sql").read()
    bigquery.Client().query(sql).result()
    return {"ok": True}
