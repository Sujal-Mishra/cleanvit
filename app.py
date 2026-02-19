from flask import Flask, jsonify, request, send_from_directory, render_template, g
import os
import io
import base64
import jwt
import datetime
import uuid
import qrcode
import json
from functools import wraps
from supabase import create_client, Client
from dotenv import load_dotenv

# Try import bcrypt
try:
    import bcrypt
    HAS_BCRYPT = True
except ImportError:
    HAS_BCRYPT = False
    from werkzeug.security import generate_password_hash, check_password_hash

# ----------------- CONFIGURATION -----------------
app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = 'cleanvit_secret_key_2024_vitvellore'

# Load environment variables (Create a .env file locally)
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Initialize Supabase Client
supabase: Client = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Connected to Supabase!")
    except Exception as e:
        print(f"Failed to connect to Supabase: {e}")
else:
    print("WARNING: SUPABASE_URL and SUPABASE_KEY must be set in Environment Variables or .env file.")

# ----------------- HELPERS -----------------

def hash_password(password):
    if HAS_BCRYPT:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    else:
        return generate_password_hash(password)

def verify_password(password, hashed):
    if HAS_BCRYPT:
        if isinstance(hashed, str):
            hashed = hashed.encode('utf-8')
        return bcrypt.checkpw(password.encode('utf-8'), hashed)
    else:
        return check_password_hash(hashed, password)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            parts = request.headers['Authorization'].split(" ")
            if len(parts) > 1:
                token = parts[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, app.secret_key, algorithms=["HS256"])
            g.current_user = data
        except Exception as e:
            return jsonify({'message': 'Token is invalid!'}), 403
        
        return f(*args, **kwargs)
    return decorated

# ----------------- ROUTES -----------------

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/student')
def student_page():
    return render_template('student.html', supabase_url=SUPABASE_URL, supabase_key=SUPABASE_KEY)

@app.route('/cleaner')
def cleaner_page():
    return render_template('cleaner.html')

@app.route('/admin')
def admin_page():
    return render_template('admin.html')

# ----------------- AUTH API -----------------

@app.route('/api/auth/student/signup-direct', methods=['POST'])
def student_signup_direct():
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    
    data = request.json
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    block = data.get('block')
    room_number = data.get('roomNumber')

    if not email or not email.endswith('@vitstudent.ac.in'):
        return jsonify({'error': 'Please use a valid VIT email address'}), 400
        
    # Check if user exists
    existing = supabase.table('users').select('id').eq('email', email).execute()
    if existing.data:
        return jsonify({'error': 'Email already registered'}), 400
    
    hashed = hash_password(password)
    group_no = f"{block}-{room_number}"
    
    try:
        # Create User
        user_res = supabase.table('users').insert({
            'email': email,
            'password': hashed,
            'name': name,
            'block': block,
            'room_number': room_number,
            'group_no': group_no,
            'role': 'student'
        }).execute()
        
        return jsonify({'message': 'Account created successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Legacy OTP routes kept but not used by new frontend
@app.route('/api/auth/student/signup', methods=['POST'])
def student_signup_otp():
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    
    data = request.json
    email = data.get('email')
    
    if not email or not email.endswith('@vitstudent.ac.in'):
        return jsonify({'error': 'Please use a valid VIT email address'}), 400
        
    # Check if user exists
    existing = supabase.table('users').select('id').eq('email', email).execute()
    if existing.data:
        return jsonify({'error': 'Email already registered'}), 400
        
    otp = str(uuid.uuid4().int)[:6]
    # Use timezone aware current time if possible, or ISO string
    expires_at = (datetime.datetime.utcnow() + datetime.timedelta(minutes=10)).isoformat()
    
    supabase.table('otps').insert({
        'email': email,
        'otp': otp,
        'expires_at': expires_at,
        'used':False
    }).execute()
    
    return jsonify({'message': 'OTP sent', 'otp': otp})

@app.route('/api/auth/student/verify-otp', methods=['POST'])
def student_verify_signup():
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    
    data = request.json
    otp = data.get('otp')
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    block = data.get('block')
    room_number = data.get('roomNumber')

    # Find valid OTP
    res = supabase.table('otps').select('*').eq('email', email).eq('otp', otp).eq('used', False).order('created_at', desc=True).limit(1).execute()
    
    if not res.data:
         return jsonify({'error': 'Invalid or expired OTP'}), 400
    
    otp_record = res.data[0]
    
    hashed = hash_password(password)
    group_no = f"{block}-{room_number}"
    
    try:
        # Create User
        user_res = supabase.table('users').insert({
            'email': email,
            'password': hashed,
            'name': name,
            'block': block,
            'room_number': room_number,
            'group_no': group_no,
            'role': 'student'
        }).execute()
        
        # Mark OTP used
        supabase.table('otps').update({'used': True}).eq('id', otp_record['id']).execute()
        
        return jsonify({'message': 'Account created successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/config')
def get_config():
    return jsonify({
        'supabaseUrl': SUPABASE_URL,
        'supabaseKey': SUPABASE_KEY
    })

@app.route('/api/auth/student/google-check', methods=['POST'])
def google_check():
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    
    data = request.json
    email = data.get('email')
    
    if not email or not email.endswith('@vitstudent.ac.in'):
        return jsonify({'error': 'Please use a valid VIT email address'}), 400

    # Check if user exists in our local users table
    res = supabase.table('users').select('*').eq('email', email).execute()
    
    if not res.data:
        # User auth'd with Google but not in our DB -> Needs profile
        return jsonify({'status': 'profile_required'})
    
    user = res.data[0]
    
    # User exists, generate token
    token = jwt.encode({
        'id': user['id'],
        'email': user['email'],
        'role': 'student',
        'block': user['block'],
        'roomNumber': user['room_number'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, app.secret_key, algorithm="HS256")
    
    return jsonify({
        'status': 'success',
        'token': token,
        'user': {
            'id': user['id'], 
            'email': user['email'], 
            'name': user['name'],
            'block': user['block'], 
            'roomNumber': user['room_number']
        }
    })

@app.route('/api/auth/student/google-register', methods=['POST'])
def google_register():
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    
    data = request.json
    email = data.get('email')
    name = data.get('name')
    block = data.get('block')
    room_number = data.get('roomNumber')
    
    if not email or not email.endswith('@vitstudent.ac.in'):
        return jsonify({'error': 'Please use a valid VIT email address'}), 400
        
    group_no = f"{block}-{room_number}"
    
    try:
        # Create User - password is None/Empty for Google users if we want, or a dummy one
        dummy_pass = str(uuid.uuid4())
        hashed = hash_password(dummy_pass)
        
        user_res = supabase.table('users').insert({
            'email': email,
            'password': hashed, 
            'name': name,
            'block': block,
            'room_number': room_number,
            'group_no': group_no,
            'role': 'student'
        }).execute()
        
        # Now login
        try:
             # Depending on supabase-py version, insert might return data or we query it
            res = supabase.table('users').select('*').eq('email', email).execute()
            user = res.data[0]
        except:
             # Fallback if insert returns data directly (it should)
             user = user_res.data[0]

        token = jwt.encode({
            'id': user['id'],
            'email': user['email'],
            'role': 'student',
            'block': user['block'],
            'roomNumber': user['room_number'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.secret_key, algorithm="HS256")
        
        return jsonify({
            'status': 'success',
            'token': token,
            'user': {
                'id': user['id'], 
                'email': user['email'], 
                'name': user['name'],
                'block': user['block'], 
                'roomNumber': user['room_number']
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/student/login', methods=['POST'])
def student_login():
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    res = supabase.table('users').select('*').eq('email', email).execute()
    if not res.data:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    user = res.data[0]
    
    if not verify_password(password, user['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
        
    token = jwt.encode({
        'id': user['id'],
        'email': user['email'],
        'role': 'student',
        'block': user['block'],
        'roomNumber': user['room_number'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, app.secret_key, algorithm="HS256")
    
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'], 
            'email': user['email'], 
            'name': user['name'],
            'block': user['block'], 
            'roomNumber': user['room_number']
        }
    })

@app.route('/api/auth/cleaner/login', methods=['POST'])
def cleaner_login():
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    
    data = request.json
    emp_id = data.get('employeeId')
    password = data.get('password')
    
    res = supabase.table('cleaners').select('*').eq('employee_id', emp_id).eq('is_active', True).execute()
    
    if not res.data:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    cleaner = res.data[0]
    
    if not verify_password(password, cleaner['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
        
    try:
        blocks = json.loads(cleaner['assigned_blocks'])
    except:
        blocks = []
        
    token = jwt.encode({
        'id': cleaner['id'],
        'employeeId': cleaner['employee_id'],
        'role': 'cleaner',
        'blocks': blocks,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, app.secret_key, algorithm="HS256")
    
    return jsonify({
        'token': token,
        'cleaner': {'id': cleaner['id'], 'name': cleaner['name'], 'blocks': blocks}
    })

@app.route('/api/auth/admin/login', methods=['POST'])
def admin_login():
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    res = supabase.table('admins').select('*').eq('username', username).execute()
    
    if not res.data:
        return jsonify({'error': 'Invalid credentials'}), 401
        
    admin = res.data[0]
    if not verify_password(password, admin['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
        
    token = jwt.encode({
        'id': admin['id'],
        'username': admin['username'],
        'role': 'admin',
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, app.secret_key, algorithm="HS256")
    
    return jsonify({'token': token, 'admin': {'username': admin['username']}})

# ----------------- REQUESTS API -----------------

@app.route('/api/requests', methods=['POST'])
@token_required
def create_request():
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    if g.current_user['role'] != 'student':
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.json
    req_type = data.get('type')
    instructions = data.get('instructions')
    
    req_id = f"REQ-{str(uuid.uuid4())[:8].upper()}"
    
    # Generate QR
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(req_id)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf)
    qr_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    qr_data_url = f"data:image/png;base64,{qr_b64}"
    
    # Get user details for redundant storage (optional, but good for quick access)
    user_res = supabase.table('users').select('*').eq('id', g.current_user['id']).execute()
    user = user_res.data[0]
    
    supabase.table('requests').insert({
        'request_id': req_id,
        'user_id': user['id'],
        'block': user['block'],
        'room_number': user['room_number'],
        'group_no': user['group_no'],
        'type': req_type,
        'instructions': instructions,
        'qr_code': qr_data_url,
        'status': 'pending'
    }).execute()
    
    return jsonify({'message': 'Request created', 'qrCode': qr_data_url})

@app.route('/api/requests', methods=['GET'])
@token_required
def get_requests():
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    
    if g.current_user['role'] == 'student':
        # Get group
        user_res = supabase.table('users').select('group_no').eq('id', g.current_user['id']).execute()
        group_no = user_res.data[0]['group_no'] if user_res.data else None
        
        query = supabase.table('requests').select('*').order('created_at', desc=True)
        if group_no:
            query = query.eq('group_no', group_no)
        else:
            query = query.eq('user_id', g.current_user['id'])
            
        res = query.execute()
        return jsonify(res.data)
        
    elif g.current_user['role'] == 'cleaner':
        # Cleaners see accepted/completed
        # We need to join users to get student name. Supabase-py syntax:
        # .select('*, users(name)')
        res = supabase.table('requests').select('*, users(name)').eq('cleaner_id', g.current_user['id']).in_('status', ['in_progress', 'accepted', 'completed']).order('accepted_at', desc=True).execute()
        
        # Flatten structure if needed by frontend (frontend expects student_name, not users.name)
        # Or update frontend. Let's map it here to match previous API response structure
        result = []
        for r in res.data:
            item = r.copy()
            if r.get('users'):
                item['student_name'] = r['users'].get('name')
            result.append(item)
            
        return jsonify(result)
    else:
        return jsonify([])

@app.route('/api/requests/pending', methods=['GET'])
@token_required
def get_pending_requests():
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    if g.current_user['role'] != 'cleaner': return jsonify({'error': 'Unauthorized'}), 403
        
    blocks = g.current_user.get('blocks', [])
    if not blocks: return jsonify([])
        
    # Supabase "in" filter for blocks
    res = supabase.table('requests').select('*, users(name)').eq('status', 'pending').in_('block', blocks).order('created_at', desc=False).execute()
    
    result = []
    for r in res.data:
        item = r.copy()
        if r.get('users'):
            item['student_name'] = r['users'].get('name')
        result.append(item)
        
    return jsonify(result)

@app.route('/api/requests/<int:req_id>/accept', methods=['PUT'])
@token_required
def accept_request(req_id):
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    if g.current_user['role'] != 'cleaner': return jsonify({'error': 'Unauthorized'}), 403
        
    supabase.table('requests').update({
        'status': 'in_progress',
        'cleaner_id': g.current_user['id'],
        'accepted_at': datetime.datetime.utcnow().isoformat()
    }).eq('id', req_id).execute()
    
    return jsonify({'message': 'Accepted'})

@app.route('/api/requests/<int:req_id>/complete', methods=['PUT'])
@token_required
def complete_request(req_id):
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    if g.current_user['role'] != 'cleaner': return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.json
    qr_data = data.get('qrData')
    
    # Verify QR
    res = supabase.table('requests').select('request_id').eq('id', req_id).execute()
    if not res.data or res.data[0]['request_id'] != qr_data:
        return jsonify({'error': 'Invalid QR Code'}), 400
        
    supabase.table('requests').update({
        'status': 'completed',
        'completed_at': datetime.datetime.utcnow().isoformat()
    }).eq('id', req_id).execute()
    
    return jsonify({'message': 'Completed'})

@app.route('/api/requests/<int:req_id>/rate', methods=['PUT'])
@token_required
def rate_request(req_id):
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    if g.current_user['role'] != 'student': return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.json
    supabase.table('requests').update({
        'rating': data.get('rating'),
        'feedback': data.get('feedback')
    }).eq('id', req_id).execute()
    
    return jsonify({'message': 'Rating submitted'})

@app.route('/api/student/roommates', methods=['GET'])
@token_required
def get_roommates():
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    if g.current_user['role'] != 'student': return jsonify([])
        
    user_res = supabase.table('users').select('group_no').eq('id', g.current_user['id']).execute()
    if not user_res.data: return jsonify([])
    group_no = user_res.data[0]['group_no']
    
    if not group_no: return jsonify([])
    
    res = supabase.table('users').select('name, email').eq('group_no', group_no).execute()
    return jsonify(res.data)

@app.route('/api/admin/stats', methods=['GET'])
@token_required
def get_stats():
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    if g.current_user['role'] != 'admin': return jsonify({'error': 'Unauthorized'}), 403
    
    # 1. Basic Counts
    total = supabase.table('requests').select('*', count='exact', head=True).execute().count
    pending = supabase.table('requests').select('*', count='exact', head=True).eq('status', 'pending').execute().count
    completed = supabase.table('requests').select('*', count='exact', head=True).eq('status', 'completed').execute().count
    
    # 2. Block-wise request counts
    # Supabase doesn't support GROUP BY directly in the client easily for counts in one go without RPC.
    # We'll fetch all requests (lightweight if we select only 'block') and aggregate in Python.
    # Ideally use a SQL view or RPC for large datasets.
    all_reqs = supabase.table('requests').select('block').execute()
    block_counts = {}
    for r in all_reqs.data:
        b = r['block']
        block_counts[b] = block_counts.get(b, 0) + 1
        
    # Format for chart: labels and data
    blocks_chart = {
        'labels': list(block_counts.keys()),
        'data': list(block_counts.values())
    }
    
    # 3. Recent Reviews
    reviews_res = supabase.table('requests').select('rating, feedback, users(name), cleaners(name), completed_at').not_.is_('rating', 'null').order('completed_at', desc=True).limit(5).execute()
    
    reviews = []
    for r in reviews_res.data:
        reviews.append({
            'student': r['users']['name'] if r.get('users') else 'Unknown',
            'cleaner': r['cleaners']['name'] if r.get('cleaners') else 'Unknown',
            'rating': r['rating'],
            'feedback': r['feedback'],
            'date': r['completed_at']
        })
    
    return jsonify({
        'totalRequests': total,
        'pendingRequests': pending,
        'completedRequests': completed,
        'blockStats': blocks_chart,
        'recentReviews': reviews
    })

@app.route('/api/admin/cleaners', methods=['GET'])
@token_required
def get_cleaners():
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    if g.current_user['role'] != 'admin': return jsonify({'error': 'Unauthorized'}), 403
    
    res = supabase.table('cleaners').select('*').order('created_at', desc=True).execute()
    return jsonify(res.data)

@app.route('/api/admin/cleaners', methods=['POST'])
@token_required
def add_cleaner():
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    if g.current_user['role'] != 'admin': return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    emp_id = data.get('employeeId')
    name = data.get('name')
    password = data.get('password')
    blocks = data.get('blocks') # Expecting a list ["A", "B"]
    
    if not emp_id or not name or not password:
        return jsonify({'error': 'Missing required fields'}), 400
        
    hashed = hash_password(password)
    blocks_json = json.dumps(blocks) if blocks else '[]'
    
    try:
        supabase.table('cleaners').insert({
            'employee_id': emp_id,
            'name': name,
            'password': hashed,
            'assigned_blocks': blocks_json,
            'is_active': True
        }).execute()
        return jsonify({'message': 'Cleaner added successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/admin/cleaners/<int:id>/stats', methods=['GET'])
@token_required
def get_cleaner_stats(id):
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    if g.current_user['role'] != 'admin': return jsonify({'error': 'Unauthorized'}), 403
    
    # 1. Get Cleaner Details
    cleaner_res = supabase.table('cleaners').select('*').eq('id', id).execute()
    if not cleaner_res.data:
        return jsonify({'error': 'Cleaner not found'}), 404
    cleaner = cleaner_res.data[0]
    
    # 2. Get Completed Requests Count
    completed_res = supabase.table('requests').select('*', count='exact', head=True).eq('cleaner_id', id).eq('status', 'completed').execute()
    total_cleaned = completed_res.count
    
    # 3. Calculate Average Rating
    # Fetch ratings (not null)
    ratings_res = supabase.table('requests').select('rating').eq('cleaner_id', id).not_.is_('rating', 'null').execute()
    ratings = [r['rating'] for r in ratings_res.data]
    avg_rating = sum(ratings) / len(ratings) if ratings else 0
    
    # 4. Recent History (Last 5 jobs) with student names
    # Note: Supabase-py join syntax: select('*, users(name)')
    history_res = supabase.table('requests').select('id, type, completed_at, rating, users(name, room_number)').eq('cleaner_id', id).eq('status', 'completed').order('completed_at', desc=True).limit(5).execute()
    
    history = []
    for h in history_res.data:
        history.append({
            'id': h['id'],
            'type': h['type'],
            'date': h['completed_at'],
            'rating': h['rating'],
            'student': h['users']['name'] if h.get('users') else 'Unknown',
            'room': h['users']['room_number'] if h.get('users') else 'Unknown',
        })
        
    return jsonify({
        'cleaner': {
            'name': cleaner['name'],
            'employeeId': cleaner['employee_id'],
            'blocks': json.loads(cleaner['assigned_blocks']) if cleaner.get('assigned_blocks') else []
        },
        'stats': {
            'totalCleaned': total_cleaned,
            'avgRating': round(avg_rating, 1),
            'ratingCount': len(ratings)
        },
        'history': history
    })

# Try imports for QR decoding
HAS_CV2 = False
HAS_PYZBAR = False

try:
    import cv2
    import numpy as np
    HAS_CV2 = True
except ImportError as e:
    print(f"Warning: OpenCV (cv2) not found: {e}")

try:
    from pyzbar.pyzbar import decode
    HAS_PYZBAR = True
except Exception as e:
    print(f"Warning: Pyzbar not found or DLL missing: {e}")

@app.route('/api/requests/<id>/complete-scan', methods=['PUT'])
@token_required
def complete_job_scan(id):
    if not supabase: return jsonify({'error': 'Database not configured'}), 500
    if g.current_user['role'] != 'cleaner': return jsonify({'error': 'Unauthorized'}), 403

    if 'qr_image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
        
    file = request.files['qr_image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if not HAS_CV2 and not HAS_PYZBAR:
        return jsonify({'error': 'Server missing QR libraries'}), 500

    try:
        # Read image to numpy array
        filestr = file.read()
        npimg = np.frombuffer(filestr, np.uint8)
        
        if HAS_CV2:
            img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
        else:
            # Should not happen as we need cv2 to decode image to array for pyzbar usually, 
            # unless we use PIL. But we assumed cv2/numpy for image loading.
            # If HAS_CV2 is false, we can't easily load the image with this code.
            # So fallback: we really need cv2 for image loading in this implementation.
            return jsonify({'error': 'Server missing OpenCV for image processing'}), 500
        
        qr_data = None
        
        # 1. Try Pyzbar (Robust)
        if HAS_PYZBAR:
            try:
                decoded_objects = decode(img)
                if decoded_objects:
                    qr_data = decoded_objects[0].data.decode('utf-8')
            except Exception as e:
                print(f"Pyzbar scan error: {e}")
        
        # 2. Fallback to CV2 (Native)
        if not qr_data and HAS_CV2:
            try:
                detector = cv2.QRCodeDetector()
                data, _, _ = detector.detectAndDecode(img)
                if data:
                    qr_data = data
            except Exception as e:
                print(f"CV2 scan error: {e}")
        
        if not qr_data:
            return jsonify({'error': 'No QR code found in image'}), 400
            
        # Verify
        req_res = supabase.table('requests').select('*').eq('id', id).execute()
        if not req_res.data:
            return jsonify({'error': 'Request not found'}), 404
            
        request_obj = req_res.data[0]
        
        # The QR code contains the 'request_id' field (e.g., REQ-XXXX)
        if qr_data != request_obj['request_id']:
             return jsonify({'error': f'Invalid QR Code Scanned: {qr_data}'}), 400
             
        if request_obj['status'] != 'in_progress':
             return jsonify({'error': 'Request is not in progress'}), 400
             
        # valid -> complete
        supabase.table('requests').update({
            'status': 'completed',
            'completed_at': datetime.datetime.utcnow().isoformat(),
            'completed_by': g.current_user['id']
        }).eq('id', id).execute()
        
        return jsonify({'message': 'Job verified and completed'})
        
    except Exception as e:
        print(f"QR Scan Error: {e}")
        return jsonify({'error': f'Failed to process image: {str(e)}'}), 500

if __name__ == '__main__':
    if not SUPABASE_URL:
        print("""
        ========================= IMPROTANT =========================
        Supabase URL/Key missing! 
        Please create a .env file with:
        SUPABASE_URL=...
        SUPABASE_KEY=...
        =============================================================
        """)
    app.run(debug=True, port=5000)
