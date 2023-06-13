const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
        const disabledButtonsCollection = client.db("CampSnapDb").collection("disabled-buttons");
        const manageClassesCollection = client.db("CampSnapDb").collection("manageClasses");
        const paymentCollection = client.db("CampSnapDb").collection("payments");
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

        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
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



        app.patch('/users/:id/admin', async (req, res) => {
            const id = req.params.id;

            try {
                const result = await usersCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { role: 'admin' } }
                );

                if (result.modifiedCount > 0) {
                    res.send({ success: true });
                } else {
                    res.send({ success: false });
                }
            } catch (error) {
                console.error('Error making user admin:', error);
                res.send({ success: false });
            }
        });

        app.patch('/users/:id/instructor', async (req, res) => {
            const id = req.params.id;

            try {
                const result = await usersCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { role: 'instructor' } }
                );

                if (result.modifiedCount > 0) {
                    res.send({ success: true });
                } else {
                    res.send({ success: false });
                }
            } catch (error) {
                console.error('Error making user instructor:', error);
                res.send({ success: false });
            }
        });


        // manage classes api


        app.post('/api/classes/approve/:id', async (req, res) => {
            try {
                const classId = req.params.id;

                const result = await classesCollection.updateOne(
                    { _id: new ObjectId(classId) },
                    { $set: { status: 'approved' } }
                );

                if (result.modifiedCount > 0) {
                    res.json({ success: true });
                } else {
                    res.json({ success: false });
                }
            } catch (error) {
                console.error('Failed to approve class:', error);
                res.status(500).json({ success: false, error: 'Internal server error' });
            }
        });

        // POST /api/classes/deny/:id
        app.post('/api/classes/deny/:id', async (req, res) => {
            try {
                const classId = req.params.id;

                const result = await classesCollection.updateOne(
                    { _id: new ObjectId(classId) },
                    { $set: { status: 'denied' } }
                );
                if (result.modifiedCount > 0) {
                    res.json({ success: true });
                } else {
                    res.json({ success: false });
                }
            } catch (error) {
                console.error('Failed to deny class:', error);
                res.status(500).json({ success: false, error: 'Internal server error' });
            }
        });




        // popular classes and instructors related api

        app.post('/class', verifyJWT, verifyInstructor, async (req, res) => {
            const newItem = req.body;
            const result = await classesCollection.insertOne(newItem)
            res.send(result);
        })


        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().toArray();

            // Sort classes based on the number of students in descending order
            const sortedClasses = result.sort((a, b) => b.numberOfStudents - a.numberOfStudents);

            // Limit the classes to 6
            // const limitedClasses = sortedClasses.slice(0, 6);

            res.send(sortedClasses);
        });

        app.put('/classes/:classId', async (req, res) => {
            const classId = req.params.classId;

            try {
                const updatedClass = await classesCollection.findOneAndUpdate(
                    { _id: new ObjectId(classId) },
                    { $inc: { availableSeats: -1 } },
                    { new: true }
                );

                if (updatedClass) {
                    res.json(updatedClass);
                } else {
                    res.status(404).json({ error: 'Class not found' });
                }
            } catch (error) {
                res.status(500).json({ error: 'Internal server error' });
            }
        });


        //selected Classes
        app.post('/selectClasses', async (req, res) => {
            const { classId, className, imgURL, price, instructorName, availableSeats, instructorEmail, status, email } = req.body;

            try {

                const existingSelection = await selectedClassesCollection.findOne({ classId, email });

                if (existingSelection) {
                    return res.send({ success: false, message: 'Class already selected .' });
                }

                const result = await selectedClassesCollection.insertOne({
                    classId, className, imgURL, price, instructorName, availableSeats, instructorEmail, status, email
                });

                return res.send({ success: true, data: result });
            } catch (error) {
                console.error('Error occurred while selecting a class:', error);
                return res.status(500).send({ success: false, message: 'Failed to select a class.' });
            }
        });

        app.get('/selectedClasses', verifyJWT, async (req, res) => {
            const { email } = req.query;

            try {

                const selectedClasses = await selectedClassesCollection.find({ email }).toArray();

                return res.send({ success: true, data: selectedClasses });
            } catch (error) {
                console.error('Error occurred while fetching selected classes:', error);
                return res.status(500).send({ success: false, message: 'Failed to fetch selected classes.' });
            }
        });
        app.delete('/selectedClasses/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await selectedClassesCollection.deleteOne(query);
            res.send(result);
        })
        app.get('/selectedClasses/:id', async (req, res) => {

            try {
                const id = req.params.id;
                console.log(id)
                const query = { _id: new ObjectId(id) };
                const selectClass = await selectedClassesCollection.findOne(query);
                res.send(selectClass);
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });





        // GET /userClasses
        app.get('/userClasses', async (req, res) => {
            const { email } = req.query;
            if (!email) {
                res.send([]);
            } else {
                const userClasses = await selectedClassesCollection.find({ email }).toArray();
                res.send(userClasses);
            }
        });






        app.get('/instructors', async (req, res) => {
            const result = await instructorsCollection.find().toArray();

            // Sort classes based on the number of students in descending order
            const sortedInstructors = result.sort((a, b) => b.numberOfStudents - a.numberOfStudents);

            // Limit the classes to 6
            // const limitedInstructors = sortedInstructors.slice(0, 6);

            res.send(sortedInstructors);
        });
        app.post('/instructors', async (req, res) => {
            try {
                const existingInstructor = await instructorsCollection.findOne({ instructorEmail: req.body.instructorEmail });
                if (existingInstructor) {
                    return res.status(400).json({ error: 'Instructor with the provided email already exists' });
                }

                const result = await instructorsCollection.insertOne(req.body);
                if (result.insertedId) {
                    res.json({ insertedId: result.insertedId });
                } else {
                    throw new Error('Error inserting instructor');
                }
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
        // create payment intent
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })


        // payment related api
        app.post('/payments/:id', verifyJWT, async (req, res) => {
            try {
                const id = req.params.id;
                const payment = req.body;
                const insertResult = await paymentCollection.insertOne(payment);
                const query = { _id: new ObjectId(id) };
                const deleteResult = await selectedClassesCollection.deleteOne(query);
                res.send({ insertResult, deleteResult });
            } catch (error) {
                console.log('Error saving payment information:', error);
                res.status(500).send('Error saving payment information');
            }
        })
        // payment history
        app.get('/api/payment/history', async (req, res) => {
            const userEmail = req.query.email;

            try {

                const result = await paymentCollection
                    .find({ email: userEmail })
                    .sort({ date: -1 }) // Sorting in descending order
                    .toArray();
                res.json(result);
            } catch (error) {
                console.error('Error retrieving payment history:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
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