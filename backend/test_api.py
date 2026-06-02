import os
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['SECRET_KEY'] = 'test_secret'
os.environ['JWT_SECRET_KEY'] = 'test_jwt_secret'

import unittest
import json
from run import create_app
from app.config.extensions import db
from app.models.user import User

class CloudSentinelAPITestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.client = self.app.test_client()
        
        with self.app.app_context():
            db.create_all()
            
    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
            
    def test_health_check(self):
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'healthy')
        
    def test_auth_flow(self):
        # 1. Register User
        payload = {
            "username": "testuser",
            "email": "test@test.com",
            "password": "password123"
        }
        response = self.client.post('/auth/register', 
                                    data=json.dumps(payload),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 200)
        
        # 2. Login User
        login_payload = {
            "email": "test@test.com",
            "password": "password123"
        }
        response = self.client.post('/auth/login',
                                    data=json.dumps(login_payload),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('token', data)
        self.assertEqual(data['username'], 'testuser')

if __name__ == '__main__':
    unittest.main()
