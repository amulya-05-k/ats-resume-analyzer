import os
import warnings
from datetime import timedelta

_DEV_SECRET = 'dev-secret-key-change-in-production'
_DEV_JWT_SECRET = 'jwt-secret-key-change-in-production'


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', _DEV_SECRET)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///ats_analyzer.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', _DEV_JWT_SECRET)

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)

    @classmethod
    def validate_secrets(cls):
        if cls.SECRET_KEY == _DEV_SECRET or cls.JWT_SECRET_KEY == _DEV_JWT_SECRET:
            env = os.environ.get('FLASK_ENV', 'production')
            if env != 'development':
                warnings.warn(
                    'Default SECRET_KEY or JWT_SECRET_KEY in use. '
                    'Set SECRET_KEY and JWT_SECRET_KEY environment variables before deploying.',
                    stacklevel=2,
                )
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'pdf', 'docx', 'doc'}
