const client = require("./metrics");

const express = require("express");

const app = express();

const PORT = 8080;

app.get("/", (req, res) => {
    res.json({
        service: "inventory-api",
        status: "running"
    });
});

app.get("/health", (req, res) => {
    res.send("OK");
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(PORT, () => {
    console.log(`Inventory API listening on ${PORT}`);
});
