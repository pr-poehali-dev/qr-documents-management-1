"""API для работы с базой данных"""
import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event, context):
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        params = event.get('queryStringParameters') or {}
        action = params.get('action', '')
        body = json.loads(event.get('body', '{}')) if event.get('body') else {}
        
        if action == 'get_users' and method == 'GET':
            cur.execute("SELECT id, name, phone, email, role, created_at, is_active FROM users WHERE is_active = true ORDER BY created_at DESC")
            users = cur.fetchall()
            return response(200, {'users': [dict(u) for u in users]})
        
        elif action == 'create_user' and method == 'POST':
            name = body.get('name')
            role = body.get('role')
            phone = body.get('phone')
            email = body.get('email')
            created_by = body.get('created_by')
            
            cur.execute(
                "INSERT INTO users (name, role, phone, email, created_by) VALUES (%s, %s, %s, %s, %s) RETURNING id, name, role",
                (name, role, phone, email, created_by)
            )
            user = cur.fetchone()
            conn.commit()
            return response(201, {'user': dict(user)})
        
        elif action == 'get_items' and method == 'GET':
            status = params.get('status', 'stored')
            cur.execute("SELECT * FROM items WHERE status = %s ORDER BY created_at DESC", (status,))
            items = cur.fetchall()
            return response(200, {'items': [dict(i) for i in items]})
        
        elif action == 'create_item' and method == 'POST':
            qr_number = body.get('qrNumber')
            cur.execute(
                """INSERT INTO items (qr_number, client_name, client_phone, client_email, 
                   item_description, department, deposit_amount, return_amount, 
                   deposit_date, expected_return_date, status) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) 
                   RETURNING *""",
                (qr_number, body['clientName'], body['clientPhone'], body.get('clientEmail'),
                 body['itemDescription'], body['department'], body['depositAmount'], 
                 body['returnAmount'], body['depositDate'], body['expectedReturnDate'], 'stored')
            )
            item = cur.fetchone()
            conn.commit()
            return response(201, {'item': dict(item)})
        
        elif action == 'return_item' and method == 'POST':
            qr_number = body.get('qrNumber')
            cur.execute(
                "UPDATE items SET status = 'returned', returned_date = CURRENT_TIMESTAMP WHERE qr_number = %s RETURNING *",
                (qr_number,)
            )
            item = cur.fetchone()
            conn.commit()
            if item:
                return response(200, {'item': dict(item)})
            else:
                return response(404, {'error': 'Item not found'})
        
        elif action == 'send_sms' and method == 'POST':
            cur.execute(
                "INSERT INTO sms_notifications (recipient_phone, message, item_id, sent_by) VALUES (%s, %s, %s, %s) RETURNING *",
                (body['phone'], body['message'], body.get('itemId'), body.get('sentBy'))
            )
            sms = cur.fetchone()
            conn.commit()
            return response(201, {'notification': dict(sms)})
        
        return response(404, {'error': 'Not found'})
        
    except Exception as e:
        return response(500, {'error': str(e)})
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

def response(status_code, data):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(data, default=str),
        'isBase64Encoded': False
    }