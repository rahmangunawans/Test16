from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from functools import wraps
from models import db, Content, Episode, User, WatchHistory
from werkzeug.security import generate_password_hash
import logging

admin_bp = Blueprint('admin', __name__)

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Please login first.', 'error')
            return redirect(url_for('auth.login'))
        
        # Check admin status using email-based check
        is_admin = current_user.is_admin_user()
        
        if not is_admin:
            flash('Access denied. Admin privileges required.', 'error')
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/')
@admin_bp.route('/dashboard')
@admin_required
def admin_dashboard():
    try:
        # Get statistics with proper error handling
        total_users = db.session.query(User).count()
        total_content = db.session.query(Content).count()
        total_episodes = db.session.query(Episode).count()
        
        # Get VIP users count
        vip_users = db.session.query(User).filter(
            User.subscription_type.in_(['vip_monthly', 'vip_3month', 'vip_yearly'])
        ).count()
        
        # Recent content and users with error handling
        recent_content = db.session.query(Content).order_by(Content.created_at.desc()).limit(5).all()
        recent_users = db.session.query(User).order_by(User.created_at.desc()).limit(5).all()
        
        return render_template('admin/dashboard.html',
                             total_users=total_users,
                             total_content=total_content,
                             total_episodes=total_episodes,
                             vip_users=vip_users,
                             recent_content=recent_content,
                             recent_users=recent_users)
    except Exception as e:
        logging.error(f"Admin dashboard error: {str(e)}")
        flash(f'Dashboard loading error. Please contact administrator.', 'error')
        return redirect(url_for('index'))

@admin_bp.route('/admin/content')
@login_required
@admin_required
def admin_content():
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')
    
    query = Content.query
    if search:
        query = query.filter(Content.title.contains(search))
    
    content = query.order_by(Content.created_at.desc()).paginate(
        page=page, per_page=10, error_out=False)
    
    return render_template('admin/content.html', content=content, search=search)

@admin_bp.route('/admin/content/add', methods=['GET', 'POST'])
@login_required
@admin_required
def add_content():
    if request.method == 'POST':
        try:
            content = Content(
                title=request.form['title'],
                description=request.form['description'],
                genre=request.form['genre'],
                year=int(request.form['year']),
                rating=float(request.form['rating']),
                content_type=request.form['content_type'],
                thumbnail_url=request.form['thumbnail_url'],

                is_featured=bool(request.form.get('is_featured'))
            )
            db.session.add(content)
            db.session.commit()
            flash(f'Content "{content.title}" added successfully!', 'success')
            return redirect(url_for('admin.admin_content'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error adding content: {str(e)}', 'error')
    
    return render_template('admin/content_form.html')

@admin_bp.route('/admin/content/<int:content_id>/edit', methods=['GET', 'POST'])
@login_required
@admin_required
def edit_content(content_id):
    content = Content.query.get_or_404(content_id)
    
    if request.method == 'POST':
        try:
            content.title = request.form['title']
            content.description = request.form['description']
            content.genre = request.form['genre']
            content.year = int(request.form['year'])
            content.rating = float(request.form['rating'])
            content.content_type = request.form['content_type']
            content.thumbnail_url = request.form['thumbnail_url']

            content.is_featured = bool(request.form.get('is_featured'))
            
            db.session.commit()
            flash(f'Content "{content.title}" updated successfully!', 'success')
            return redirect(url_for('admin.admin_content'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error updating content: {str(e)}', 'error')
    
    return render_template('admin/content_form.html', content=content)

@admin_bp.route('/admin/content/<int:content_id>/delete', methods=['POST'])
@login_required
@admin_required
def delete_content(content_id):
    content = Content.query.get_or_404(content_id)
    try:
        # Delete associated episodes and watch history
        Episode.query.filter_by(content_id=content_id).delete()
        WatchHistory.query.filter_by(content_id=content_id).delete()
        
        db.session.delete(content)
        db.session.commit()
        flash(f'Content "{content.title}" deleted successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting content: {str(e)}', 'error')
    
    return redirect(url_for('admin.admin_content'))

@admin_bp.route('/content/<int:content_id>/episodes')
@login_required
@admin_required
def manage_episodes(content_id):
    content = Content.query.get_or_404(content_id)
    episodes = Episode.query.filter_by(content_id=content_id).order_by(Episode.episode_number).all()
    return render_template('admin/episodes.html', content=content, episodes=episodes)

@admin_bp.route('/content/<int:content_id>/episodes/add', methods=['GET', 'POST'])
@login_required
@admin_required
def add_episode(content_id):
    content = Content.query.get_or_404(content_id)
    
    if request.method == 'POST':
        try:
            episode = Episode(
                content_id=content_id,
                episode_number=int(request.form['episode_number']),
                title=request.form['title'],
                duration=int(request.form['duration']),
                video_url=request.form['video_url'],
                thumbnail_url=request.form.get('thumbnail_url', ''),
                description=request.form.get('description', '')
            )
            db.session.add(episode)
            db.session.commit()
            flash(f'Episode {episode.episode_number} added successfully!', 'success')
            return redirect(url_for('admin.manage_episodes', content_id=content_id))
        except Exception as e:
            db.session.rollback()
            flash(f'Error adding episode: {str(e)}', 'error')
    
    return render_template('admin/episode_form.html', content=content)

@admin_bp.route('/episodes/<int:episode_id>/edit', methods=['GET', 'POST'])
@login_required
@admin_required
def edit_episode(episode_id):
    episode = Episode.query.get_or_404(episode_id)
    
    if request.method == 'POST':
        try:
            episode.episode_number = int(request.form['episode_number'])
            episode.title = request.form['title']
            episode.duration = int(request.form['duration'])
            episode.video_url = request.form['video_url']
            episode.thumbnail_url = request.form.get('thumbnail_url', '')
            episode.description = request.form.get('description', '')
            
            db.session.commit()
            flash(f'Episode {episode.episode_number} updated successfully!', 'success')
            return redirect(url_for('admin.manage_episodes', content_id=episode.content_id))
        except Exception as e:
            db.session.rollback()
            flash(f'Error updating episode: {str(e)}', 'error')
    
    return render_template('admin/episode_form.html', content=episode.content, episode=episode)

@admin_bp.route('/episodes/<int:episode_id>/delete', methods=['POST'])
@login_required
@admin_required
def delete_episode(episode_id):
    episode = Episode.query.get_or_404(episode_id)
    content_id = episode.content_id
    
    try:
        # Delete associated watch history
        WatchHistory.query.filter_by(episode_id=episode_id).delete()
        
        db.session.delete(episode)
        db.session.commit()
        flash(f'Episode {episode.episode_number} deleted successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting episode: {str(e)}', 'error')
    
    return redirect(url_for('admin.manage_episodes', content_id=content_id))

@admin_bp.route('/admin/users')
@login_required
@admin_required
def admin_users():
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')
    
    query = User.query
    if search:
        query = query.filter(User.email.contains(search))
    
    users = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=20, error_out=False)
    
    return render_template('admin/users.html', users=users, search=search)

@admin_bp.route('/users/<int:user_id>/toggle_admin', methods=['POST'])
@login_required
@admin_required
def toggle_admin(user_id):
    user = User.query.get_or_404(user_id)
    
    try:
        # Toggle admin status by changing email domain
        if user.is_admin():
            # Remove admin status by changing email if it has admin domain
            if '@admin.aniflix.com' in user.email:
                user.email = user.email.replace('@admin.aniflix.com', '@aniflix.com')
                status = "revoked"
            else:
                status = "revoked (email updated)"
        else:
            # Grant admin status by changing email domain
            if '@aniflix.com' in user.email:
                user.email = user.email.replace('@aniflix.com', '@admin.aniflix.com')
            elif '@' in user.email:
                domain = user.email.split('@')[1]
                user.email = user.email.replace(f'@{domain}', '@admin.aniflix.com')
            else:
                user.email = user.email + '@admin.aniflix.com'
            status = "granted"
        
        db.session.commit()
        flash(f'Admin privileges {status} for {user.email}', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error updating user: {str(e)}', 'error')
    
    return redirect(url_for('admin.admin_users'))

@admin_bp.route('/content/<int:content_id>/edit', methods=['GET', 'POST'])
@login_required
@admin_required
def edit_content_quick(content_id):
    content = Content.query.get_or_404(content_id)
    
    if request.method == 'POST':
        try:
            # Update content details
            content.title = request.form.get('title', content.title)
            content.description = request.form.get('description', content.description)
            content.genre = request.form.get('genre', content.genre)
            content.year = int(request.form.get('year', content.year))
            content.rating = float(request.form.get('rating', content.rating))
            content.thumbnail_url = request.form.get('thumbnail_url', content.thumbnail_url)

            content.is_featured = bool(request.form.get('is_featured'))
            
            db.session.commit()
            flash(f'Content "{content.title}" updated successfully!', 'success')
            return redirect(url_for('admin.admin_dashboard'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error updating content: {str(e)}', 'error')
    
    return render_template('admin/content_form.html', content=content)

@admin_bp.route('/episode/<int:episode_id>/edit', methods=['GET', 'POST'])
@login_required
@admin_required
def edit_episode_direct(episode_id):
    episode = Episode.query.get_or_404(episode_id)
    
    if request.method == 'POST':
        try:
            # Update episode details
            episode.title = request.form.get('title', episode.title)
            episode.episode_number = int(request.form.get('episode_number', episode.episode_number))
            episode.duration = int(request.form.get('duration', episode.duration))
            episode.video_url = request.form.get('video_url', episode.video_url)
            
            db.session.commit()
            flash(f'Episode "{episode.title}" updated successfully!', 'success')
            return redirect(url_for('admin.manage_episodes', content_id=episode.content_id))
        except Exception as e:
            db.session.rollback()
            flash(f'Error updating episode: {str(e)}', 'error')
    
    return render_template('admin/episode_form.html', content=episode.content, episode=episode)

@admin_bp.route('/users/<int:user_id>/edit', methods=['GET', 'POST'])
@login_required
@admin_required
def edit_user(user_id):
    user = User.query.get_or_404(user_id)
    
    if request.method == 'POST':
        try:
            # Update subscription type
            subscription_type = request.form.get('subscription_type')
            user.subscription_type = subscription_type
            
            # Update subscription expiry if VIP
            if subscription_type != 'free':
                from datetime import datetime, timedelta
                days_map = {
                    'vip_monthly': 30,
                    'vip_3month': 90,
                    'vip_yearly': 365
                }
                if subscription_type in days_map:
                    user.subscription_expires = datetime.utcnow() + timedelta(days=days_map[subscription_type])
            
            # Update max devices
            user.max_devices = 2 if subscription_type != 'free' else 1
            
            db.session.commit()
            flash(f'User {user.username} updated successfully!', 'success')
            return redirect(url_for('admin.admin_users'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error updating user: {str(e)}', 'error')
    
    return render_template('admin/user_form.html', user=user)



@admin_bp.route('/users/<int:user_id>/delete', methods=['POST'])
@login_required
@admin_required
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    
    # Prevent deleting current admin user
    if user.id == current_user.id:
        flash('You cannot delete your own account', 'error')
        return redirect(url_for('admin.admin_users'))
    
    try:
        # Delete associated data
        WatchHistory.query.filter_by(user_id=user_id).delete()
        
        db.session.delete(user)
        db.session.commit()
        flash(f'User {user.email} deleted successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting user: {str(e)}', 'error')
    
    return redirect(url_for('admin.admin_users'))

@admin_bp.route('/admin/analytics')
@login_required
@admin_required
def admin_analytics():
    # Get viewing statistics
    popular_content = db.session.query(
        Content.title,
        db.func.count(WatchHistory.id).label('views')
    ).join(WatchHistory).group_by(Content.id, Content.title).order_by(
        db.func.count(WatchHistory.id).desc()
    ).limit(10).all()
    
    # Completion rates
    completion_stats = db.session.query(
        WatchHistory.status,
        db.func.count(WatchHistory.id).label('count')
    ).group_by(WatchHistory.status).all()
    
    # User statistics
    total_users = User.query.count()
    vip_users = User.query.filter(User.subscription_type != 'free').count()
    
    # Content statistics
    total_content = Content.query.count()
    anime_count = Content.query.filter_by(content_type='anime').count()
    movie_count = Content.query.filter_by(content_type='movie').count()
    
    return render_template('admin/analytics.html',
                         popular_content=popular_content,
                         completion_stats=completion_stats,
                         total_users=total_users,
                         vip_users=vip_users,
                         total_content=total_content,
                         anime_count=anime_count,
                         movie_count=movie_count)

@admin_bp.route('/vip-management')
@admin_required
def vip_management():
    """VIP user management page"""
    vip_users = User.query.filter(
        User.subscription_type.in_(['vip_monthly', 'vip_3month', 'vip_yearly'])
    ).order_by(User.subscription_expires.desc()).all()
    
    return render_template('admin/vip_management.html', vip_users=vip_users)

@admin_bp.route('/user/<int:user_id>/edit-details', methods=['GET', 'POST'])
@admin_required
def edit_user_details(user_id):
    """Edit user details including VIP status"""
    user = User.query.get_or_404(user_id)
    
    if request.method == 'POST':
        try:
            user.username = request.form.get('username', user.username)
            user.email = request.form.get('email', user.email)
            user.subscription_type = request.form.get('subscription_type', user.subscription_type)
            
            # Handle VIP expiration
            if request.form.get('subscription_expires'):
                from datetime import datetime
                user.subscription_expires = datetime.strptime(
                    request.form.get('subscription_expires'), '%Y-%m-%d'
                )
            else:
                user.subscription_expires = None
            
            # Reset password if provided
            if request.form.get('new_password'):
                user.password_hash = generate_password_hash(request.form.get('new_password'))
            
            db.session.commit()
            flash(f'User {user.username} updated successfully!', 'success')
            return redirect(url_for('admin.admin_users'))
            
        except Exception as e:
            db.session.rollback()
            flash(f'Error updating user: {str(e)}', 'error')
            logging.error(f"Error updating user {user_id}: {e}")
    
    return render_template('admin/edit_user.html', user=user)

@admin_bp.route('/user/<int:user_id>/remove', methods=['POST'])
@admin_required
def remove_user(user_id):
    """Delete user account"""
    user = User.query.get_or_404(user_id)
    
    # Prevent deletion of current admin
    if user.id == current_user.id:
        flash('Cannot delete your own account!', 'error')
        return redirect(url_for('admin.admin_users'))
    
    try:
        username = user.username
        db.session.delete(user)
        db.session.commit()
        flash(f'User {username} deleted successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting user: {str(e)}', 'error')
        logging.error(f"Error deleting user {user_id}: {e}")
    
    return redirect(url_for('admin.admin_users'))

@admin_bp.route('/user/<int:user_id>/toggle-vip', methods=['POST'])
@admin_required
def toggle_vip(user_id):
    """Quick toggle VIP status"""
    user = User.query.get_or_404(user_id)
    
    try:
        if user.subscription_type == 'free':
            user.subscription_type = 'vip_monthly'
            from datetime import datetime, timedelta
            user.subscription_expires = datetime.utcnow() + timedelta(days=30)
            flash(f'User {user.username} upgraded to VIP!', 'success')
        else:
            user.subscription_type = 'free'
            user.subscription_expires = None
            flash(f'User {user.username} downgraded to Free!', 'success')
        
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        flash(f'Error updating VIP status: {str(e)}', 'error')
        logging.error(f"Error toggling VIP for user {user_id}: {e}")
    
    return redirect(url_for('admin.admin_users'))