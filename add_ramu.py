import sqlite3
import bcrypt

DATABASE = 'cleanvit.db'

def add_cleaner():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Ramu's data
    emp_id = 'RAMU'
    raw_password = 'ramu123'
    name = 'Ramu'
    blocks = '["P","Q","R","S"]'
    
    hashed = bcrypt.hashpw(raw_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    try:
        cursor.execute("INSERT OR IGNORE INTO cleaners (employee_id, password, name, assigned_blocks) VALUES (?, ?, ?, ?)", 
                       (emp_id, hashed, name, blocks))
        conn.commit()
        print(f"Cleaner {name} ({emp_id}) added/verified successfully.")
        
        # Verify
        cleaner = cursor.execute("SELECT * FROM cleaners WHERE employee_id='RAMU'").fetchone()
        print("Database Record:", cleaner)
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_cleaner()
