const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.uq1lmi8.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});


async function run() {
  try {
   await client.connect();
   const itemsCollection = client.db("salsabil-cafe").collection("items");
   const ordersCollection = client.db("salsabil-cafe").collection("orders");

   app.get('/items', async(req, res) => {
      const allItems = await itemsCollection.find({}).toArray();
      res.send(allItems);
   });

   app.get('/orders', async(req, res) => {
      const allItems = await ordersCollection.find({}).toArray();
      res.send(allItems);
   });

   app.get("/items/:category",  async (req, res) => {
      const category = req.params.category;
      const query = {category: category};
      const service = await itemsCollection.find(query).toArray();
      res.send(service);
    })
    
   app.post("/order",  async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    })
    
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
