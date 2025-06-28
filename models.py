from datetime import datetime, timedelta
from app import db
from flask_login import UserMixin
from sqlalchemy.sql import func

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    subscription_type = db.Column(db.String(20), default='free')  # free, vip_monthly, vip_3month, vip_yearly
    subscription_expires = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # Relationships
    watch_history = db.relationship('WatchHistory', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def is_vip(self):
        return (self.subscription_type in ['vip_monthly', 'vip_3month', 'vip_yearly'] and 
                self.subscription_expires and self.subscription_expires > datetime.utcnow())
    
    def can_watch_full_episode(self, episode_number):
        if self.is_vip():
            return True
        return episode_number <= 5
    
    def get_max_watch_time(self, episode_number):
        """Returns max watch time in minutes for an episode"""
        if self.is_vip() or episode_number <= 5:
            return None  # No limit
        return 10  # 10 minutes for free users on episodes 6+
    
    def is_admin_user(self):
        """Check if user is admin based on email"""
        return (self.email.endswith('@admin.aniflix.com') or 
                'admin' in self.email.lower() or 
                self.email.startswith('admin@'))
    
    def is_admin(self):
        """Alias for is_admin_user for template compatibility"""
        return self.is_admin_user()

class Content(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    genre = db.Column(db.String(100))
    year = db.Column(db.Integer)
    rating = db.Column(db.Float, default=0.0)
    content_type = db.Column(db.String(20), default='anime')  # anime, movie
    thumbnail_url = db.Column(db.String(500))
    trailer_url = db.Column(db.String(500))
    is_featured = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    episodes = db.relationship('Episode', backref='content', lazy=True, cascade='all, delete-orphan')
    watch_history = db.relationship('WatchHistory', backref='content', lazy=True, cascade='all, delete-orphan')

class Episode(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content_id = db.Column(db.Integer, db.ForeignKey('content.id'), nullable=False)
    episode_number = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    duration = db.Column(db.Integer)  # Duration in minutes
    video_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    watch_history = db.relationship('WatchHistory', backref='episode', lazy=True, cascade='all, delete-orphan')

class WatchHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content_id = db.Column(db.Integer, db.ForeignKey('content.id'), nullable=False)
    episode_id = db.Column(db.Integer, db.ForeignKey('episode.id'), nullable=False)
    watch_time = db.Column(db.Integer, default=0)  # Watch time in seconds
    completed = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(20), default='on-going')  # on-going, completed
    last_watched = db.Column(db.DateTime, default=datetime.utcnow)

class Subscription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    stripe_session_id = db.Column(db.String(200))
    subscription_type = db.Column(db.String(20))  # vip_monthly, vip_3month, vip_yearly
    amount = db.Column(db.Float)
    status = db.Column(db.String(20), default='pending')  # pending, completed, failed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='subscriptions')
