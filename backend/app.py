import csv
import os
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from agent import scour_and_enforce

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HASH_DB = os.path.join(BASE_DIR, 'hashes.csv')
USERS_DB = os.path.join(BASE_DIR, 'users.csv')

# Initialize Singular Hash Database (Rebuilds cleanly if old cropped schema exists)
if os.path.exists(HASH_DB):
    with open(HASH_DB, 'r') as f:
        header = f.readline().strip()
    if 'hash_cropped' in header:
        os.remove(HASH_DB)

if not os.path.exists(HASH_DB):
    with open(HASH_DB, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['id', 'image_hash', 'timestamp'])

# Initialize Users Database
if not os.path.exists(USERS_DB):
    with open(USERS_DB, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['org_id', 'password'])
        writer.writerow(['admin@pesu.edu', 'password123'])


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    with open(USERS_DB, 'r') as f:
        for row in csv.DictReader(f):
            if row['org_id'] == data.get('org_id') and row['password'] == data.get('password'):
                return jsonify({"status": "SUCCESS", "message": "Authenticated"})
    return jsonify({"status": "ERROR", "message": "Invalid credentials"}), 401


@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    org_id, password = data.get('org_id'), data.get('password')
    with open(USERS_DB, 'r') as f:
        for row in csv.DictReader(f):
            if row['org_id'] == org_id:
                return jsonify({"status": "ERROR", "message": "Organization ID already exists"}), 400
    with open(USERS_DB, 'a', newline='') as f:
        csv.writer(f).writerow([org_id, password])
    return jsonify({"status": "SUCCESS", "message": "Node registered! Please sign in."})


@app.route('/api/register-hash', methods=['POST'])
def register_hash():
    data = request.json
    image_hash = data.get('image_hash')
    asset_id = os.urandom(3).hex()
    with open(HASH_DB, 'a', newline='') as f:
        csv.writer(f).writerow([asset_id, image_hash, int(time.time())])

    # Return total count of protected assets
    with open(HASH_DB, 'r') as f:
        count = sum(1 for _ in csv.DictReader(f))
    return jsonify({"status": "SUCCESS", "asset_id": asset_id, "image_hash": image_hash, "total_assets": count})


@app.route('/api/scan-web', methods=['POST'])
def scan_web():
    data = request.json or {}
    # Can scan any URL passed from frontend, defaults to our live leak forum
    target_url = data.get('target_url', 'http://127.0.0.1:5001')
    result = scour_and_enforce([target_url], threshold=12)
    return jsonify(result)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)