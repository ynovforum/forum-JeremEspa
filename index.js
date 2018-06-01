const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const Sequelize = require('sequelize');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const db = new Sequelize('stack_overflow','root','',{
    host: 'localhost',
    dialect: 'mysql'
});

const COOKIE_SECRET = 'cookie secret';

const User = db.define('user', {
    name : { type: Sequelize.STRING } ,
    bio : { type: Sequelize.STRING } ,
    role : { type: Sequelize.ENUM('admin', 'utilisateur' ), defaultValue: 'utilisateur' } ,
    email : { type: Sequelize.STRING } ,
    password : { type: Sequelize.STRING }
});

const Post = db.define('post', {
    title: { type : Sequelize.STRING},
    content: { type: Sequelize.STRING},
    resolvedAt: { type: Sequelize.DATE},

});

const Comment = db.define('comment', {
    commentaire: { type: Sequelize.STRING },
});



db.sync().then(r => {
    console.log("DB SYNCED");
}).catch(e => {
    console.error(e);
});

app.set('view engine', 'pug');
app.use(bodyParser.urlencoded());

passport.use(new LocalStrategy((name, password, done) => {
    User
        .findOne({
            where: {name, password}
        }).then(function (user) {
        if (user) {
            return done(null, user)
        } else {
            return done(null, false, {
                message: 'Invalid credentials'
            });
        }
    })

        .catch(done);
}));


passport.serializeUser((user, cookieBuilder) => {
    cookieBuilder(null, user.email);
});

passport.deserializeUser((email, cb) => {
    console.log("AUTH ATTEMPT",email);

    User.findOne({
        where : { email }
    }).then(r => {
        if(r) return cb(null, r);
        else return cb(new Error("No user corresponding to the cookie's email address"));
    });
});

app.use(cookieParser(COOKIE_SECRET));

app.use(bodyParser.urlencoded({ extended: true }));

// Keep track of user sessions
app.use(session({
    secret: COOKIE_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));

app.get('/',(req,res) => {
    Post
        .sync()
        .then(() => {
            Post
                .findAll({include:[{model: Comment,include:[User]}, User ]})
                .then((posts) => {
                    console.log(posts);
                    res.render( 'stackoverflow', { posts, user : req.user});
                })
        })

});

app.get('/Overflow',(req,res) => {
    res.render('poste');
});

app.post('/Overflow', (req, res) => {
    const { title, content } = req.body;
    Post
        .sync()
        .then(() => Post.create({ title, content, userId: req.user.id }))
        .then(() => res.redirect('/'));
});

app.get('/user', (req, res) => {
    User
        .sync()
        .then(() => {
            User
                .findAll({User})
                .then((users) => {
                    res.render('user', {users, user: req.user});
                })
    })
});

app.get('/login', (req, res) => {

    res.render('login');
});

app.post('/login',
    // Authenticate user when the login form is submitted
    passport.authenticate('local', {
        // If authentication succeeded, redirect to the home page
        successRedirect: '/',
        // If authentication failed, redirect to the login page
        failureRedirect: '/login'
    })
);

app.post('/post/:postId/resolved', (req, res) => {
    console.log('dddddddddddddddddddddddddddd')
    Post
        .sync()
        .then(() => Post.update({ resolvedAt: new Date()}, {where: {id: req.params.postId}}))
        .then(()=> res.redirect('/post/'+ req.params.postId));
});

app.post('/post/:postId/drop', (req, res) => {
    console.log('dddddddddddddddddddddddddddd')
    Post
        .sync()
        .then(() => Post.destroy( {where: {id: req.params.postId}}))
        .then(()=> res.redirect('/'));
});



app.get('/inscription',(req,res) => {
    res.render('inscription');
});

app.post('/inscription', (req, res) => {
    const { name, bio, email, password} = req.body;
    User
        .sync()
        .then(() => {return User.count()})
        .then((count) =>
        { let role = 'utilisateur'
            if (count == 0){
            role = 'admin'
            }
            User.create({ name, bio, role, email, password})
        })
        .then(() => res.redirect('/'));
});

app.get('/profil/:userId', (req, res) => {
    const { name, bio, email, password} = req.body;
    User
        .sync()
        .then(() => User.findOne({where: {id: req.params.userId} , User }))
        .then((user) => res.render('profil', {user, user: req.user}));
});

app.get('/post/:postId', (req, res) => {
    const { title, content } = req.body;
    Post
        .sync()
        .then(() => Post.findOne({where: {id: req.params.postId} , include:[{model: Comment,include:[User]}, User ]}))
        .then((post) => res.render('post', {post, user: req.user}));
});

app.get('/post/:postId/edit', (req, res) => {
    const { title, content } = req.body;
    Post
        .sync()
        .then(() => Post.findOne({where: {id: req.params.postId}, include: [User] }))
        .then((post) => res.render('edit', {post, user: req.user}));
});
app.post('/post/:postId/edit', (req, res) => {
    const { title, content } = req.body;
    Post
        .sync()
        .then(() => Post.update({title, content },{where: {id: req.params.postId}}))
        .then((post) => res.redirect('/post/'+ req.params.postId));
});

app.post('/comment/:postId', (req, res) => {
    const { commentaire } = req.body;
    Comment
        .sync()
        .then(() => Comment.create({ commentaire, postId: req.params.postId, userId: req.user.id }))
        .then(() => res.redirect('/post/'+ req.params.postId));
});
app.get('/comment/:postId/editcomment', (req, res) => {
    console.log('dddddddddddddddd');
    const { title, content, commentaire } = req.body;
    Comment
        .sync()
        .then(() => Comment.findOne({where: {id: req.params.postId}, include: [User] }))
        .then((comment) => res.render('editc', {comment,user: req.user}));
});
app.post('/comment/:commentId/editcomment', (req, res) => {
    const { commentaire } = req.body;
    Comment
        .sync()
        .then(() => Comment.update({ commentaire }, {where: {id: req.params.commentId}}))
        .then(() => Comment.findOne({where: {id: req.params.commentId}}))
        .then((comment) =>
        { console.log(comment);
            res.redirect('/post/'+ comment.postId)});
});



Post.hasMany(Comment);
Comment.belongsTo(Post);

User.hasMany(Comment);
Comment.belongsTo(User);

User.hasMany(Post);
Post.belongsTo(User);

app.listen(3000);