import json

def handle(event, context):
    failures = []
    for record in event["Records"]:
        try:
            order = json.loads(record["body"])
            print("processing", order["id"])
        except Exception:
            failures.append({"itemIdentifier": record["messageId"]})
    return {"batchItemFailures": failures}
