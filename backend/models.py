from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    analyses = db.relationship('Analysis', backref='user', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'created_at': self.created_at.isoformat(),
        }


class Analysis(db.Model):
    __tablename__ = 'analyses'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)
    job_title = db.Column(db.String(255))
    ats_score = db.Column(db.Float, nullable=False)
    semantic_score = db.Column(db.Float)
    keyword_score = db.Column(db.Float)
    matched_keywords = db.Column(db.Text, default='[]')   # JSON list
    missing_keywords = db.Column(db.Text, default='[]')   # JSON list
    suggestions = db.Column(db.Text, default='[]')        # JSON list
    resume_text = db.Column(db.Text)
    job_description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'filename': self.filename,
            'job_title': self.job_title,
            'ats_score': round(self.ats_score, 2),
            'semantic_score': round(self.semantic_score, 2) if self.semantic_score is not None else None,
            'keyword_score': round(self.keyword_score, 2) if self.keyword_score is not None else None,
            'matched_keywords': json.loads(self.matched_keywords) if self.matched_keywords else [],
            'missing_keywords': json.loads(self.missing_keywords) if self.missing_keywords else [],
            'suggestions': json.loads(self.suggestions) if self.suggestions else [],
            'created_at': self.created_at.isoformat(),
        }
