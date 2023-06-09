const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}
// SummerCampSnap
// I0DQl6yxUo5WBute
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = "mongodb+srv://SummerCampSnap:I0DQl6yxUo5WBute@cluster0.1eww0o2.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const usersCollection = client.db("CampSnapDb").collection("users");
        const classesCollection = client.db("CampSnapDb").collection("classes");
        const selectedClassesCollection = client.db("CampSnapDb").collection("selectedClasses");
        const instructorsCollection = client.db("CampSnapDb").collection("instructors");
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

            res.send({ token })
        })
        // Warning: use verifyJWT before using verifyAdmin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }
        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }
        /**
           * 0. do not show secure links to those who should not see the links
           * 1. use jwt token: verifyJWT
           * 2. use verifyAdmin middleware
          */
        // users related apis

        app.get('/users', verifyJWT, verifyInstructor, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });



        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);

            if (existingUser) {
                return res.send({ message: 'user already exists' })
            }

            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // security layer: verifyJWT
        // email same
        // check admin
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);


        })
        app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ instructor: false })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result);


        })

        // app.patch('/users/admin/:id', async (req, res) => {
        //     const id = req.params.id;
        //     console.log(id);
        //     const filter = { _id: new ObjectId(id) };
        //     const updateDoc = {
        //         $set: {
        //             role: 'admin'
        //         },
        //     };

        //     const result = await usersCollection.updateOne(filter, updateDoc);
        //     res.send(result);

        // })




        // popular classes and instructors related api
        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().toArray();

            // Sort classes based on the number of students in descending order
            const sortedClasses = result.sort((a, b) => b.numberOfStudents - a.numberOfStudents);

            // Limit the classes to 6
            // const limitedClasses = sortedClasses.slice(0, 6);

            res.send(sortedClasses);
        });

      
        app.post('/classes', async (req, res) => {
            const { classId, name, image, price, instructor, description } = req.body;
            const result = await selectedClassesCollection.insertOne({ classId, name, image, price, instructor, description });
            res.send({ success: true, data: result });
        });

        app.get('/disabledButtons', async (req, res) => {
            const disabledButtons = await selectedClassesCollection.find().toArray();
            res.send(disabledButtons);
        });

        app.post('/disabledButtons', async (req, res) => {
            const { _id } = req.body;
            const result = await selectedClassesCollection.insertOne({ _id });
            res.send({ success: true, data: result });
        });


        app.get('/instructors', async (req, res) => {
            const result = await instructorsCollection.find().toArray();

            // Sort classes based on the number of students in descending order
            const sortedInstructors = result.sort((a, b) => b.numberOfStudents - a.numberOfStudents);

            // Limit the classes to 6
            // const limitedInstructors = sortedInstructors.slice(0, 6);

            res.send(sortedInstructors);
        });






        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('campNap is running')
})

app.listen(port, () => {
    console.log(`campNap is Running on port ${port}`);
})


/**
 * --------------------------------
 *      NAMING CONVENTION
 * --------------------------------
 * users : userCollection
 * app.get('/users')
 * app.get('/users/:id')
 * app.post('/users')
 * app.patch('/users/:id')
 * app.put('/users/:id')
 * app.delete('/users/:id')
*/