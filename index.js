const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
const stripe = require("stripe")(process.env.SK_SECRET_KEY);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.uq1lmi8.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unAuthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    await client.connect();
    const itemsCollection = client.db("salsabil-cafe").collection("items");
    const ordersCollection = client.db("salsabil-cafe").collection("orders");
    const userCollection = client.db("salsabil-cafe").collection("users");
    const paymentCollection = client.db("salsabil-cafe").collection("payment");
    const reviewCollection = client.db("salsabil-cafe").collection("review");

    app.get("/items", async (req, res) => {
      const allItems = await itemsCollection.find({}).toArray();
      res.send(allItems);
    }); 
    app.get("/review",  async (req, res) => {
      const allReview = await reviewCollection.find({}).toArray();
      res.send(allReview);
    });

    app.post("/items", async (req, res) => {
      const service = req.body;
      const result = await itemsCollection.insertOne(service);
      res.send({ success: true, result });
    });

    app.get("/orders", verifyJWT, async (req, res) => {
      const allItems = await ordersCollection.find({}).toArray();
      res.send(allItems);
    });

    app.get("/orders/:client", verifyJWT, async (req, res) => {
      const client = req.params.client;
      const query = { client: client };
      const specificOrder = await ordersCollection.find(query).toArray();
      res.send(specificOrder);
    });

    app.get("/items/:category", async (req, res) => {
      const category = req.params.category;
      const query = { category: category };
      const service = await itemsCollection.find(query).toArray();
      res.send(service);
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          plot: user,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });

    app.put("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.put("/delevered/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const updateDoc = {
        $set: { delevered: true },
      };
      const result = await ordersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.get("/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    app.post("/order", async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });

    app.get("/bookingId/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const bookingID = await ordersCollection.findOne(query);
      res.send(bookingID);
    });

    app.patch("/booking/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const payment = req.body;
      const updateDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updateBooking = await ordersCollection.updateOne(
        filter,
        updateDoc
      );
      const result = await paymentCollection.insertOne(payment);
      res.send(updateDoc);
    });

    app.post("/payment", verifyJWT, async (req, res) => {
      const service = req.body;
      const amount = service.amount * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    app.post("/review", async (req, res) => {
      const review = req.body;
      const query = { email: req.body.email };
      const cursor = await reviewCollection.findOne(query);
      if (cursor) {
        return res.send({ success: false });
      }
      const result = await reviewCollection.insertOne(review);
      res.send({ success: true, result });
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Running Salsabil cafe");
});

app.listen(port, () => {
  console.log("listening to port", port);
});
