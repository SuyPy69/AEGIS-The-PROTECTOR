import requests
import subprocess
import sys
import time
import csv


def get_registered_hash():
    """Grabs the last registered hash to guarantee a successful match for the demo."""
    try:
        with open('hashes.csv', 'r') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            if rows:
                return rows[-1]['hash_original']  # Get the most recent one
    except Exception as e:
        return None
    return None


def trigger_attack():
    target_url = "https://shadow-leaks-forum.com/post/999"
    stolen_hash = get_registered_hash()

    if not stolen_hash:
        print("❌ No hashes registered yet! Go to the browser and register an image first.")
        return

    print("======================================================")
    print(f"🚨 SIMULATING ATTACK: Actor uploading image to {target_url}...")
    time.sleep(2)

    print("🛡️  AEGIS SCANNER: Checking incoming hash against secure registry...")
    time.sleep(1.5)

    try:
        response = requests.post("http://127.0.0.1:5000/api/scan-media", json={
            "incoming_hash": stolen_hash,
            "target_url": target_url
        })
        data = response.json()

        if data.get("alert"):
            print("🔴 MATCH DETECTED (Hamming Distance < Threshold)!")
            print("🤖 Deploying Aegis Autonomous Agent...\n")
            time.sleep(1)
            # Run the agent script automatically
            subprocess.run([sys.executable, "backend/agent.py", target_url])
        else:
            print("🟢 Image is clean.")
    except requests.exceptions.ConnectionError:
        print("❌ Error: Make sure your Flask backend (app.py) is running!")


if __name__ == "__main__":
    trigger_attack()