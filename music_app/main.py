from flask import Flask, render_template, request, url_for, redirect, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin, LoginManager, login_required, login_user, logout_user, current_user
import json
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret-key-goes-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///data.db'
db = SQLAlchemy()
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return db.get_or_404(User, user_id)

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(100))
    name = db.Column(db.String(100))
    likes = db.relationship('Like', backref='user')
    dislikes = db.relationship('Dislike', backref='user')

class Songs(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    song = db.Column(db.String)
    likes = db.relationship('Like', backref='songs')
    dislikes = db.relationship('Dislike', backref='songs')

class Like(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    song_id = db.Column(db.Integer, db.ForeignKey('songs.id'))

class Dislike(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    song_id = db.Column(db.Integer, db.ForeignKey('songs.id'))


with app.app_context():
    db.create_all()

@app.route('/')
def home():
    # with open("./static/js/music_list.js", "w") as my_file:
    #     playlist = str(sorted([[item.id, item.song] for item in Songs.query.all()], key=lambda x: x[1]))
    #     my_file.write('export const all_songs = ' + playlist)
    user = current_user.name if current_user.is_authenticated else None
    return render_template("index.html", name=user, logged_in=current_user.is_authenticated)


@app.route('/register', methods=["GET", "POST"])
def register():
    if request.method == "POST":
        email = request.form.get('email')
        result = db.session.execute(db.select(User).where(User.email == email))

        # Note, email in db is unique so will only have one result.
        user = result.scalar()
        if user:
            # User already exists
            flash("You've already signed up with that email, log in instead!")
            return redirect(url_for('login'))

        hash_and_salted_password = generate_password_hash(
            request.form.get('password'),
            method='pbkdf2:sha256',
            salt_length=8
        )
        new_user = User(
            email = email,
            password = hash_and_salted_password,
            name = request.form.get('name'),
        )
        # Add music
        # music_list = os.listdir(os.path.join(app.static_folder, 'music'))
        # for song in music_list:
        #     db.session.execute(db.select(Songs))
        #     db.session.add(Songs(song=song[:-4]))

        db.session.add(new_user)
        db.session.commit()
        login_user(new_user)
        return redirect(url_for("home"))

    return render_template("register.html", logged_in=current_user.is_authenticated)


@app.route('/login', methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get('email')
        password = request.form.get('password')

        result = db.session.execute(db.select(User).where(User.email == email))
        user = result.scalar()
        # Email doesn't exist or password incorrect.
        if not user:
            flash("That email does not exist, please try again.")
            return redirect(url_for('login'))
        elif not check_password_hash(user.password, password):
            flash('Password incorrect, please try again.')
            return redirect(url_for('login'))
        else:
            login_user(user)
            return redirect(url_for('home'))

    return render_template("login.html", logged_in=current_user.is_authenticated)


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))

@app.route('/likes', methods=["GET", "POST", "DELETE"])
@login_required
def like():
    if request.method == "POST":
        id = json.loads(request.data)
        db.session.execute(db.select(Like))
        new_like = Like(
            user_id = current_user.id,
            song_id = id
        )
        db.session.add(new_like)
        db.session.commit()
        return ('', 204)
    elif request.method == "DELETE":
        id = json.loads(request.data)
        Like.query.filter_by(song_id=id).delete()
        db.session.commit()
        return ('', 204)
    else: 
        data = [like.song_id for like in current_user.likes]
        return (data, 200)

@app.route('/dislikes', methods=["GET", "POST"])
@login_required
def dislike():
    if request.method == "POST":
        id = json.loads(request.data)
        db.session.execute(db.select(Dislike))
        new_dislike = Dislike(
            user_id = current_user.id,
            song_id = id
        )
        db.session.add(new_dislike)
        db.session.commit()
    return ([dislike.song_id for dislike in current_user.dislikes], 200)

if __name__ == "__main__":
    app.run(debug=True)
