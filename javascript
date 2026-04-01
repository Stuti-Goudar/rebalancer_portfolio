// ✅ 1. LOAD ENV FIRST (VERY IMPORTANT)
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ✅ 2. GET API KEY FROM .env
const API_KEY = process.env.API_KEY;

// ✅ 3. CONNECT TO MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/portfolioDB");

// Schema
const Portfolio = mongoose.model("Portfolio", {
  assets: Array,
});

// ✅ 4. FRONTEND (HTML + CSS + JS)
app.get("/", (req, res) => {
  res.send(`
  <html>
  <head>
    <title>Portfolio Rebalancer</title>
    <style>
      body { font-family: Arial; text-align:center; background:#111; color:white; }
      input, button { margin:5px; padding:10px; }
      button { background:orange; border:none; cursor:pointer; }
    </style>
  </head>

  <body>
    <h1>Portfolio Rebalancer</h1>

    <input id="symbol" placeholder="Stock Symbol (AAPL)">
    <input id="amount" placeholder="Amount">
    <input id="target" placeholder="Target %">

    <button onclick="add()">Add</button>

    <ul id="list"></ul>

    <button onclick="rebalance()">Rebalance</button>

    <h2 id="result"></h2>

    <script>
      let assets = [];

      function add() {
        let symbol = document.getElementById("symbol").value;
        let amount = parseFloat(document.getElementById("amount").value);
        let target = parseFloat(document.getElementById("target").value);

        assets.push({ symbol, amount, target });
        document.getElementById("list").innerHTML += "<li>"+symbol+" ₹"+amount+"</li>";
      }

      async function rebalance() {
        let res = await fetch("/rebalance", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ assets })
        });

        let data = await res.json();
        document.getElementById("result").innerText = JSON.stringify(data, null, 2);
      }
    </script>
  </body>
  </html>
  `);
});

// ✅ 5. MAIN LOGIC (API USED HERE)
app.post("/rebalance", async (req, res) => {
  const assets = req.body.assets;

  let total = assets.reduce((sum, a) => sum + a.amount, 0);

  let result = [];

  for (let a of assets) {
    try {
      // 🔥 THIS IS WHERE API KEY IS USED
      let response = await axios.get(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${a.symbol}&apikey=${API_KEY}`
      );

      let price = response.data["Global Quote"]["05. price"];

      let currentPercent = (a.amount / total) * 100;
      let diff = a.target - currentPercent;

      result.push({
        symbol: a.symbol,
        price: price,
        action: diff > 0 ? "BUY" : "SELL"
      });

    } catch (err) {
      result.push({ symbol: a.symbol, error: "API Error" });
    }
  }

  // Save to MongoDB
  await new Portfolio({ assets }).save();

  res.json(result);
});

// ✅ 6. START SERVER
app.listen(5000, () => {
  console.log("Server running at http://localhost:5000");
});