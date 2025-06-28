from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash
from flask_login import login_required, current_user
from models import Content, Episode, WatchHistory
from app import db
import logging

content_bp = Blueprint('content', __name__)

@content_bp.route('/movies')
def movies_list():
    page = request.args.get('page', 1, type=int)
    genre = request.args.get('genre')
    search = request.args.get('search')
    
    query = Content.query.filter_by(content_type='movie')
    
    if genre:
        query = query.filter(Content.genre.contains(genre))
    
    if search:
        query = query.filter(Content.title.contains(search))
    
    movies_list = query.order_by(Content.created_at.desc()).paginate(
        page=page, per_page=12, error_out=False
    )
    
    return render_template('movies_list.html', movies_list=movies_list, genre=genre, search=search)

@content_bp.route('/genres')
def genres():
    # Get all unique genres
    genres = db.session.query(Content.genre).distinct().all()
    genre_list = []
    for g in genres:
        if g[0]:
            # Split genres by comma and add to list
            for genre in g[0].split(','):
                clean_genre = genre.strip()
                if clean_genre and clean_genre not in genre_list:
                    genre_list.append(clean_genre)
    
    genre_list.sort()
    return render_template('genres.html', genres=genre_list)

@content_bp.route('/genre/<genre_name>')
def genre_content(genre_name):
    page = request.args.get('page', 1, type=int)
    
    content_list = Content.query.filter(Content.genre.contains(genre_name)).order_by(
        Content.created_at.desc()).paginate(page=page, per_page=12, error_out=False)
    
    return render_template('genre_content.html', content_list=content_list, genre_name=genre_name)

@content_bp.route('/anime')
def anime_list():
    page = request.args.get('page', 1, type=int)
    genre = request.args.get('genre')
    search = request.args.get('search')
    
    query = Content.query.filter_by(content_type='anime')
    
    if genre:
        query = query.filter(Content.genre.contains(genre))
    
    if search:
        query = query.filter(Content.title.contains(search))
    
    anime_list = query.order_by(Content.created_at.desc()).paginate(
        page=page, per_page=12, error_out=False
    )
    
    return render_template('anime_list.html', anime_list=anime_list, genre=genre, search=search)

@content_bp.route('/anime/<int:content_id>')
def anime_detail(content_id):
    anime = Content.query.get_or_404(content_id)
    episodes = Episode.query.filter_by(content_id=content_id).order_by(Episode.episode_number).all()
    
    # Get user's watch history if logged in
    user_progress = {}
    if current_user.is_authenticated:
        for episode in episodes:
            history = WatchHistory.query.filter_by(
                user_id=current_user.id,
                episode_id=episode.id
            ).first()
            if history:
                user_progress[episode.id] = {
                    'watch_time': history.watch_time,
                    'completed': history.completed
                }
    
    return render_template('anime_detail.html', anime=anime, episodes=episodes, user_progress=user_progress)

@content_bp.route('/watch/<int:episode_id>')
@login_required
def watch_episode(episode_id):
    episode = Episode.query.get_or_404(episode_id)
    content = episode.content
    
    # Check if user can watch this episode
    can_watch_full = current_user.can_watch_full_episode(episode.episode_number)
    max_watch_time = current_user.get_max_watch_time(episode.episode_number)
    
    # Get watch history
    watch_history = WatchHistory.query.filter_by(
        user_id=current_user.id,
        episode_id=episode_id
    ).first()
    
    if not watch_history:
        watch_history = WatchHistory(
            user_id=current_user.id,
            content_id=content.id,
            episode_id=episode_id
        )
        db.session.add(watch_history)
        db.session.commit()
    
    # Get similar anime (same genre)
    similar_anime = Content.query.filter(
        Content.genre.contains(content.genre.split(', ')[0]),
        Content.id != content.id,
        Content.content_type == 'anime'
    ).order_by(Content.rating.desc()).limit(6).all()
    
    # Get trending anime (highest rated recent content)
    trending_anime = Content.query.filter(
        Content.content_type == 'anime',
        Content.id != content.id
    ).order_by(Content.rating.desc()).limit(3).all()
    
    # Get recommended movies
    recommended_movies = Content.query.filter(
        Content.content_type == 'movie'
    ).order_by(Content.rating.desc()).limit(5).all()
    
    return render_template('video_player.html', 
                         episode=episode, 
                         content=content,
                         can_watch_full=can_watch_full,
                         max_watch_time=max_watch_time,
                         watch_history=watch_history,
                         similar_anime=similar_anime,
                         trending_anime=trending_anime,
                         recommended_movies=recommended_movies)



@content_bp.route('/api/update-progress', methods=['POST'])
@login_required
def update_watch_progress():
    data = request.get_json()
    episode_id = data.get('episode_id')
    watch_time = data.get('watch_time', 0)
    completed = data.get('completed', False)
    
    if not episode_id:
        return jsonify({'success': False, 'message': 'Episode ID required'})
    
    episode = Episode.query.get(episode_id)
    if not episode:
        return jsonify({'success': False, 'message': 'Episode not found'})
    
    # Check time limits for free users
    max_watch_time = current_user.get_max_watch_time(episode.episode_number)
    if max_watch_time and watch_time > max_watch_time * 60:  # Convert minutes to seconds
        return jsonify({'success': False, 'message': 'Watch time limit exceeded'})
    
    # Update or create watch history
    watch_history = WatchHistory.query.filter_by(
        user_id=current_user.id,
        episode_id=episode_id
    ).first()
    
    if not watch_history:
        watch_history = WatchHistory(
            user_id=current_user.id,
            content_id=episode.content_id,
            episode_id=episode_id
        )
        db.session.add(watch_history)
    
    watch_history.watch_time = watch_time
    watch_history.completed = completed
    watch_history.status = 'completed' if completed else 'on-going'
    watch_history.last_watched = db.func.now()
    
    try:
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        logging.error(f"Error updating watch progress: {e}")
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Failed to update progress'})

@content_bp.route('/search')
def search():
    query = request.args.get('q', '')
    if not query or len(query.strip()) < 2:
        return jsonify([])
    
    # Search in title, description, and genre with case-insensitive matching
    search_term = f"%{query.lower()}%"
    results = Content.query.filter(
        db.or_(
            db.func.lower(Content.title).like(search_term),
            db.func.lower(Content.description).like(search_term),
            db.func.lower(Content.genre).like(search_term)
        )
    ).order_by(Content.rating.desc()).limit(8).all()
    
    return jsonify([{
        'id': content.id,
        'title': content.title,
        'description': content.description[:100] + '...' if content.description and len(content.description) > 100 else content.description,
        'type': content.content_type,
        'genre': content.genre,
        'year': content.year,
        'rating': content.rating,
        'thumbnail': content.thumbnail_url,
        'url': url_for('content.anime_detail', content_id=content.id) if content.content_type == 'anime' else '#'
    } for content in results])

@content_bp.route('/api/search')
def api_search():
    """Real-time search API endpoint"""
    query = request.args.get('q', '').strip()
    if len(query) < 2:
        return jsonify({'results': [], 'total': 0})
    
    # Enhanced search with fuzzy matching
    search_term = f"%{query.lower()}%"
    
    # Primary search - exact matches get priority
    exact_results = Content.query.filter(
        db.func.lower(Content.title).like(search_term)
    ).order_by(Content.rating.desc()).limit(5).all()
    
    # Secondary search - broader matches
    broader_results = Content.query.filter(
        db.and_(
            ~Content.id.in_([r.id for r in exact_results]),
            db.or_(
                db.func.lower(Content.description).like(search_term),
                db.func.lower(Content.genre).like(search_term)
            )
        )
    ).order_by(Content.rating.desc()).limit(3).all()
    
    all_results = exact_results + broader_results
    
    return jsonify({
        'results': [{
            'id': content.id,
            'title': content.title,
            'description': content.description[:80] + '...' if content.description and len(content.description) > 80 else content.description,
            'type': content.content_type,
            'genre': content.genre,
            'year': content.year,
            'rating': content.rating,
            'thumbnail': content.thumbnail_url,
            'url': url_for('content.anime_detail', content_id=content.id) if content.content_type == 'anime' else '#',
            'episode_count': len(content.episodes) if content.episodes else 0
        } for content in all_results],
        'total': len(all_results),
        'query': query
    })
