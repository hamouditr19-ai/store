const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs-extra");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const TELEGRAM_TOKEN = "8222212068:AAH935nM61iSGrGGcXo_H2I6mB13Ws2QE74";
const CHAT_ID = "7741275208";

const PRODUCTS_FILE = "./products.json";

// جلب المنتجات
app.get("/products", async (req, res) => {
  const products = await fs.readJson(PRODUCTS_FILE);
  res.json(products);
});

// إضافة منتج
app.post("/add-product", async (req, res) => {
  const { name, price, image } = req.body;
  const products = await fs.readJson(PRODUCTS_FILE);

  const newProduct = {
    id: Date.now(),
    name,
    price,
    image
  };

  products.push(newProduct);
  await fs.writeJson(PRODUCTS_FILE, products);

  res.json({ success: true });
});

// حذف منتج
app.post("/delete-product", async (req, res) => {
  const { id } = req.body;
  let products = await fs.readJson(PRODUCTS_FILE);

  products = products.filter(p => p.id != id);
  await fs.writeJson(PRODUCTS_FILE, products);

  res.json({ success: true });
});

// إرسال طلب شراء
app.post("/order", async (req, res) => {
  const { name, gameId, product } = req.body;

  const message = `
🛒 طلب جديد

👤 الاسم: ${name}
🎮 المنتج: ${product}
🆔 ID اللعبة: ${gameId}
  `;

  await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    chat_id: CHAT_ID,
    text: message
  });

  res.json({ success: true });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
