const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const File = require('./models/File');
const User = require('./models/Users')
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Kết nối đến MongoDB
mongoose.connect(process.env.MONGOURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

app.use(
    session({
        secret: "my_secret_key",
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, // Set to true in production with HTTPS
    })
);

// Serve static files from 'uploads' directory
app.use('/uploads', express.static('uploads'));

// Cấu hình multer
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Store with timestamp + original extension
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 512000000  }, // giới hạn kích thước file
}).single('file');

// Middleware để phục vụ file tĩnh
app.use(express.static('public'));

// Route để upload file
app.post('/upload', (req, res) => {
    if(req.session.user){
        upload(req, res, (err) => {
            if (err) {
                return res.status(400).send(err.message);
            }
            const newFile = new File({
                filePath: req.file.path,
                originalName: req.file.originalname // Ensure original file name is saved
            });
            newFile.save()
                .then(() => res.send('File uploaded and path saved to database!'))
                .catch(err => res.status(500).send(err.message));
        });
    } else {
        res.json(`You don't have permission to use this api`).status(401);
    }
});

// Route để hiển thị danh sách các file đã upload
app.get('/files', async (req, res) => {
    try {
        const files = await File.find(); // Retrieve all files from the database
        res.send(`
            <html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Uploaded Files</title>
    <link rel="stylesheet" href="../css/a.css">
</head>
<body>
    <div class="container">
        <h1>Uploaded Files</h1>
        <ul class="file-list">
            ${files.map(file => `
                <li class="file-item">
                    <a href="/${file.filePath}" target="_blank">${file.originalName}</a>
                </li>
            `).join('')}
        </ul>
        <a href="/" class="link-back-upload">Go Back to Upload</a>
    </div>
</body>
</html>

        `);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving files.');
    }
});
app.get("/login", (req, res) => {
    res.sendFile(__dirname + "/public/html/login.html");
  });
  
  app.post("/register", async (req, res) => {
    const { username, password, registrationCode } = req.body;
  
    try {
      if (registrationCode === process.env.regCode) {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          return res.redirect("/login?error=Username already exists");
        }
  
        const user = new User({
          username,
          password,
          roles: "default", // Explicitly set roles to 'default'
        });
  
        await user.save();
        req.session.user = user;
      } else {
        return res.redirect(
          "/login?error=Registration Code invalid, ask your admin for new code"
        );
      }
  
      res.redirect("/");
    } catch (err) {
      console.error(err);
      res.redirect("/login?error=An error occurred");
    }
  });
  
  app.post("/login", async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const user = await User.findOne({ username });
      if (!user) {
        return res.redirect("/login?error=Invalid username or password");
      }
  
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.redirect("/login?error=Invalid username or password");
      }
  
      req.session.user = user;
      res.redirect('/')
    } catch (err) {
      console.error(err);
      res.redirect("/login?error=An error occurred");
    }
  });
  app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return;
      }
      res.clearCookie("connect.sid");
      res.redirect("/login");
    });
  });

// Route để hiển thị trang upload
app.get('/', (req, res) => {
    if(req.session.user){
        res.sendFile(path.join(__dirname, 'public/html/upload.html'));
    } else {
        res.redirect('/login')
    }
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
