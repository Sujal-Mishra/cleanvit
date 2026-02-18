import os
import bcrypt
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if not url or not key:
    print("Supabase credentials missing!")
    exit(1)

supabase = create_client(url, key)

# Password to set
password = "ramu123"
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

print(f"Setting password to: {password}")

# Update Ramu
data = supabase.table("cleaners").update({"password": hashed}).eq("employee_id", "RAMU").execute()

if data.data:
    print("Ramu password updated successfully!")
else:
    print("Ramu user not found. Creating him...")
    # Insert if not exists
    supabase.table("cleaners").insert({
        "employee_id": "RAMU",
        "password": hashed,
        "name": "Ramu",
        "assigned_blocks": '["P","Q","R","S"]',
        "is_active": True
    }).execute()
    print("Ramu created.")

# Update Cleaner 1 as well just in case
hashed_c1 = bcrypt.hashpw("cleaner123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
supabase.table("cleaners").update({"password": hashed_c1}).eq("employee_id", "CLN001").execute()
print("CLN001 password updated to 'cleaner123'")
