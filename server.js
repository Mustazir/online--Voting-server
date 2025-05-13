const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const bcrypt = require('bcrypt');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = 5000;
const uri = process.env.MONGO_URI;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
let db;
MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    db = client.db('votingSystem');
    console.log("Connected to MongoDB");
  })
  .catch(error => console.error(error));

// Routes

// User registration
app.post('/api/register', async (req, res) => {
  const { nid, username, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  db.collection('users').insertOne({ nid, username, password: hashedPassword })
    .then(() => res.status(200).send('User registered'))
    .catch(err => res.status(500).send('Error registering user'));
});

// User login
app.post('/api/users/login', async (req, res) => {
  const { nid, password } = req.body;

  const user = await db.collection('users').findOne({ nid });

  if (!user) {
    return res.status(400).send('User not found');
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    return res.status(400).send('Invalid password');
  }

  // Here you can set session-based authentication logic (e.g., using cookies or in-memory sessions)
  res.status(200).send('Login successful');
});

// Add candidate (Admin only)
app.post('/api/candidates', async (req, res) => {
  const { name } = req.body;

  // Admin check (you can modify this logic based on your own criteria, e.g., by checking a user role)
  const admin = await db.collection('users').findOne({ username: 'admin' });
  if (!admin) {
    return res.status(403).send('Not authorized');
  }

  db.collection('candidates').insertOne({ name, votes: 0 })
    .then(() => res.status(200).send('Candidate added'))
    .catch(err => res.status(500).send('Error adding candidate'));
});
const { ObjectId } = require('mongodb');






// Vote for a candidate
app.post('/api/vote', async (req, res) => {
  const { nid, candidateId } = req.body;

  try {
    const user = await db.collection('users').findOne({ nid });

    if (!user) {
      return res.status(400).send('User not found');
    }

    const candidate = await db.collection('candidates').findOne({ _id: new ObjectId(candidateId) });

    if (!candidate) {
      return res.status(400).send('Candidate not found');
    }

    await db.collection('candidates').updateOne(
      { _id: new ObjectId(candidateId) },
      { $inc: { votes: 1 } }
    );

    res.status(200).send('Vote submitted');
  } catch (error) {
    console.error(error); // Helps you see what’s going wrong
    res.status(500).send('Error submitting vote');
  }
});

// Get all candidates
app.get('/api/candidates', async (req, res) => {
  const candidates = await db.collection('candidates').find().toArray();
  res.status(200).json(candidates);
});

// Get results
app.get('/api/results', async (req, res) => {
  const results = await db.collection('candidates').find().toArray();
  res.status(200).json(results);
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
