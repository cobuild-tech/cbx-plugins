import base64, json, functions_framework
@functions_framework.cloud_event
def handle(event):
    order = json.loads(base64.b64decode(event.data["message"]["data"]))
    print("processing", order["id"])
