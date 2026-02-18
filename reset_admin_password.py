
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

password = "admin123"
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

print(f"Setting Admin password to: {password}")

# Try to update first
data = supabase.table("admins").update({"password": hashed}).eq("username", "admin").execute()

if not data.data:
    print("Admin user not found. Creating...")
    supabase.table("admins").insert({
        "username": "admin",
        "password": hashed
    }).execute()
    print("Admin created.")
else:
    print("Admin password updated successfully!")
