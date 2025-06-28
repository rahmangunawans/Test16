import os
import logging
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_required, current_user
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
login_manager = LoginManager()

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET") or "dev-secret-key-aniflix-2024"
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Disable caching for development
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configure the database - use Supabase PostgreSQL with proper password
supabase_password = os.environ.get("SUPABASE_PASSWORD")
if supabase_password:
    # Use Supabase with the correct password from environment
    supabase_url = f"postgresql://postgres.heotmyzuxabzfobirhnm:{supabase_password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
    app.config["SQLALCHEMY_DATABASE_URI"] = supabase_url
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
        "pool_reset_on_return": "commit",
        "connect_args": {
            "sslmode": "require",
            "connect_timeout": 30,
        }
    }
    logging.info(f"Using Supabase PostgreSQL database with URL: {supabase_url[:50]}...")
else:
    # Fallback to Replit's provided DATABASE_URL
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
    logging.info("Using Replit PostgreSQL database")

# Initialize extensions
db.init_app(app)
login_manager.init_app(app)
login_manager.login_view = 'auth.login'  # type: ignore
login_manager.login_message = 'Please log in to access this page.'

@login_manager.user_loader
def load_user(user_id):
    from models import User
    return User.query.get(int(user_id))

# Register blueprints
from auth import auth_bp
from content import content_bp
from subscription import subscription_bp
from admin import admin_bp

app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(content_bp)
app.register_blueprint(subscription_bp, url_prefix='/subscription')
app.register_blueprint(admin_bp, url_prefix='/admin')

with app.app_context():
    # Import models to ensure tables are created
    import models
    db.create_all()
    
    # Create sample content if database is empty
    from models import Content, Episode
    if not Content.query.first():
        # Sample anime content
        sample_anime = [
            {
                'title': 'Attack on Titan: Final Season',
                'description': 'The final battle for humanity begins as Eren Yeager\'s true plan is revealed.',
                'genre': 'Action, Drama, Fantasy',
                'year': 2023,
                'rating': 4.9,
                'content_type': 'anime',
                'thumbnail_url': 'https://via.placeholder.com/300x450/16213e/ffffff?text=Attack+on+Titan',
                'trailer_url': 'https://www.youtube.com/embed/SlNpRThS9t8',
                'is_featured': True,
                'episodes': [
                    {'episode_number': i, 'title': f'Episode {i}', 'duration': 24, 'video_url': f'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'} 
                    for i in range(1, 13)
                ]
            },
            {
                'title': 'Jujutsu Kaisen',
                'description': 'A boy swallows a cursed talisman and becomes possessed by a powerful curse.',
                'genre': 'Action, Supernatural, School',
                'year': 2021,
                'rating': 4.8,
                'content_type': 'anime',
                'thumbnail_url': 'https://via.placeholder.com/300x450/16213e/ffffff?text=Jujutsu+Kaisen',
                'trailer_url': 'https://www.youtube.com/embed/4A_X-Dvl2bw',
                'is_featured': True,
                'episodes': [
                    {'episode_number': i, 'title': f'Episode {i}', 'duration': 24, 'video_url': f'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'} 
                    for i in range(1, 25)
                ]
            },
            {
                'title': 'Demon Slayer',
                'description': 'A young boy becomes a demon slayer to save his sister and avenge his family.',
                'genre': 'Action, Historical, Supernatural',
                'year': 2019,
                'rating': 4.7,
                'content_type': 'anime',
                'thumbnail_url': 'https://via.placeholder.com/300x450/16213e/ffffff?text=Demon+Slayer',
                'trailer_url': 'https://www.youtube.com/embed/VQGCKyvzIM4',
                'is_featured': True,
                'episodes': [
                    {'episode_number': i, 'title': f'Episode {i}', 'duration': 24, 'video_url': f'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'} 
                    for i in range(1, 27)
                ]
            }
        ]
        
        for anime_data in sample_anime:
            episodes_data = anime_data.pop('episodes')
            anime = Content(**anime_data)
            db.session.add(anime)
            db.session.flush()  # Get the ID
            
            for ep_data in episodes_data:
                episode = Episode()
                episode.content_id = anime.id
                episode.episode_number = ep_data['episode_number']
                episode.title = ep_data['title']
                episode.duration = ep_data['duration']
                episode.video_url = ep_data['video_url']
                db.session.add(episode)
        
        db.session.commit()
        logging.info("Sample content created successfully")
        
        # Create sample watch history for existing users
        from models import User, WatchHistory
        import random
        from datetime import datetime, timedelta
        
        users = User.query.all()
        episodes = Episode.query.all()
        
        if episodes and users and not WatchHistory.query.first():
            logging.info("Creating sample watch history...")
            
            for user in users:
                # Create 5-15 watch history entries per user
                num_entries = random.randint(5, 15)
                selected_episodes = random.sample(episodes, min(num_entries, len(episodes)))
                
                for i, episode in enumerate(selected_episodes):
                    watch_history = WatchHistory()
                    watch_history.user_id = user.id
                    watch_history.content_id = episode.content_id
                    watch_history.episode_id = episode.id
                    
                    # Random watch time (0-100% of episode duration)
                    if episode.duration:
                        max_watch_time = episode.duration * 60  # Convert to seconds
                        watch_history.watch_time = random.randint(60, max_watch_time)
                        # Mark as completed if watched > 90%
                        watch_history.completed = watch_history.watch_time > (max_watch_time * 0.9)
                    else:
                        watch_history.watch_time = random.randint(300, 1800)  # 5-30 minutes
                        watch_history.completed = random.choice([True, False])
                    
                    # Random last watched time (within last 30 days)
                    days_ago = random.randint(0, 30)
                    watch_history.last_watched = datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(0, 23))
                    
                    watch_history.status = 'completed' if watch_history.completed else 'on-going'
                    
                    db.session.add(watch_history)
            
            db.session.commit()
            logging.info("Sample watch history created successfully")
        
        # Debug admin status for existing users
        from models import User
        admin_users = User.query.filter(User.email.contains('admin')).all()
        for user in admin_users:
            logging.info(f"Admin check - Email: {user.email}, Is Admin: {user.is_admin()}")

from flask import render_template, redirect, url_for
from flask_login import current_user

@app.route('/')
def index():
    from models import Content
    featured_content = Content.query.filter_by(is_featured=True).all()
    latest_content = Content.query.order_by(Content.created_at.desc()).limit(8).all()
    popular_content = Content.query.order_by(Content.rating.desc()).limit(8).all()
    return render_template('index.html', featured_content=featured_content, latest_content=latest_content, popular_content=popular_content)

@app.route('/dashboard')
@login_required
def dashboard():
    # Get user's watch history for dashboard
    from models import WatchHistory, Content, Episode
    from sqlalchemy import func
    
    # Get ongoing episodes (not completed)
    ongoing_episodes = WatchHistory.query.filter_by(
        user_id=current_user.id, 
        completed=False
    ).order_by(WatchHistory.last_watched.desc()).limit(6).all()
    
    # Get recent watch history
    recent_history = WatchHistory.query.filter_by(
        user_id=current_user.id
    ).order_by(WatchHistory.last_watched.desc()).limit(10).all()
    
    # Calculate statistics
    total_watched = WatchHistory.query.filter_by(user_id=current_user.id).count()
    
    completed_count = WatchHistory.query.filter_by(
        user_id=current_user.id, 
        completed=True
    ).count()
    
    # Calculate total watch time in hours
    watch_time_result = db.session.query(
        func.sum(WatchHistory.watch_time)
    ).filter_by(user_id=current_user.id).scalar()
    
    watch_hours = round((watch_time_result / 3600) if watch_time_result else 0, 1)
    
    return render_template('dashboard.html', 
                         ongoing_episodes=ongoing_episodes,
                         recent_history=recent_history,
                         total_watched=total_watched,
                         completed_count=completed_count,
                         watch_hours=watch_hours)

@app.route('/dashboard/search')
@login_required
def dashboard_search():
    from models import Content, Episode, WatchHistory
    from sqlalchemy import or_, desc, asc
    
    search_query = request.args.get('search', '').strip()
    genre_filter = request.args.get('genre', '').strip()
    status_filter = request.args.get('status', '').strip()
    sort_filter = request.args.get('sort', 'recent').strip()
    
    # Base query
    query = Content.query
    
    # Apply search filter
    if search_query:
        query = query.filter(
            or_(
                Content.title.ilike(f'%{search_query}%'),
                Content.description.ilike(f'%{search_query}%'),
                Content.genre.ilike(f'%{search_query}%')
            )
        )
    
    # Apply genre filter
    if genre_filter:
        query = query.filter(Content.genre.ilike(f'%{genre_filter}%'))
    
    # Get content
    content_list = query.all()
    
    # Process results with watch history
    results = []
    for content in content_list:
        # Get user's watch history for this content
        watch_history = WatchHistory.query.filter_by(
            user_id=current_user.id,
            content_id=content.id
        ).order_by(WatchHistory.last_watched.desc()).first()
        
        # Apply status filter
        if status_filter:
            if status_filter == 'ongoing' and (not watch_history or watch_history.completed):
                continue
            elif status_filter == 'completed' and (not watch_history or not watch_history.completed):
                continue
            elif status_filter == 'not-started' and watch_history:
                continue
        
        # Calculate progress
        progress = 0
        current_episode = 1
        if watch_history:
            current_episode = watch_history.episode.episode_number
            if watch_history.episode.duration:
                progress = (watch_history.watch_time / (watch_history.episode.duration * 60)) * 100
            else:
                progress = 100 if watch_history.completed else 50
        
        results.append({
            'id': content.id,
            'title': content.title,
            'genre': content.genre,
            'year': content.year,
            'thumbnail_url': content.thumbnail_url,
            'progress': progress,
            'current_episode': current_episode,
            'last_watched': watch_history.last_watched if watch_history else None,
            'completed': watch_history.completed if watch_history else False
        })
    
    # Apply sorting
    if sort_filter == 'recent':
        results.sort(key=lambda x: x['last_watched'] or datetime.min, reverse=True)
    elif sort_filter == 'rating':
        # Sort by content rating
        content_dict = {c.id: c for c in content_list}
        results.sort(key=lambda x: content_dict[x['id']].rating or 0, reverse=True)
    elif sort_filter == 'title':
        results.sort(key=lambda x: x['title'])
    elif sort_filter == 'year':
        results.sort(key=lambda x: x['year'] or 0, reverse=True)
    elif sort_filter == 'progress':
        results.sort(key=lambda x: x['progress'], reverse=True)
    
    return jsonify({'results': results[:20]})  # Limit to 20 results

@app.route('/api/watchlist/toggle/<int:anime_id>', methods=['POST'])
@login_required
def toggle_watchlist(anime_id):
    """Toggle anime in user's watchlist (placeholder for future feature)"""
    # This is a placeholder for watchlist functionality
    # You can implement actual watchlist logic here
    return jsonify({
        'success': True,
        'message': 'Watchlist feature coming soon!'
    })
