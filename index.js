require('dotenv').config();
const express = require('express')

const app = express()
const cors = require('cors');
app.use(cors())
app.use(express.json())
const port = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// Database connection
const uri = `mongodb+srv://rasel:rasel@cluster0.q37bxqk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    const postsCollection = client.db("atg").collection("posts");
    const usersCollection = client.db("atg").collection("users");
    try {

        // Register User
        app.post('/register', async (req, res) => {
            const { username, email, password } = req.body;
            const foundPrevious = await usersCollection.findOne(
                {
                    $or: [
                        { username: { $eq: username } },
                        { email: { $eq: email } }
                    ]
                }
            );
            if (foundPrevious) {
                return res.status(409).json({ message: 'Already registered' })
            } else {
                const createdAt = new Date().toDateString()

                const result = await usersCollection.insertOne({ username, email, password, createdAt });
                res.status(200).json({ message: 'Registration succeed', data: result })
            }


        });

        // Login User
        app.post('/login', async (req, res) => {
            const { username, password } = req.body;
            const findUser = await usersCollection.findOne({ username })
            if (!findUser) {
                return res.status(404).json({ message: 'User not found. Please register' })
            }
            if (findUser.password === password) {

                res.status(200).json({ message: 'Login successfull 👍', data: findUser, localid: findUser?._id, token: 'null' })
            } else {
                res.status(401).json({ message: 'Wrong Password' })

            }
        })

        app.post('/posts', async (req, res) => {
            const data = req.body;
            const result = await postsCollection.insertOne(data);
            res.send(result)
        })
        app.post('/users', async (req, res) => {
            const data = req.body;
            const result = await usersCollection.insertOne(data);
            res.send(result)
        })
        app.get('/posts', async (req, res) => {
            const query = {};
            const result = await postsCollection.find(query).sort({ postedTime: -1 }).toArray();
            res.send(result)
        })

        app.delete('/delete-post/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await postsCollection.deleteOne(query)
            res.send(result)
        });

        app.put('/edit-post/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const options = { upsert: true };

            const updatedDoc = {
                $set: {
                    postData: req.body.editedPost


                }
            }
            const result = await postsCollection.updateOne(query, updatedDoc, options);
            res.send(result)

        });



        // Comment posting

        app.put('/comment', async (req, res) => {
            const { postId, commentData } = req.body;

            try {
                const result = await postsCollection.updateOne(
                    { _id: new ObjectId(postId) }, // Convert postId to ObjectID
                    { $push: { comments: commentData } }
                );

                if (result.modifiedCount === 1) {
                    res.status(200).json({ message: 'Comment added successfully.' });
                } else {
                    res.status(404).json({ message: 'Post not found.' });
                }
            } catch (error) {
                console.error('Error updating document:', error);
                res.status(500).json({ message: 'Internal server error.' });
            }
        });


        // Update like
        app.put('/like', async (req, res) => {
            const { id, username } = req.body;

            try {
                const post = await postsCollection.findOne({
                    _id: new ObjectId(id),
                    'likes.username': username,
                });

                if (post) {
                    res.status(400).json({ message: 'You have already liked this post.' });
                    return;
                }

                const result = await postsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $push: { likes: username } }
                );

                if (result.modifiedCount === 1) {
                    res.status(200).json({ message: 'Like added successfully.' });
                } else {
                    res.status(404).json({ message: 'Post not found.' });
                }
            } catch (error) {
                console.error('Error updating document:', error);
                res.status(500).json({ message: 'Internal server error.' });
            }
        });

    }
    finally {

    }
}
run().catch(e => console.log(e.message))

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})