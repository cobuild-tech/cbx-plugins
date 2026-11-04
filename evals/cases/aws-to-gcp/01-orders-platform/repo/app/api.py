import json, os, boto3
from flask import Flask, request
app = Flask(__name__)
s3 = boto3.client("s3"); sqs = boto3.client("sqs"); athena = boto3.client("athena")
CACHE = {}  # per-environment cache; Lambda serves one request per environment

@app.post("/upload-url")
def upload_url():
    url = s3.generate_presigned_url("put_object", Params={"Bucket": os.environ["BUCKET"], "Key": request.json["name"]}, ExpiresIn=3600)
    return {"url": url}

@app.post("/orders")
def create_order():
    o = request.json
    sqs.send_message(QueueUrl=os.environ["QUEUE_URL"], MessageBody=json.dumps(o), MessageGroupId=o["customer_id"])
    return {"ok": True}

@app.post("/jobs/rollup")
def rollup():
    athena.start_query_execution(QueryString=open("sql/rollup.sql").read(),
                                 ResultConfiguration={"OutputLocation": f"s3://{os.environ['BUCKET']}/athena/"})
    return {"ok": True}
