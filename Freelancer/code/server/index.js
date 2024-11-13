import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { Application, Chat, Freelancer, Project, User } from './Schema.js';
import { Server } from 'socket.io';
import http from 'http';
import SocketHandler from './SocketHandler.js';

const app = express();
const PORT = 6001;

// Middleware setup
app.use(express.json());
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// Socket.io setup
io.on("connection", (socket) => {
    console.log("User connected");
    SocketHandler(socket);
});

// Database connection
const mongoDBUri = 'mongodb+srv://sakthisai415:sai415@cluster0.wj4nz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(mongoDBUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Database connected");
}).catch((e) => console.log(`Error in db connection: ${e}`));

// Register endpoint
app.post('/register', async (req, res) => {
    try {
        const { username, email, password, usertype } = req.body;
        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = new User({ username, email, password: passwordHash, usertype });
        const user = await newUser.save();

        if (usertype === 'freelancer') {
            const newFreelancer = new Freelancer({ userId: user._id });
            await newFreelancer.save();
        }
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: "User does not exist" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fetch freelancer by ID
app.get('/fetch-freelancer/:id', async (req, res) => {
    try {
        const freelancer = await Freelancer.findOne({ userId: req.params.id });
        res.status(200).json(freelancer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update freelancer profile
app.post('/update-freelancer', async (req, res) => {
    const { freelancerId, updateSkills, description } = req.body;
    try {
        const freelancer = await Freelancer.findById(freelancerId);
        freelancer.skills = updateSkills.split(',');
        freelancer.description = description;

        await freelancer.save();
        res.status(200).json(freelancer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fetch project by ID
app.get('/fetch-project/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        res.status(200).json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fetch all projects
app.get('/fetch-projects', async (req, res) => {
    try {
        const projects = await Project.find();
        res.status(200).json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new project
app.post('/new-project', async (req, res) => {
    const { title, description, budget, skills, clientId, clientName, clientEmail } = req.body;
    try {
        const projectSkills = skills.split(',');
        const newProject = new Project({
            title, description, budget,
            skills: projectSkills, clientId, clientName, clientEmail,
            postedDate: new Date()
        });
        await newProject.save();
        res.status(200).json({ message: "Project added" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
